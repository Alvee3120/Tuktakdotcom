import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import type { Env } from '@/types/env';
import type { AuthVariables } from '@/middleware/auth';
import { createDb, contactMessages, newsletterSubscribers } from '@/db';

const contactApp = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ── Public: Submit contact form ──
const submitSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  subject: z.string().max(300).optional(),
  message: z.string().min(10).max(5000),
});

contactApp.post('/submit', zValidator('json', submitSchema), async (c) => {
  const db = createDb();
  const body = c.req.valid('json');
  const now = new Date().toISOString();

  await db.insert(contactMessages).values({
    id: crypto.randomUUID(),
    name: body.name,
    email: body.email,
    subject: body.subject ?? null,
    message: body.message,
    isRead: false,
    createdAt: now,
    updatedAt: now,
  });

  return c.json({ success: true, message: 'Message sent successfully' }, 201);
});

// ── Newsletter subscribe ──
const subscribeSchema = z.object({
  email: z.string().email(),
});

contactApp.post('/subscribe', zValidator('json', subscribeSchema), async (c) => {
  const db = createDb();
  const body = c.req.valid('json');
  const now = new Date().toISOString();

  try {
    await db.insert(newsletterSubscribers).values({
      id: crypto.randomUUID(),
      email: body.email,
      isActive: true,
      createdAt: now,
    });
  } catch {
    // Duplicate email — still OK
  }

  return c.json({ success: true, message: 'Subscribed successfully' });
});

export { contactApp };
