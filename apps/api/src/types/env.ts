/**
 * Application configuration for the Tuktak API.
 *
 * The API is a standalone Node.js server (Hono + @hono/node-server). Unlike the
 * former Cloudflare Worker, there are no D1/R2 runtime bindings — every value is
 * read from `process.env` at startup and surfaced through Hono's `c.env`.
 */
export type Env = {
  // Database — self-hosted PostgreSQL
  DATABASE_URL: string;

  // File storage — local filesystem (Hetzner). Swap for an S3 implementation by
  // providing a different `Storage` backend (see lib/storage.ts). `PUBLIC_MEDIA_URL`
  // is the base URL the frontend uses to read uploaded files (defaults to /api/images).
  UPLOAD_DIR: string;
  PUBLIC_MEDIA_URL: string;

  // Secrets
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  RESEND_API_KEY: string;

  // Google OAuth (optional — social sign-in is enabled only when both are set)
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  // Shared cookie domain for cross-subdomain auth (e.g. ".tuktakdot.com").
  COOKIE_DOMAIN?: string;

  // Seed protection
  SEED_SECRET: string;

  // App config
  NODE_ENV: string;
  LOG_LEVEL: string;
  // Public app URL (frontend) — used for CORS / auth trusted origins
  APP_URL: string;
  // On-demand revalidation secret (shared with the Next frontend)
  REVALIDATE_SECRET?: string;
  // Comma-separated list of allowed CORS / trusted origins
  CORS_ORIGINS: string;
};

/**
 * Build the Env configuration from the current process environment.
 * Throws at startup if a required variable is missing.
 */
export function loadEnv(overrides: Partial<Env> = {}): Env {
  const env = {
    DATABASE_URL: process.env.DATABASE_URL || '',
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
    PUBLIC_MEDIA_URL: process.env.PUBLIC_MEDIA_URL || '/api/images',
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || '',
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:8787',
    RESEND_API_KEY: process.env.RESEND_API_KEY || '',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
    SEED_SECRET: process.env.SEED_SECRET || '',
    NODE_ENV: process.env.NODE_ENV || 'development',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    APP_URL: process.env.APP_URL || 'http://localhost:3000',
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
    CORS_ORIGINS: process.env.CORS_ORIGINS || '',
    ...overrides,
  } satisfies Env;

  if (!env.DATABASE_URL) {
    throw new Error('[env] DATABASE_URL is required');
  }

  return env;
}