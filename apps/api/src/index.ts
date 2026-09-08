/**
 * Tuktak API — standalone Node.js server bootstrap.
 *
 * The API was formerly a Cloudflare Worker (wrangler + D1). It now runs on Node
 * (Hono + @hono/node-server) against a self-hosted PostgreSQL instance.
 *
 * We pass the loaded Env config to `app.fetch` as the bindings argument so every
 * handler's `c.env` reads the same config object (matching how Workers injected
 * bindings before).
 */
import { serve } from '@hono/node-server';

import { createApp } from './app';
import { loadEnv } from './types/env';

const env = loadEnv();

const app = createApp();

const port = Number(process.env.PORT) || 8787;

serve({
  fetch: (req) => {
    const executionCtx = {
      waitUntil: (promise: Promise<unknown>) => {
        promise.catch((err) => console.error('[waitUntil]', err));
      },
      passThroughOnException: () => {},
    };
    return app.fetch(req, env, executionCtx as never);
  },
  port,
});

console.log(`[tuktak-api] listening on http://localhost:${port} (${env.NODE_ENV})`);