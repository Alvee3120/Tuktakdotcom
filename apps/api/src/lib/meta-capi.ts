import { inArray } from 'drizzle-orm';

import type { Database } from '@/db';
import { settings } from '@/db/schema';
import { normalizePhone } from '@/lib/phone';

/**
 * Meta Conversions API (server-side tracking).
 *
 * Sends a Purchase event from the Worker after an order is created.
 * - event_id = orderId → matches the browser Pixel's eventID so Meta
 *   deduplicates the pair automatically.
 * - user_data is SHA-256 hashed per Meta spec (EMQ optimization).
 * - Never throws: tracking must never break checkout. Callers should run
 *   this inside executionCtx.waitUntil() so it adds zero response latency.
 */

const GRAPH_API_VERSION = 'v21.0';

export type PurchaseEventPayload = {
  orderId: string;
  orderNumber: string;
  /** Order total in whole BDT */
  value: number;
  contentIds: string[];
  numItems: number;
  /** Customer identifiers (raw — hashed here) */
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  postalCode?: string | null;
  userId?: string | null;
  /** Request context (sent unhashed per spec) */
  clientIp?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  eventSourceUrl?: string | null;
};

/** SHA-256 hex hash of a normalized (trimmed, lowercased) value */
async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Hash a field if present, otherwise omit */
async function hashed(value: string | null | undefined): Promise<string | undefined> {
  if (!value || !value.trim()) return undefined;
  return sha256(value);
}

/**
 * Send a Purchase event to the Meta Conversions API.
 * Silently no-ops when metaPixelId/metaCapiToken are not configured.
 */
export async function sendPurchaseEvent(
  db: Database,
  payload: PurchaseEventPayload
): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(
        inArray(settings.key, [
          'metaPixelId',
          'metaCapiToken',
          'metaTestEventCode',
          'trackingEnabled',
        ])
      );
    const config: Record<string, string> = {};
    for (const row of rows) config[row.key] = row.value;

    if (config.trackingEnabled === 'false') return;
    const pixelId = config.metaPixelId;
    const token = config.metaCapiToken;
    if (!pixelId || !token) return; // not configured — skip silently

    const phone = payload.phone ? normalizePhone(payload.phone) : null;

    const userData: Record<string, unknown> = {
      em: await hashed(payload.email),
      ph: phone ? await sha256(phone) : undefined,
      fn: await hashed(payload.firstName),
      ln: await hashed(payload.lastName),
      ct: await hashed(payload.city?.replace(/\s+/g, '')),
      zp: await hashed(payload.postalCode),
      external_id: await hashed(payload.userId),
      country: await sha256('bd'),
      // Sent unhashed per Meta spec
      client_ip_address: payload.clientIp ?? undefined,
      client_user_agent: payload.userAgent ?? undefined,
      fbp: payload.fbp ?? undefined,
      fbc: payload.fbc ?? undefined,
    };
    // Strip undefined so the payload stays minimal
    for (const key of Object.keys(userData)) {
      if (userData[key] === undefined) delete userData[key];
    }

    const body: Record<string, unknown> = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: payload.orderId, // dedup key — must equal the browser Pixel eventID
          action_source: 'website',
          event_source_url: payload.eventSourceUrl ?? undefined,
          user_data: userData,
          custom_data: {
            currency: 'BDT',
            value: payload.value,
            content_ids: payload.contentIds,
            content_type: 'product',
            num_items: payload.numItems,
            order_id: payload.orderNumber,
          },
        },
      ],
    };
    if (config.metaTestEventCode) body.test_event_code = config.metaTestEventCode;

    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error(`[meta-capi] Purchase event failed (${res.status}): ${err.slice(0, 300)}`);
    }
  } catch (err) {
    // Tracking must never break checkout
    console.error('[meta-capi] Purchase event error:', err instanceof Error ? err.message : err);
  }
}
