import { z } from 'zod';

/** Pagination query parameters */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Product list query parameters */
export const productListSchema = paginationSchema.extend({
  search: z.string().min(1).max(200).optional(),
  category: z.string().optional(),
  // Include products from child categories of `category` (e.g. Smartphones →
  // Android Phones + iPhones)
  includeDescendants: z.coerce.boolean().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'rating', 'best_selling']).default('newest'),
  featured: z.coerce.boolean().optional(),
  // Comma-separated product IDs (used by manually-picked home sections)
  ids: z.string().max(2000).optional(),
});

/** Product slug param */
export const productSlugSchema = z.object({
  slug: z.string().min(1).max(200),
});

/** Create review body */
export const createReviewSchema = z.object({
  productId: z.string().min(1),
  orderId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(2).max(100).optional(),
  body: z.string().min(10).max(2000).optional(),
});

/** Review list query for a product */
export const reviewListSchema = paginationSchema.extend({
  sort: z.enum(['newest', 'highest', 'lowest']).default('newest'),
  verified: z.coerce.boolean().optional(),
});

/** Category slug param */
export const categorySlugSchema = z.object({
  slug: z.string().min(1).max(100),
});

/** Brand slug param */
export const brandSlugSchema = z.object({
  slug: z.string().min(1).max(100),
});

/** ID param (generic) */
export const idParamSchema = z.object({
  id: z.string().min(1),
});
