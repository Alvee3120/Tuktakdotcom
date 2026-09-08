import { createMiddleware } from 'hono/factory';

import type { Env } from '@/types/env';

import { createDb } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

/** User type extracted from Better Auth session */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  phone: string | null;
  role: 'admin' | 'moderator' | 'customer';
  banned: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Hono context variables set by auth middleware */
export type AuthVariables = {
  user: AuthUser | null;
  sessionToken: string | null;
};

/**
 * Read a cookie value from a Cookie header string.
 */
function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Authentication middleware — extracts session from cookies/headers.
 * Sets c.var.user to the authenticated user or null.
 * Does NOT reject unauthenticated requests (use requireAuth for that).
 *
 * NOTE: We read the session cookie directly from the DB instead of calling
 * `auth.api.getSession()`. The better-auth handler pipeline (CSRF check,
 * body parsing) consumes the Request body stream, which on Cloudflare Workers
 * can only be read once — breaking downstream zValidator on POST requests.
 *
 * Better Auth prefixes the cookie with `__Secure-` when useSecureCookies is
 * true (production/HTTPS). We must check both names.
 */
const SESSION_COOKIE_NAMES = [
  '__Secure-better-auth.session_token',
  'better-auth.session_token',
];

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: AuthVariables;
}>(async (c, next) => {
  try {
    const db = createDb();

    const cookieHeader = c.req.header('Cookie');
    // Try both cookie names (production uses __Secure- prefix).
    let rawToken: string | null = null;
    for (const name of SESSION_COOKIE_NAMES) {
      rawToken = readCookie(cookieHeader, name);
      if (rawToken) break;
    }

    if (rawToken) {
      // The cookie is signed with HMAC. better-auth uses a signed cookie format:
      // <value>.<signature>. We need to extract just the token value.
      // However, we can look up the session directly by matching the token
      // stored in the DB (which is the raw token, not the signed version).
      const tokenParts = rawToken.split('.');
      const sessionToken = tokenParts.length >= 2 ? tokenParts.slice(0, -1).join('.') : rawToken;

      const [session] = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.token, sessionToken))
        .limit(1);

      if (session) {
        // Check if session is expired
        const expiresAt = new Date(session.expiresAt);
        if (expiresAt > new Date()) {
          const [user] = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, session.userId))
            .limit(1);

          if (user && !user.banned) {
            c.set('user', {
              id: user.id,
              name: user.name,
              email: user.email,
              emailVerified: user.emailVerified as boolean,
              image: user.image ?? null,
              phone: user.phone ?? null,
              role: (user.role as AuthUser['role']) ?? 'customer',
              banned: user.banned as boolean,
              createdAt: new Date(user.createdAt).toISOString(),
              updatedAt: new Date(user.updatedAt).toISOString(),
            });
            c.set('sessionToken', sessionToken);
            await next();
            return;
          }
        }
      }
    }
  } catch (err) {
    console.error('[AUTH] Session lookup failed:', err);
  }

  c.set('user', null);
  c.set('sessionToken', null);
  await next();
});

/**
 * Require authentication — rejects unauthenticated requests with 401.
 * Must be used AFTER authMiddleware.
 */
export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: AuthVariables;
}>(async (c, next) => {
  const user = c.var.user;

  if (!user) {
    return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401);
  }

  if (user.banned) {
    return c.json({ error: 'Forbidden', message: 'Account has been suspended' }, 403);
  }

  await next();
});

/**
 * Role-based access control middleware.
 * Restricts routes to users with specific roles.
 *
 * Usage: app.use('/admin/*', requireAuth, requireRole('admin'))
 *        app.use('/mod/*', requireAuth, requireRole('admin', 'moderator'))
 */
export function requireRole(...allowedRoles: AuthUser['role'][]) {
  return createMiddleware<{
    Bindings: Env;
    Variables: AuthVariables;
  }>(async (c, next) => {
    const user = c.var.user;

    if (!user || !allowedRoles.includes(user.role)) {
      return c.json({ error: 'Forbidden', message: 'Insufficient permissions' }, 403);
    }

    await next();
  });
}

/**
 * Permission-based access control for moderators.
 *
 * Auth flow:
 *  - Anonymous → 401.
 *  - Admin    → bypasses (admin implicitly holds every permission).
 *  - Moderator → must hold at least one of `required` keys in their
 *    `users.permissions` JSON array (keys come from MODERATOR_PAGES).
 *  - Any other role → 403.
 *
 * Must be used AFTER authMiddleware.
 */
export function requirePermission(...required: string[]) {
  return createMiddleware<{
    Bindings: Env;
    Variables: AuthVariables;
  }>(async (c, next) => {
    const user = c.var.user;

    if (!user) {
      return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401);
    }

    // Admin implicitly holds every permission.
    if (user.role === 'admin') {
      await next();
      return;
    }

    if (user.role !== 'moderator') {
      return c.json({ error: 'Forbidden', message: 'Insufficient permissions' }, 403);
    }

    // No required permission → any moderator passes (need to have been
    // admitted by requireRole('admin','moderator') already).
    if (required.length === 0) {
      await next();
      return;
    }

    // Moderators' granted keys live in users.permissions (JSON string array).
    const db = createDb();
    const [row] = await db
      .select({ permissions: schema.users.permissions })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1);

    let granted: string[] = [];
    if (row?.permissions) {
      try {
        const parsed = JSON.parse(row.permissions);
        if (Array.isArray(parsed)) granted = parsed as string[];
      } catch {
        // Malformed permissions are treated as "none granted".
        granted = [];
      }
    }

    const hasAny = required.some((p) => granted.includes(p));
    if (!hasAny) {
      return c.json({ error: 'Forbidden', message: 'Insufficient permissions' }, 403);
    }

    await next();
  });
}
