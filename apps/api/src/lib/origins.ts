import type { Env } from '@/types/env';

/** Default local development origins (Next.js dev ports). */
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
];

/**
 * Resolve the list of allowed origins from environment configuration.
 *
 * Priority:
 *  1. `CORS_ORIGINS` — comma-separated explicit allow-list (if provided)
 *  2. `APP_URL` — the public frontend URL
 *  3. Local development fallbacks
 *
 * This keeps all URL routing env-driven instead of hardcoded.
 */
export function getAllowedOrigins(env: Env): string[] {
  const origins = new Set<string>();

  if (env.CORS_ORIGINS) {
    for (const origin of env.CORS_ORIGINS.split(',')) {
      const trimmed = origin.trim();
      if (trimmed) origins.add(trimmed);
    }
  }

  if (env.APP_URL) {
    origins.add(env.APP_URL.trim());
  }

  // Always allow local dev origins during development.
  if (env.NODE_ENV !== 'production') {
    for (const origin of DEFAULT_DEV_ORIGINS) origins.add(origin);
  }

  // Final safety net: never return an empty list.
  if (origins.size === 0) {
    for (const origin of DEFAULT_DEV_ORIGINS) origins.add(origin);
  }

  return [...origins];
}
