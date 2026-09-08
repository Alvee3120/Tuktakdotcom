import { zValidator } from '@hono/zod-validator';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { createDb } from '@/db';
import { orders, orderItems, reviews, users } from '@/db/schema';
import { requireAuth, requireRole } from '@/middleware/auth';
import type { Env } from '@/types/env';
import { newId } from '@/lib/ids';
import { recalculateProductRating } from '@/lib/ratings';
import { createReviewSchema, idParamSchema, reviewListSchema } from '@/validators/catalog';

/** Review routes — public listing, authenticated creation, admin moderation */
export const reviewRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: { id: string; role: string } | null; sessionToken: string | null };
}>();

/**
 * GET /api/reviews/check-eligibility?productId=...&orderId=...
 * Check if the current user can review a product (must have a delivered order with that product).
 */
reviewRoutes.get('/check-eligibility', requireAuth, async (c) => {
  const user = c.var.user!;
  const productId = c.req.query('productId');
  const orderId = c.req.query('orderId');
  const db = createDb();

  if (!productId) {
    return c.json({ success: true, data: { canReview: false, reason: 'No product specified' } });
  }

  // Check if user has a delivered/shipped order containing this product
  const conditions = [
    eq(orders.userId, user.id),
    eq(orderItems.productId, productId),
    sql`${orders.status} IN ('delivered', 'shipped')`,
  ];
  if (orderId) {
    conditions.push(eq(orders.id, orderId));
  }

  const [result] = await db
    .select({ count: count() })
    .from(orders)
    .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
    .where(and(...conditions));

  // Also check if user already reviewed this product
  const [existingReview] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.userId, user.id), eq(reviews.productId, productId)))
    .limit(1);

  const canReview = result.count > 0 && !existingReview;
  const reason = existingReview
    ? 'You have already reviewed this product'
    : result.count === 0
      ? 'You must purchase this product first'
      : '';

  return c.json({
    success: true,
    data: { canReview, reason, hasPurchased: result.count > 0, hasReviewed: !!existingReview },
  });
});

/**
 * GET /api/reviews/:productId
 * List reviews for a product (public).
 */
reviewRoutes.get(
  '/:id',
  zValidator('param', idParamSchema),
  zValidator('query', reviewListSchema),
  async (c) => {
    c.header('Cache-Control', 'public, max-age=0, must-revalidate');
    const { id: productId } = c.req.valid('param');
    const query = c.req.valid('query');
    const db = createDb();

    const offset = (query.page - 1) * query.limit;

    // Build sort
    let orderBy;
    switch (query.sort) {
      case 'highest':
        orderBy = [desc(reviews.rating)];
        break;
      case 'lowest':
        orderBy = [reviews.rating];
        break;
      default:
        orderBy = [desc(reviews.createdAt)];
    }

    // Build conditions
    const conditions = [eq(reviews.productId, productId), eq(reviews.isApproved, true)];
    if (query.verified !== undefined) {
      conditions.push(eq(reviews.isVerifiedPurchase, query.verified));
    }

    const [items, countResult] = await Promise.all([
      db
        .select({
          id: reviews.id,
          productId: reviews.productId,
          userId: reviews.userId,
          orderId: reviews.orderId,
          rating: reviews.rating,
          title: reviews.title,
          body: reviews.body,
          isApproved: reviews.isApproved,
          isVerifiedPurchase: reviews.isVerifiedPurchase,
          createdAt: reviews.createdAt,
          userName: users.name,
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .where(and(...conditions))
        .orderBy(...orderBy)
        .limit(query.limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(reviews)
        .where(and(...conditions)),
    ]);

    return c.json({
      success: true,
      data: items,
      meta: {
        total: countResult[0]?.total ?? 0,
        page: query.page,
        totalPages: Math.ceil((countResult[0]?.total ?? 0) / query.limit),
        limit: query.limit,
      },
    });
  }
);

/**
 * POST /api/reviews
 * Create a review (requires authentication).
 * Validates that the user has a delivered/shipped order containing the product.
 */
reviewRoutes.post('/', requireAuth, zValidator('json', createReviewSchema), async (c) => {
  const user = c.var.user!;
  const body = c.req.valid('json');
  const db = createDb();

  // Verify user purchased and received this product
  const [purchaseCheck] = await db
    .select({ count: count() })
    .from(orders)
    .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orders.userId, user.id),
        eq(orderItems.productId, body.productId),
        sql`${orders.status} IN ('delivered', 'shipped')`
      )
    );

  if (purchaseCheck.count === 0) {
    return c.json({ error: 'You must purchase this product before reviewing it' }, 403);
  }

  // Check for duplicate review
  const [existingReview] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.userId, user.id), eq(reviews.productId, body.productId)))
    .limit(1);

  if (existingReview) {
    return c.json({ error: 'You have already reviewed this product' }, 409);
  }

  // isVerifiedPurchase must not be client-supplied: only true when the caller
  // attaches an order id that actually belongs to them AND contains the product.
  let isVerifiedPurchase = false;
  if (body.orderId) {
    const [ownedOrder] = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orderItems.orderId, body.orderId),
          eq(orders.userId, user.id),
          eq(orderItems.productId, body.productId)
        )
      )
      .limit(1);
    isVerifiedPurchase = !!ownedOrder;
  }

  const now = new Date().toISOString();
  const id = newId();

  const [inserted] = await db
    .insert(reviews)
    .values({
      id,
      productId: body.productId,
      userId: user.id,
      orderId: isVerifiedPurchase ? body.orderId : null,
      rating: body.rating,
      title: body.title ?? null,
      body: body.body ?? null,
      isApproved: false, // Requires admin approval
      isVerifiedPurchase,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: [reviews.userId, reviews.productId],
    })
    .returning();

  // A concurrent duplicate would otherwise 500 on the unique index; the check
  // above already returned 409 in the common case, so a no-op here just means
  // the other request beat us to it.
  if (!inserted) {
    return c.json({ error: 'You have already reviewed this product' }, 409);
  }

  return c.json({ success: true, message: 'Review submitted for approval', data: { id } }, 201);
});

/**
 * PATCH /api/reviews/:id/moderate
 * Approve or reject a review (admin/moderator only).
 */
reviewRoutes.patch(
  '/:id/moderate',
  requireAuth,
  requireRole('admin', 'moderator'),
  zValidator('param', idParamSchema),
  zValidator('json', z.object({ approved: z.boolean() })),
  async (c) => {
    const { id } = c.req.valid('param');
    const { approved } = c.req.valid('json');
    const db = createDb();

    const result = await db
      .update(reviews)
      .set({ isApproved: approved, updatedAt: new Date().toISOString() })
      .where(eq(reviews.id, id))
      .returning();

    if (!result[0]) {
      return c.json({ error: 'Review not found' }, 404);
    }

    // Recalculate product rating
    await recalculateProductRating(db, result[0].productId);

    return c.json({ success: true, data: result[0] });
  }
);
