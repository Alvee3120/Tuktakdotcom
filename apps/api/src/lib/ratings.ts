import { and, count, eq, sql } from 'drizzle-orm';

import type { Database } from '@/db';
import { products, reviews } from '@/db/schema';

/**
 * Recalculate a product's average rating (0-100 scale) and review count from
 * its approved reviews.
 */
export async function recalculateProductRating(db: Database, productId: string) {
  const [{ avg, cnt }] = await db
    .select({
      avg: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
      cnt: count(),
    })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.isApproved, true)));

  await db
    .update(products)
    .set({ rating: Math.round(avg * 100), reviewCount: cnt })
    .where(eq(products.id, productId));
}
