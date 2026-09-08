import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { createDb } from '@/db';
import { addresses } from '@/db/schema';
import { newId } from '@/lib/ids';
import { requireAuth, type AuthVariables } from '@/middleware/auth';
import type { Env } from '@/types/env';
import { idParamSchema } from '@/validators/catalog';
import { createAddressSchema, updateAddressSchema } from '@/validators/order';

/** Address routes — authenticated users manage their shipping addresses */
export const addressRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// All routes require authentication
addressRoutes.use('*', requireAuth);

/**
 * GET /api/addresses
 * List all addresses for the current user.
 */
addressRoutes.get('/', async (c) => {
  const user = c.var.user!;
  const db = createDb();

  const userAddresses = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, user.id))
    .orderBy(addresses.createdAt);

  return c.json({ success: true, data: userAddresses });
});

/**
 * POST /api/addresses
 * Create a new address.
 */
addressRoutes.post('/', zValidator('json', createAddressSchema), async (c) => {
  const user = c.var.user!;
  const body = c.req.valid('json');
  const db = createDb();

  const id = newId();
  const now = new Date().toISOString();

  // If setting as default, unset other defaults first
  if (body.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  }

  await db.insert(addresses).values({
    id,
    userId: user.id,
    label: body.label ?? 'Home',
    name: body.name,
    phone: body.phone,
    street: body.street,
    city: body.city,
    district: body.district ?? null,
    postalCode: body.postalCode ?? null,
    isDefault: body.isDefault ?? false,
    createdAt: now,
    updatedAt: now,
  });

  return c.json({ success: true, data: { id } }, 201);
});

/**
 * PATCH /api/addresses/:id
 * Update an address.
 */
addressRoutes.patch(
  '/:id',
  zValidator('param', idParamSchema),
  zValidator('json', updateAddressSchema),
  async (c) => {
    const user = c.var.user!;
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const db = createDb();

    // Verify ownership
    const [existing] = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, user.id)))
      .limit(1);

    if (!existing) {
      return c.json({ error: 'Address not found' }, 404);
    }

    // If setting as default, unset other defaults first
    if (body.isDefault) {
      await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
    }

    const result = await db
      .update(addresses)
      .set({ ...body, updatedAt: new Date().toISOString() })
      .where(eq(addresses.id, id))
      .returning();

    if (!result[0]) {
      return c.json({ error: 'Address not found' }, 404);
    }

    return c.json({ success: true, data: result[0] });
  }
);

/**
 * DELETE /api/addresses/:id
 * Delete an address.
 */
addressRoutes.delete('/:id', zValidator('param', idParamSchema), async (c) => {
  const user = c.var.user!;
  const { id } = c.req.valid('param');
  const db = createDb();

  // Verify ownership
  const [existing] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, user.id)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Address not found' }, 404);
  }

  const result = await db.delete(addresses).where(eq(addresses.id, id)).returning();

  if (!result[0]) {
    return c.json({ error: 'Address not found' }, 404);
  }

  return c.json({ success: true, message: 'Address deleted' });
});
