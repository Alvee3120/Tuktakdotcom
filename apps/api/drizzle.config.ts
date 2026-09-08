import type { Config } from 'drizzle-kit';

// Self-hosted PostgreSQL (Hetzner). Migrations are applied with `drizzle-kit
// push`/`generate` using the DATABASE_URL env var.
export default {
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
} satisfies Config;