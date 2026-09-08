import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

/**
 * PostgreSQL connection for Tuktak. Self-hosted instance (Hetzner).
 *
 * `createDb()` reads the connection string from DATABASE_URL and returns a
 * shared Drizzle client. Because the API is now a plain Node.js server (not a
 * Cloudflare Worker), there are no longer per-request bindings — the pool is a
 * single shared instance. Call `createDb()` in handlers exactly as before; it
 * is cheap and returns the same underlying client.
 */

// Resolve the database URL from the environment.
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Configure a self-hosted PostgreSQL connection string.'
    );
  }
  return url;
}

let _sql: postgres.Sql<Record<string, unknown>> | undefined;
let _client: ReturnType<typeof drizzle<typeof schema>> | undefined;

/**
 * Create (or reuse) the Drizzle database client for PostgreSQL.
 * @param _input ignored — retained for drop-in compatibility with the former
 *   Worker `createDb()` call sites.
 */
export function createDb(_input?: unknown) {
  if (!_client) {
    // postgres.js manages its own connection pool internally.
    _sql = postgres(getDatabaseUrl(), {
      max: 10,
      idle_timeout: 30,
      connect_timeout: 10,
      // Keep behavior consistent with timestamptz string mode.
      transform: {
        undefined: null,
      },
    });
    _client = drizzle(_sql, { schema });
  }
  return _client;
}

/**
 * For advanced use-cases (transactions, dedicated pool for migrations).
 * Not required by normal request handling.
 */
export function getSql(): postgres.Sql<Record<string, unknown>> {
  if (!_sql) createDb();
  return _sql!;
}

export type Database = ReturnType<typeof createDb>;

// Re-export schema for convenient imports
export * from './schema';