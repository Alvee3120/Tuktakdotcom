import { zValidator } from '@hono/zod-validator';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { Hono } from 'hono';
import type { ProductRecord } from '@/services/product-service';

import { createDb } from '@/db';
import { orderItems, orders, productVariants } from '@/db/schema';
import * as schema from '@/db/schema';
import { indexBy } from '@/lib/collections';
import type { Env } from '@/types/env';
import { productListSchema, productSlugSchema } from '@/validators/catalog';

import { ProductService } from '@/services/product-service';

/** Product catalog routes — public endpoints */
export const productRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/products
 * List products with filtering, sorting, and pagination.
 */
productRoutes.get('/', zValidator('query', productListSchema), async (c) => {
  c.header('Cache-Control', 'public, max-age=0, must-revalidate');
  const query = c.req.valid('query');
  const db = createDb();
  const service = new ProductService(db);

  const result = await service.list({
    page: query.page,
    limit: query.limit,
    search: query.search,
    categoryId: query.category,
    includeDescendants: query.includeDescendants,
    brandId: query.brand,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    sort: query.sort,
    featured: query.featured,
    ids: query.ids
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  });

  if (!result.ok) {
    return c.json({ error: result.error }, (result.status ?? 500) as ContentfulStatusCode);
  }

  return c.json({
    success: true,
    data: result.data.items,
    meta: {
      total: result.data.total,
      page: result.data.page,
      totalPages: result.data.totalPages,
      limit: query.limit,
    },
  });
});

/**
 * GET /api/products/featured
 * Get featured products for homepage.
 */
productRoutes.get('/featured', async (c) => {
  const db = createDb();
  const service = new ProductService(db);

  const result = await service.list({
    featured: true,
    limit: 12,
    sort: 'newest',
  });

  if (!result.ok) {
    return c.json({ error: result.error }, (result.status ?? 500) as ContentfulStatusCode);
  }

  return c.json({ success: true, data: result.data.items });
});

/**
 * GET /api/products/flash-deal?ids=id1,id2,...
 * Get products with sold counts for flash deal display.
 */
productRoutes.get('/flash-deal', async (c) => {
  const idsParam = c.req.query('ids');
  if (!idsParam) {
    return c.json({ success: true, data: [] });
  }

  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) {
    return c.json({ success: true, data: [] });
  }

  const db = createDb();
  const service = new ProductService(db);

  // Fetch products
  const result = await service.list({ ids, limit: ids.length });
  if (!result.ok) {
    return c.json({ error: result.error }, (result.status ?? 500) as ContentfulStatusCode);
  }

  // Calculate sold counts from order_items for non-cancelled/refunded orders
  const soldRows = await db
    .select({
      productId: orderItems.productId,
      totalSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`.as('total_sold'),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        sql`${orderItems.productId} in ${ids}`,
        sql`${orders.status} not in ('cancelled', 'refunded')`
      )
    )
    .groupBy(orderItems.productId);

  const soldMap = indexBy(soldRows, (r) => r.productId);

  // Merge sold data into products, preserving input order
  const products = ids
    .map((id) => result.data.items.find((p) => p.id === id))
    .filter(Boolean)
    .map((p: ProductRecord | undefined) => ({
      ...p,
      sold: soldMap.get(p!.id)?.totalSold ?? 0,
    }));

  return c.json({ success: true, data: products });
});

/**
 * GET /api/products/:slug/related
 * Get related products (same category, excluding current product).
 */
productRoutes.get('/:slug/related', zValidator('param', productSlugSchema), async (c) => {
  const { slug } = c.req.valid('param');
  const limit = Math.min(Number(c.req.query('limit') ?? 8), 20);
  const db = createDb();

  // First, find the current product to get its categoryId
  const currentProduct = await db
    .select({ id: schema.products.id, categoryId: schema.products.categoryId })
    .from(schema.products)
    .where(eq(schema.products.slug, slug))
    .limit(1);

  if (currentProduct.length === 0) {
    return c.json({ success: true, data: [] });
  }

  const { id: currentId, categoryId } = currentProduct[0];

  if (!categoryId) {
    // No category — return featured products as fallback
    const fallback = await db
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.isActive, true), eq(schema.products.isFeatured, true)))
      .orderBy(sql`RANDOM()`)
      .limit(limit);

    return c.json({ success: true, data: fallback.map((p) => ({ ...p, rating: p.rating / 100 })) });
  }

  // Fetch products in the same category, excluding current product
  const related = await db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.isActive, true),
        eq(schema.products.categoryId, categoryId),
        sql`${schema.products.id} != ${currentId}`
      )
    )
    .orderBy(desc(schema.products.rating), desc(schema.products.reviewCount))
    .limit(limit);

  return c.json({ success: true, data: related.map((p) => ({ ...p, rating: p.rating / 100 })) });
});

/**
 * GET /api/products/:slug
 * Get a single product by slug.
 */
productRoutes.get('/:slug', zValidator('param', productSlugSchema), async (c) => {
  const { slug } = c.req.valid('param');
  const db = createDb();
  const service = new ProductService(db);

  const result = await service.getBySlug(slug);

  if (!result.ok) {
    return c.json({ error: result.error }, (result.status ?? 404) as ContentfulStatusCode);
  }

  // Include active variants so the storefront can render a variant selector.
  const variants = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.productId, result.data.id), eq(productVariants.isActive, true)))
    .orderBy(asc(productVariants.createdAt));

  // Include variant types with their options for the smart selector
  let typesWithOptions: {
    id: string;
    productId: string;
    name: string;
    sortOrder: number;
    options: { id: string; variantTypeId: string; value: string | null; sortOrder: number }[];
  }[] = [];
  try {
    const types = await db
      .select()
      .from(schema.variantTypes)
      .where(eq(schema.variantTypes.productId, result.data.id))
      .orderBy(schema.variantTypes.sortOrder);

    // Fetch all options for all types in a single query (eliminates N+1)
    const typeIds = types.map((vt) => vt.id);
    const allOptions =
      typeIds.length > 0
        ? await db
            .select()
            .from(schema.variantOptions)
            .where(inArray(schema.variantOptions.variantTypeId, typeIds))
            .orderBy(schema.variantOptions.sortOrder)
        : [];
    const optionsByType = new Map<string, typeof allOptions>();
    for (const opt of allOptions) {
      const list = optionsByType.get(opt.variantTypeId) || [];
      list.push(opt);
      optionsByType.set(opt.variantTypeId, list);
    }
    typesWithOptions = types.map((vt) => ({ ...vt, options: optionsByType.get(vt.id) || [] }));
  } catch {
    // variantTypes/variantOptions tables may not exist yet — ignore
  }

  return c.json({
    success: true,
    data: { ...result.data, variants, variantTypes: typesWithOptions },
  });
});
