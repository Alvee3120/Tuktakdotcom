import { and, eq, gte, inArray, or, sql } from 'drizzle-orm';

import type { Database } from '@/db';
import { addresses, blocklist, courierCheckCache, orders, settings } from '@/db/schema';
import { normalizePhone } from '@/lib/phone';

/**
 * Fake-order protection.
 *
 * Two independently toggleable modes (admin → Fraud Protection):
 * - Internal risk scoring (fraudInternalEnabled): velocity, new-account,
 *   repeat-cancelled and high-value-COD heuristics → 0-100 score + flags
 *   stored on the order for admin review. Never blocks by itself.
 * - Courier aggregator check (fraudCourierEnabled + courierApiKey): on-demand
 *   phone delivery-history lookup with a 24h DB cache.
 *
 * The blocklist is always enforced (explicit admin action).
 */

/** Check phone/IP against the blocklist. Returns the matching entry or null. */
export async function checkBlocklist(
  db: Database,
  input: { phone?: string | null; ip?: string | null }
): Promise<{ type: string; value: string } | null> {
  const conditions = [];
  if (input.phone) {
    const normalized = normalizePhone(input.phone);
    if (normalized) {
      conditions.push(and(eq(blocklist.type, 'phone'), eq(blocklist.value, normalized)));
    }
  }
  if (input.ip) {
    conditions.push(and(eq(blocklist.type, 'ip'), eq(blocklist.value, input.ip)));
  }
  if (conditions.length === 0) return null;
  const [hit] = await db
    .select({ type: blocklist.type, value: blocklist.value })
    .from(blocklist)
    .where(or(...conditions))
    .limit(1);
  return hit ?? null;
}

export type RiskResult = { score: number; flags: string[] };

/**
 * Internal risk heuristics (max 2 extra queries).
 * Flags: new_account(+25), velocity(+30), repeat_cancelled(+30), high_value_cod(+15)
 * Guest checkouts (userId = null) skip the account-phasing heuristics.
 */
export async function computeRiskScore(
  db: Database,
  input: {
    userId: string | null;
    phone: string | null;
    total: number;
    paymentMethod: string;
    userCreatedAt: string;
  }
): Promise<RiskResult> {
  const flags: string[] = [];
  let score = 0;
  const isCod = input.paymentMethod === 'cod';

  // new_account: younger than 7 days AND paying by COD
  if (input.userId) {
    const accountAgeMs = Date.now() - new Date(input.userCreatedAt).getTime();
    if (isCod && accountAgeMs < 7 * 24 * 60 * 60 * 1000) {
      flags.push('new_account');
      score += 25;
    }
  }

  // high_value_cod: COD order of 20,000 BDT or more
  if (isCod && input.total >= 20000) {
    flags.push('high_value_cod');
    score += 15;
  }

  // velocity: 3+ open orders by this user in the last 24h
  if (input.userId) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [velocityRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.userId, input.userId),
          gte(orders.createdAt, since),
          inArray(orders.status, ['pending', 'confirmed'])
        )
      );
    if ((velocityRow?.count ?? 0) >= 3) {
      flags.push('velocity');
      score += 30;
    }
  }

  // repeat_cancelled: 2+ previous cancelled/refunded orders shipped to the same
  // phone (guest orders match on order.guest_phone, registered on address.phone).
  if (input.phone) {
    const normalized = normalizePhone(input.phone);
    if (!normalized) return { flags, score };
    const [cancelledRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .leftJoin(addresses, eq(orders.shippingAddressId, addresses.id))
      .where(
        and(
          inArray(orders.status, ['cancelled', 'refunded']),
          or(
            sql`REPLACE(REPLACE(${orders.guestPhone}, '-', ''), ' ', '') LIKE ${'%' + normalized.slice(-10)}`,
            sql`REPLACE(REPLACE(${addresses.phone}, '-', ''), ' ', '') LIKE ${'%' + normalized.slice(-10)}`
          )
        )
      );
    if ((cancelledRow?.count ?? 0) >= 2) {
      flags.push('repeat_cancelled');
      score += 30;
    }
  }

  return { score: Math.min(score, 100), flags };
}

export type CourierReport = {
  phone: string;
  total: number;
  success: number;
  cancelled: number;
  successRatio: number;
  byCourier: { name: string; total: number; success: number; cancelled: number }[];
  checkedAt: string;
  cached: boolean;
  raw?: unknown;
  error?: string;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Defensive normalization of aggregator responses (bdcourier-style) */
function normalizeCourierResponse(
  phone: string,
  raw: unknown
): Omit<CourierReport, 'checkedAt' | 'cached'> {
  const byCourier: CourierReport['byCourier'] = [];
  let total = 0;
  let success = 0;
  let cancelled = 0;

  // bdcourier-style: { courierData: { steadfast: {total_parcel, success_parcel, cancelled_parcel}, ... } }
  const data = (raw ?? {}) as Record<string, unknown>;
  const courierData = (data.courierData ?? data.data ?? data) as Record<string, unknown>;
  for (const [name, value] of Object.entries(courierData)) {
    if (!value || typeof value !== 'object' || name === 'summary') continue;
    const v = value as Record<string, unknown>;
    const t = Number(v.total_parcel ?? v.total ?? 0);
    const s = Number(v.success_parcel ?? v.success ?? 0);
    const c = Number(v.cancelled_parcel ?? v.cancel ?? v.cancelled ?? 0);
    if (t === 0 && s === 0 && c === 0) continue;
    byCourier.push({ name, total: t, success: s, cancelled: c });
    total += t;
    success += s;
    cancelled += c;
  }

  return {
    phone,
    total,
    success,
    cancelled,
    successRatio: total > 0 ? Math.round((success / total) * 100) : 0,
    byCourier,
    raw: byCourier.length === 0 ? raw : undefined, // show raw JSON when we couldn't parse
  };
}

/**
 * Fetch a courier delivery-history report for a phone.
 * Cache-first (24h) so the external API is hit at most once per phone per day.
 */
export async function fetchCourierReport(db: Database, rawPhone: string): Promise<CourierReport> {
  const phone = normalizePhone(rawPhone);
  const now = new Date().toISOString();
  if (!phone) {
    return {
      phone: rawPhone,
      total: 0,
      success: 0,
      cancelled: 0,
      successRatio: 0,
      byCourier: [],
      checkedAt: now,
      cached: false,
      error: 'Invalid phone number',
    };
  }

  // 1. Cache lookup
  const [cachedRow] = await db
    .select()
    .from(courierCheckCache)
    .where(eq(courierCheckCache.phone, phone))
    .limit(1);
  if (cachedRow && Date.now() - new Date(cachedRow.checkedAt).getTime() < CACHE_TTL_MS) {
    try {
      return {
        ...(JSON.parse(cachedRow.data) as Omit<CourierReport, 'checkedAt' | 'cached'>),
        checkedAt: cachedRow.checkedAt,
        cached: true,
      };
    } catch {
      // fall through to refetch on corrupt cache
    }
  }

  // 2. Read config
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, ['fraudCourierEnabled', 'courierApiKey', 'courierApiUrl']));
  const config: Record<string, string> = {};
  for (const row of rows) config[row.key] = row.value;

  if (config.fraudCourierEnabled !== 'true') {
    return {
      phone,
      total: 0,
      success: 0,
      cancelled: 0,
      successRatio: 0,
      byCourier: [],
      checkedAt: now,
      cached: false,
      error: 'Courier check is disabled in settings',
    };
  }
  if (!config.courierApiKey) {
    return {
      phone,
      total: 0,
      success: 0,
      cancelled: 0,
      successRatio: 0,
      byCourier: [],
      checkedAt: now,
      cached: false,
      error: 'Courier API key is not configured',
    };
  }

  // 3. External call
  try {
    const url = config.courierApiUrl || 'https://bdcourier.com/api/courier-check';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.courierApiKey}`,
      },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        phone,
        total: 0,
        success: 0,
        cancelled: 0,
        successRatio: 0,
        byCourier: [],
        checkedAt: now,
        cached: false,
        error: `Courier API error (${res.status}): ${text.slice(0, 200)}`,
      };
    }
    const raw = await res.json();
    const normalized = normalizeCourierResponse(phone, raw);

    // 4. Cache upsert
    await db
      .insert(courierCheckCache)
      .values({ phone, data: JSON.stringify(normalized), checkedAt: now })
      .onConflictDoUpdate({
        target: courierCheckCache.phone,
        set: { data: JSON.stringify(normalized), checkedAt: now },
      });

    return { ...normalized, checkedAt: now, cached: false };
  } catch (err) {
    return {
      phone,
      total: 0,
      success: 0,
      cancelled: 0,
      successRatio: 0,
      byCourier: [],
      checkedAt: now,
      cached: false,
      error: err instanceof Error ? err.message : 'Courier API request failed',
    };
  }
}
