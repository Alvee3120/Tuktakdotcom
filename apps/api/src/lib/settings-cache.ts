/**
 * Simple in-memory settings cache with TTL.
 * Settings are read from D1 via Drizzle on first access and cached for 5 minutes.
 * Cache is invalidated when settings are updated via admin API.
 *
 * In Cloudflare Workers, each isolate has its own in-memory cache.
 * This is fine for single-worker deployments. For multi-worker,
 * consider using Workers KV for cross-isolate caching.
 */

import { eq, inArray } from 'drizzle-orm';
import { settings } from '@/db/schema';

import type { Database } from '@/db';

type CacheEntry = {
  value: string;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get a setting value, using cache if available.
 * Falls back to D1 query if not cached.
 */
export async function getCachedSetting(db: Database, key: string): Promise<string | null> {
  const now = Date.now();
  const entry = cache.get(key);

  if (entry && entry.expiresAt > now) {
    return entry.value;
  }

  // Cache miss or expired — fetch via Drizzle
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);

  const value = row?.value ?? null;

  if (value !== null) {
    cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
  }

  return value;
}

/**
 * Get multiple settings in one batch (reduces DB round-trips).
 */
export async function getCachedSettings(
  db: Database,
  keys: string[]
): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  const uncachedKeys: string[] = [];
  const now = Date.now();

  // Check cache first
  for (const key of keys) {
    const entry = cache.get(key);
    if (entry && entry.expiresAt > now) {
      result[key] = entry.value;
    } else {
      uncachedKeys.push(key);
    }
  }

  // Fetch uncached keys in one query
  if (uncachedKeys.length > 0) {
    const rows = await db
      .select({ key: settings.key, value: settings.value })
      .from(settings)
      .where(inArray(settings.key, uncachedKeys));

    for (const row of rows) {
      result[row.key] = row.value;
      cache.set(row.key, { value: row.value, expiresAt: now + CACHE_TTL_MS });
    }

    // Mark missing keys as null
    for (const key of uncachedKeys) {
      if (!(key in result)) {
        result[key] = null;
      }
    }
  }

  return result;
}

/**
 * Invalidate a specific setting from cache.
 * Called after admin updates a setting.
 */
export function invalidateSetting(key: string): void {
  cache.delete(key);
}
