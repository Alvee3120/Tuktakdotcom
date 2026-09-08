import { Hono } from 'hono';
import { and, count, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

import { createDb } from '@/db';
import { products, wishlist } from '@/db/schema';
import type { Env } from '@/types/env';
import type { AuthVariables } from '@/middleware/auth';

export const wishlistRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const addWishlistSchema = z.object({ productId: z.string().min(1).max(100) });

// GET /api/wishlist — List user's wishlist items
wishlistRoutes.get('/', async (c) => {
  const user = c.var.user;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const db = createDb();
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20')));
  const offset = (page - 1) * limit;

  const [{ total }] = await db
    .select({ total: count() })
    .from(wishlist)
    .where(eq(wishlist.userId, user.id));

  const items = await db
    .select({
      id: wishlist.id,
      productId: wishlist.productId,
      createdAt: wishlist.createdAt,
      product: {
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        image: products.image,
        stock: products.stock,
        isActive: products.isActive,
      },
    })
    .from(wishlist)
    .innerJoin(products, eq(wishlist.productId, products.id))
    .where(eq(wishlist.userId, user.id))
    .orderBy(desc(wishlist.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({
    success: true,
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// POST /api/wishlist — Add product to wishlist
wishlistRoutes.post('/', zValidator('json', addWishlistSchema), async (c) => {
  const user = c.var.user;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { productId } = c.req.valid('json');

  const db = createDb();

  // Check if product exists
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!product) return c.json({ error: 'Product not found' }, 404);

  // Check if already in wishlist
  const [existing] = await db
    .select({ id: wishlist.id })
    .from(wishlist)
    .where(and(eq(wishlist.userId, user.id), eq(wishlist.productId, productId)))
    .limit(1);

  if (existing) return c.json({ success: true, message: 'Already in wishlist', data: existing });

  const [item] = await db
    .insert(wishlist)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      productId,
      createdAt: new Date().toISOString(),
    })
    .onConflictDoNothing({
      target: [wishlist.userId, wishlist.productId],
    })
    .returning();

  // onConflictDoNothing swallows the row when a concurrent request already won
  // the race — return the existing item instead of a misleading 201.
  if (!item) return c.json({ success: true, message: 'Already in wishlist' }, 200);

  return c.json({ success: true, data: item }, 201);
});

// DELETE /api/wishlist/:productId — Remove product from wishlist
wishlistRoutes.delete('/:productId', async (c) => {
  const user = c.var.user;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const productId = c.req.param('productId');
  const db = createDb();

  const [deleted] = await db
    .delete(wishlist)
    .where(and(eq(wishlist.userId, user.id), eq(wishlist.productId, productId)))
    .returning();

  if (!deleted) return c.json({ error: 'Not in wishlist' }, 404);
  return c.json({ success: true, message: 'Removed from wishlist' });
});

// DELETE /api/wishlist — Clear entire wishlist
wishlistRoutes.delete('/', async (c) => {
  const user = c.var.user;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const db = createDb();
  await db.delete(wishlist).where(eq(wishlist.userId, user.id));
  return c.json({ success: true, message: 'Wishlist cleared' });
});

// GET /api/wishlist/check/:productId — Check if product is in wishlist
wishlistRoutes.get('/check/:productId', async (c) => {
  const user = c.var.user;
  if (!user) return c.json({ inWishlist: false });

  const productId = c.req.param('productId');
  const db = createDb();

  const [existing] = await db
    .select({ id: wishlist.id })
    .from(wishlist)
    .where(and(eq(wishlist.userId, user.id), eq(wishlist.productId, productId)))
    .limit(1);

  return c.json({ inWishlist: !!existing });
});
