import { Hono } from 'hono';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

import { createDb } from '@/db';
import { accounts, sessions, users, verifications } from '@/db/schema';
import { createAuth } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import type { Env } from '@/types/env';

const passwordRoutes = new Hono<{ Bindings: Env }>();

const forgotSchema = z.object({ email: z.string().email().max(255) });
const verifySchema = z.object({ email: z.string().email().max(255), otp: z.string().length(6) });
const resetSchema = z.object({
  token: z.string().min(1).max(500),
  newPassword: z.string().min(8).max(128),
});

// Cryptographically secure 6-digit OTP (replaces Math.random())
function generateOtp(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const n = buf[0] % 1000000;
  return String(n).padStart(6, '0');
}

// POST /api/password/forgot — Request password reset (sends OTP)
passwordRoutes.post('/forgot', zValidator('json', forgotSchema), async (c) => {
  const { email } = c.req.valid('json');

  const db = createDb();
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  // Always return success to prevent email enumeration
  if (!user)
    return c.json({ success: true, message: 'If an account exists, a reset code has been sent.' });

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

  // Clean up existing reset tokens for this user
  const identifier = `password-reset:${user.id}`;
  const existing = await db
    .select({ id: verifications.id })
    .from(verifications)
    .where(eq(verifications.identifier, identifier));
  if (existing.length > 0) {
    await db.delete(verifications).where(
      inArray(
        verifications.id,
        existing.map((v) => v.id)
      )
    );
  }

  // Store OTP
  await db.insert(verifications).values({
    id: crypto.randomUUID(),
    identifier,
    value: otp,
    expiresAt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Deliver the OTP by email (Resend); no-op when email is not configured.
  await sendPasswordResetEmail(c.env, {
    customerEmail: user.email,
    customerName: user.name || 'there',
    otp,
  });

  // Dev convenience only — never log the OTP in production.
  if (c.env.NODE_ENV !== 'production') {
    console.warn(`[PASSWORD RESET] Dev-mode OTP for ${user.email}: ${otp}`);
  }

  return c.json({ success: true, message: 'If an account exists, a reset code has been sent.' });
});

// POST /api/password/verify — Verify OTP and get reset token
passwordRoutes.post('/verify', zValidator('json', verifySchema), async (c) => {
  const { email, otp } = c.req.valid('json');

  const db = createDb();
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);
  if (!user) return c.json({ error: 'Invalid code' }, 400);

  const identifier = `password-reset:${user.id}`;
  const [resetVerification] = await db
    .select()
    .from(verifications)
    .where(and(eq(verifications.identifier, identifier), eq(verifications.value, otp)))
    .limit(1);

  if (!resetVerification) return c.json({ error: 'Invalid or expired code' }, 400);

  // Check expiry
  if (new Date(resetVerification.expiresAt) < new Date()) {
    return c.json({ error: 'Code has expired. Please request a new one.' }, 400);
  }

  // Delete the OTP verification
  await db.delete(verifications).where(eq(verifications.id, resetVerification.id));

  // Generate a short-lived reset token (valid for 10 minutes)
  const resetToken = crypto.randomUUID();
  const resetExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await db.insert(verifications).values({
    id: crypto.randomUUID(),
    identifier: `password-reset-token:${user.id}`,
    value: resetToken,
    expiresAt: resetExpires,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return c.json({ success: true, data: { resetToken } });
});

// POST /api/password/reset — Reset password with token
passwordRoutes.post('/reset', zValidator('json', resetSchema), async (c) => {
  const { token, newPassword } = c.req.valid('json');

  const db = createDb();

  // Find the verification by token value
  const [resetVerification] = await db
    .select()
    .from(verifications)
    .where(eq(verifications.value, token))
    .limit(1);

  if (!resetVerification || !resetVerification.identifier.startsWith('password-reset-token:')) {
    return c.json({ error: 'Invalid or expired reset token' }, 400);
  }

  if (new Date(resetVerification.expiresAt) < new Date()) {
    return c.json({ error: 'Reset token has expired' }, 400);
  }

  // Extract userId from identifier
  const userId = resetVerification.identifier.replace('password-reset-token:', '');

  // Hash the new password using Better Auth
  const auth = createAuth(c.env);
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(newPassword);

  // Update password in accounts table
  const [credentialAccount] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, 'credential')))
    .limit(1);

  if (credentialAccount) {
    await db
      .update(accounts)
      .set({ password: hash, updatedAt: new Date().toISOString() })
      .where(eq(accounts.id, credentialAccount.id));
  }

  // Delete the reset token
  await db.delete(verifications).where(eq(verifications.id, resetVerification.id));

  // Invalidate all existing sessions for this user (single batch delete)
  await db.delete(sessions).where(eq(sessions.userId, userId));

  return c.json({
    success: true,
    message: 'Password reset successfully. Please sign in with your new password.',
  });
});

export { passwordRoutes };
