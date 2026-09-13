# Tuktak.com

Premium electronics & gadgets e-commerce platform. pnpm + Turborepo monorepo.

| Workspace | Description | Runtime |
| --- | --- | --- |
| `apps/api` | REST API (Hono + `@hono/node-server`), auth (better-auth), Drizzle ORM | Node.js + PostgreSQL |
| `apps/web` | Storefront + admin panel (Next.js App Router, next-intl) | Node.js (Vercel or self-hosted) |
| `packages/email` | Email templates | — |
| `packages/validators` | Shared Zod schemas | — |

## Requirements

- Node.js >= 20
- pnpm >= 9 (`corepack enable`)
- PostgreSQL 14+ (self-hosted; there is no Cloudflare D1/R2 dependency anymore)

## Local development

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# edit both files (at minimum DATABASE_URL + BETTER_AUTH_SECRET)

pnpm db:migrate          # apply migrations
pnpm dev                 # API on :8787, web on :3000
```

Useful scripts: `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`,
`pnpm db:migrate`, `pnpm db:seed`, `pnpm db:studio`.

## Environment variables

Templates live in `apps/api/.env.example` and `apps/web/.env.example`.
Every value the code reads:

**API** — `DATABASE_URL` (required), `BETTER_AUTH_SECRET` (required in prod),
`BETTER_AUTH_URL`, `APP_URL`, `CORS_ORIGINS`, `NODE_ENV=production`, `PORT`,
`UPLOAD_DIR`, `RESEND_API_KEY`, `REVALIDATE_SECRET`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `COOKIE_DOMAIN`, `SEED_SECRET`.

**Web** — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL` (both inlined at build
time), `NEXT_REVALIDATE_SECRET`, and the optional `NEXT_PUBLIC_R2_PUBLIC_URL`,
`NEXT_PUBLIC_DEFAULT_LOCALE`.

> `apps/api`'s `REVALIDATE_SECRET` and `apps/web`'s `NEXT_REVALIDATE_SECRET`
> **must be the same value**, otherwise admin-driven cache invalidation 401s.

## Database

Migrations live in `apps/api/drizzle/migrations`. Run them against the target
database before starting the API:

```bash
DATABASE_URL=postgres://… pnpm --filter api db:migrate
```

`drizzle-kit` is a dev dependency, so run migrations from a build/CI step (or a
dev machine), not from a production-only install.

## Hosting

### API (Node + PostgreSQL)

```bash
pnpm install --frozen-lockfile
pnpm --filter api build            # TypeScript check (no emit)
pnpm --filter api db:migrate       # apply migrations
NODE_ENV=production pnpm --filter api start
```

- The API runs the TypeScript entrypoint directly via `tsx` (it uses `@/*` path
  aliases, so a plain `tsc` emit would not run). `tsx` is a runtime dependency.
- Listen port: `PORT` (default `8787`). Put it behind TLS (reverse proxy /
  load balancer).
- **Uploads need persistent storage.** Files are written to `UPLOAD_DIR`
  (default `./uploads`, relative to the API working directory) and served from
  `GET /api/images/*`. Mount a durable, backed-up volume and give an absolute
  `UPLOAD_DIR`. (The `Storage` interface in `apps/api/src/lib/storage.ts` is the
  single place to swap in S3/MinIO/R2.)
- Set `CORS_ORIGINS` to the web origin(s) and `COOKIE_DOMAIN` (e.g.
  `.tuktakdot.com`) if web and API are separate subdomains. With
  `NODE_ENV=production`, auth cookies are `Secure`.
- Rate limiting is in-memory per process — fine for a single instance; use a
  shared store before scaling horizontally.

### Web (Next.js)

Deploy to Vercel (recommended) or run `next build` + `next start` on a Node host.
`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APP_URL` must be set **before** the build,
because they are baked into the client bundle, the `next.config.ts` rewrite
(`/api/*` → API) and `metadataBase`.

Images use a custom **Cloudflare Image Resizing** loader
(`apps/web/cf-image-loader.ts`), which only rewrites URLs in production. Keep a
Cloudflare CDN at the media/API domain, or replace the loader in
`next.config.ts`.

## Health

`GET /health` on the API returns `{ status: "ok", … }` for uptime checks.

## Troubleshooting

**`next dev` hangs / API boots as "production".** Some shells and IDEs export
`NODE_ENV=production`. That forces `next dev` into production mode and makes
`pnpm install` skip devDependencies (turbo, typescript, husky). Either unset it
(`NODE_ENV= pnpm dev`) or use `pnpm dev:direct`, which strips it for you.

**Images not resizing in production.** The web app uses a Cloudflare Image
Resizing loader; without Cloudflare in front of the media domain, images are
served unoptimized. See `apps/web/cf-image-loader.ts`.
