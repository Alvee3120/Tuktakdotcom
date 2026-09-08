import { Hono } from 'hono';

import type { Env } from '@/types/env';

import { createAuth } from '@/lib/auth';

/**
 * Auth routes — delegates to Better Auth's built-in handler.
 * Better Auth's baseURL is set to http://localhost:8787/api/auth,
 * so its internal router matches paths like /sign-up/email correctly
 * when given the full /api/auth/sign-up/email URL.
 */
export const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.all('/*', async (c) => {
  const auth = createAuth(c.env);
  try {
    const res = await auth.handler(c.req.raw);
    return res;
  } catch (err) {
    console.error('[AUTH] handler error:', err);
    throw err;
  }
});
