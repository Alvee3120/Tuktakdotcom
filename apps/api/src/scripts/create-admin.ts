/**
 * Create (or promote) an admin user.
 *
 * Usage (from apps/api):
 *   npm run create-admin -- <email> <password> [name]
 *
 * If the email already exists it is promoted to admin (password unchanged).
 * Otherwise a new credential account is created with the given password, using
 * better-auth's own sign-up path so the password hash format stays correct.
 */
import { eq } from 'drizzle-orm';

import { createDb } from '@/db';
import { users } from '@/db/schema';
import { createAuth } from '@/lib/auth';
import { loadEnv } from '@/types/env';

async function main() {
  const [email, password, name] = process.argv.slice(2);

  if (!email || !password) {
    console.error('Usage: npm run create-admin -- <email> <password> [name]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters (matches the sign-up rule).');
    process.exit(1);
  }

  const env = loadEnv();
  const db = createDb();
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing) {
    console.log(`User ${email} already exists — promoting to admin.`);
  } else {
    const auth = createAuth(env);
    await auth.api.signUpEmail({ body: { email, password, name: name ?? 'Admin' } });
    console.log(`Created user ${email}.`);
  }

  await db
    .update(users)
    .set({ role: 'admin', updatedAt: new Date().toISOString() })
    .where(eq(users.email, email));

  console.log(`Done — ${email} is now an admin. Log in and open /en/admin.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[create-admin] failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
