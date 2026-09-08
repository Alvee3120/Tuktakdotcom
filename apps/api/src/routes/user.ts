import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { createDb } from '@/db';
import { users } from '@/db/schema';
import { ALLOWED_IMAGE_TYPES } from '@/lib/images';
import { getStorage } from '@/lib/storage';
import type { Env } from '@/types/env';
import type { AuthVariables } from '@/middleware/auth';

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

export const userRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ── Upload profile photo ──
userRoutes.post('/upload', async (c) => {
  const user = c.var.user;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const form = await c.req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return c.json({ error: 'No file provided' }, 400);

  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext)
    return c.json({ error: 'Unsupported image type. Use JPG, PNG, WebP, GIF or AVIF.' }, 400);
  if (file.size > MAX_BYTES) return c.json({ error: 'Image must be 2MB or smaller' }, 400);

  const key = `users/${user.id}/${crypto.randomUUID()}.${ext}`;
  const storage = getStorage();

  // Clean up old file
  const db = createDb();
  const [currentUser] = await db
    .select({ image: users.image })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (currentUser?.image?.startsWith('/api/images/')) {
    const oldKey = currentUser.image.replace('/api/images/', '');
    try {
      await storage.delete(oldKey);
    } catch {
      /* ignore */
    }
  }

  await storage.put(key, await file.arrayBuffer(), file.type);

  const url = `/api/images/${key}`;
  return c.json({ success: true, data: { url, key } }, 201);
});

// ── Update profile (name, phone, image) ──
userRoutes.put('/profile', async (c) => {
  const user = c.var.user;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const bodySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().max(20).optional(),
    image: z.string().max(500).nullable().optional(),
  });
  const parsed = bodySchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, 400);
  }
  const body = parsed.data;
  const db = createDb();

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.image !== undefined) updates.image = body.image || null;

  const [updated] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning();
  if (!updated) return c.json({ error: 'User not found' }, 404);

  return c.json({
    success: true,
    data: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      image: updated.image,
      role: updated.role,
    },
  });
});
