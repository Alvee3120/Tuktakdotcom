# Deploying Tuktak on cPanel (shared hosting)

This monorepo has **two independent Node apps** and a **PostgreSQL** database.
Neither app imports the shared `packages/*` workspaces, so each is deployed as
its own cPanel Node.js application:

| Piece | cPanel app root | URL |
| --- | --- | --- |
| API (Hono + tsx) | `apps/api` | `api.tuktdot.com` |
| Web (Next.js) | `apps/web` | `tuktdot.com` |
| PostgreSQL | created in cPanel | `localhost:5432` |

Both apps ship a Passenger **startup file** (`server.cjs`) because cPanel runs a
plain JS entrypoint, not TypeScript and not `next start`.

## Prerequisites on the hosting plan

- **Setup Node.js App** (CloudLinux Node.js Selector) — required.
- **PostgreSQL Databases** — required.
- **Terminal** (or SSH) — required to run `npm install`, migrations and
  `next build` (the cPanel buttons cannot run a build).
- Node.js **20 or 22** selectable.

If any of the first three is missing, this deploy cannot work — use a VPS or
Vercel + a managed Postgres instead.

## 0. Layout

Confirm the repo is on the server. cPanel **Git™ Version Control** →
*Create* → clone your GitHub repo, **or** in **Terminal**:

```bash
cd ~ && git clone https://github.com/<you>/Tuktakdotcom.git app
```

Result: `/home/tuktakdo/app/apps/api` and `/home/tuktakdo/app/apps/web`.

## 1. Database (+ PostgreSQL Databases)

1. cPanel → **PostgreSQL Databases**.
2. **Create New Database**: `tuktak`
3. **Create New User**: user `tuktak`, strong password.
4. **Add User To Database** → select both → **ALL PRIVILEGES**.
5. Note the full names cPanel prefixes, e.g. `tuktakdo_tuktak` and
   `tuktakdo_tuktak`. Connection string:

   ```
   postgres://tuktakdo_tuktak:PASSWORD@localhost:5432/tuktakdo_tuktak
   ```

## 2. API — Setup Node.js App

cPanel → **Setup Node.js App** → **Create Application**:

| Field | Value |
| --- | --- |
| Node.js version | 20.x (or 22.x) |
| Application mode | Production |
| Application root | `app/apps/api` |
| Application URL | `api.tuktdot.com` |
| Application startup file | `server.cjs` |

**Environment variables** (Add Variable for each):

```
NODE_ENV=production
DATABASE_URL=postgres://tuktakdo_tuktak:PASSWORD@localhost:5432/tuktakdo_tuktak
BETTER_AUTH_SECRET=<long random string>
BETTER_AUTH_URL=https://api.tuktdot.com
APP_URL=https://tuktdot.com
CORS_ORIGINS=https://tuktdot.com,https://www.tuktdot.com
COOKIE_DOMAIN=.tuktdot.com
UPLOAD_DIR=/home/tuktakdo/app/uploads
REVALIDATE_SECRET=<same value as the web app's NEXT_REVALIDATE_SECRET>
RESEND_API_KEY=<optional>
```

`UPLOAD_DIR` **must be an absolute path** outside the repo so uploads survive
redeploys.

Then, in **Terminal**:

```bash
cd ~/app/apps/api
npm install --include=dev          # include=dev so drizzle-kit is present
npx drizzle-kit push --force       # creates the schema from src/db/schema.ts
```

Back in cPanel → **Restart** the application. Check
`https://api.tuktdot.com/health` → `{"status":"ok",...}`.

> `npm install --include=dev` is required: the app's `NODE_ENV=production`
> otherwise makes npm skip devDependencies (`drizzle-kit`).

> **Use `push`, not `migrate`.** The SQL files in `drizzle/migrations/` are
> stale MySQL/SQLite artifacts and fail on PostgreSQL. `drizzle-kit push`
> derives the schema directly from `src/db/schema.ts` and was verified to
> produce the same 29 tables as the working dev database.

## 3. Web — Setup Node.js App

cPanel → **Setup Node.js App** → **Create Application**:

| Field | Value |
| --- | --- |
| Node.js version | 20.x (or 22.x) |
| Application mode | Production |
| Application root | `app/apps/web` |
| Application URL | `tuktdot.com` |
| Application startup file | `server.cjs` |

**Environment variables** (must be set *before* building — `NEXT_PUBLIC_*` are
inlined at build time):

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.tuktdot.com
NEXT_PUBLIC_APP_URL=https://tuktdot.com
NEXT_REVALIDATE_SECRET=<same value as the API's REVALIDATE_SECRET>
```

Then, in **Terminal**:

```bash
cd ~/app/apps/web
npm install --include=dev
NEXT_PUBLIC_API_URL=https://api.tuktdot.com \
NEXT_PUBLIC_APP_URL=https://tuktdot.com \
npm run build
```

Back in cPanel → **Restart** the application. Visit `https://tuktdot.com`.

## 4. SSL

cPanel → **SSL/TLS Status** → select `tuktdot.com` and `api.tuktdot.com` →
**Run AutoSSL**. Wait for "Secured", then re-test both URLs over HTTPS.

## 5. Redeploying later

```bash
cd ~/app && git pull
cd apps/api && npm install --include=dev && npx drizzle-kit push --force
cd ../web && npm install --include=dev && npm run build
```

Then **Restart** both apps in cPanel.

## Troubleshooting

- **502 / app crashed** — read the app's stderr in cPanel → *Setup Node.js App*
  → the app's log; also `~/app/apps/api/stderr.log` if present.
- **`next dev`/build OOM on shared hosting** — build fails on very low-memory
  plans; build locally and upload `.next/`, or move the web app to Vercel.
- **Login/cookies failing** — set `COOKIE_DOMAIN=.tuktdot.com` on the API and
  ensure both URLs are HTTPS.
- **Images unoptimized** — the web app uses a Cloudflare Image Resizing loader;
  without Cloudflare the images serve as-is (harmless).
- **Uploads disappearing** — `UPLOAD_DIR` must point to a persistent absolute
  path, and `GET /api/images/*` serves from it.
- **`drizzle-kit migrate` fails with `syntax error at or near "`"`** — expected;
  the checked-in migrations are MySQL/SQLite. Use `npx drizzle-kit push --force`
  (see §2).
