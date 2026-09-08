import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import type { Env } from '@/types/env';

import { createDb } from '@/db';
import { getAllowedOrigins } from '@/lib/origins';
import { sendWelcomeEmail } from '@/lib/email';
import * as authSchema from '@/db/schema';

export function createAuth(env: Env) {
  const db = createDb();
  const isProduction = env.NODE_ENV === 'production';

  // The Postgres drizzle adapter handles Date objects natively — no monkey
  // patching needed (the SQLite/D1 adapter needed supportsDates=false).
  const adapter = drizzleAdapter(db, {
    provider: 'pg',
    debugLogs: !isProduction,
    schema: {
      user: authSchema.users,
      session: authSchema.sessions,
      account: authSchema.accounts,
      verification: authSchema.verifications,
    },
  });

  return betterAuth({
    database: adapter,

    baseURL: (env.BETTER_AUTH_URL || 'http://localhost:8787') + '/api/auth',
    secret: (() => {
      if (!env.BETTER_AUTH_SECRET) {
        if (isProduction) {
          // Failing hard (instead of falling back to a public constant)
          // prevents session forgery when the secret is misconfigured.
          throw new Error('[AUTH] BETTER_AUTH_SECRET is required in production');
        }
        return 'dev-secret-do-not-use-in-production';
      }
      return env.BETTER_AUTH_SECRET;
    })(),

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      requireEmailVerification: false,
    },

    // Google OAuth is enabled only when both credentials are configured.
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          socialProviders: {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          },
        }
      : {}),

    advanced: {
      database: {
        generateId: 'uuid',
      },
      // Local dev is served over http:// so cookies must not be Secure-only.
      useSecureCookies: env.NODE_ENV === 'production',
      // When the API and frontend live on different subdomains (api. vs www.),
      // OAuth session cookies must be shared across them.
      ...(env.COOKIE_DOMAIN
        ? { crossSubDomainCookies: { enabled: true, domain: env.COOKIE_DOMAIN } }
        : {}),
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: false,
      },
    },

    user: {
      additionalFields: {
        phone: {
          type: 'string',
          required: false,
          input: true,
        },
        role: {
          type: 'string',
          required: false,
          defaultValue: 'customer',
          input: false,
        },
        banned: {
          type: 'boolean',
          required: false,
          defaultValue: false,
          input: false,
        },
        banReason: {
          type: 'string',
          required: false,
          input: false,
        },
      },
    },

    // Fire the welcome email right after a brand-new account is created — non-blocking so signup stays fast.
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if (user?.email) {
              sendWelcomeEmail(env, {
                customerEmail: user.email,
                customerName: user.name || 'there',
              }).catch((err) => console.error('[AUTH] Welcome email failed:', err));
            }
          },
        },
      },
    },

    trustedOrigins: getAllowedOrigins(env),
  });
}
