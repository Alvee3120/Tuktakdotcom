import { and, count, desc, eq, gte, inArray, like, lte, or, sql } from 'drizzle-orm';

import type { Database } from '@/db';
import { brands, categories, orderItems, orders, products } from '@/db/schema';

import { type ServiceResult, err, ok } from './base';

/** Product listing filters */
type ListProductsFilters = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  /** Also include products from child categories of categoryId. */
  includeDescendants?: boolean;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'best_selling';
  featured?: boolean;
  ids?: string[];
};

/** Product data returned from service */
export type ProductRecord = typeof products.$inferSelect;

/**
 * Product Service — encapsulates product catalog business logic.
 * Uses repository pattern: routes → service → drizzle queries.
 */
export class ProductService {
  constructor(private db: Database) {}

  /**
   * Normalize a stored product record for API responses.
   * `rating` is stored as an integer (avg * 100, e.g. 450 = 4.5),
   * so we convert it back to a 0-5 decimal for clients.
   */
  private serialize(product: ProductRecord): ProductRecord {
    return { ...product, rating: product.rating / 100 };
  }

  /**
   * Resolve a category identifier that may be either an ID or a slug.
   * Returns the matching category ID, or the original value if no match
   * (which naturally yields zero results downstream).
   */
  private async resolveCategoryId(idOrSlug: string): Promise<string> {
    const result = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(or(eq(categories.id, idOrSlug), eq(categories.slug, idOrSlug)))
      .limit(1);
    return result[0]?.id ?? idOrSlug;
  }

  /**
   * Resolve a category and all of its descendants into a flat ID list
   * (e.g. Smartphones → [Smartphones, Android Phones, iPhones]).
   */
  private async resolveCategoryTree(rootId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: categories.id, parentId: categories.parentId })
      .from(categories);

    const childrenByParent = new Map<string, string[]>();
    for (const row of rows) {
      if (!row.parentId) continue;
      const children = childrenByParent.get(row.parentId) ?? [];
      children.push(row.id);
      childrenByParent.set(row.parentId, children);
    }

    const ids: string[] = [];
    const stack = [rootId];
    while (stack.length > 0) {
      const id = stack.pop()!;
      ids.push(id);
      stack.push(...(childrenByParent.get(id) ?? []));
    }
    return ids;
  }

  /**
   * Resolve a brand identifier that may be either an ID or a slug.
   */
  private async resolveBrandId(idOrSlug: string): Promise<string> {
    const result = await this.db
      .select({ id: brands.id })
      .from(brands)
      .where(or(eq(brands.id, idOrSlug), eq(brands.slug, idOrSlug)))
      .limit(1);
    return result[0]?.id ?? idOrSlug;
  }

  /**
   * List products with filtering, pagination, and sorting.
   */
  async list(filters: ListProductsFilters = {}): Promise<
    ServiceResult<{
      items: ProductRecord[];
      total: number;
      page: number;
      totalPages: number;
    }>
  > {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [];

    if (filters.search) {
      conditions.push(like(products.name, `%${filters.search}%`));
    }
    if (filters.categoryId) {
      // Accept either a category ID or slug (frontend links use slugs)
      const categoryId = await this.resolveCategoryId(filters.categoryId);
      if (filters.includeDescendants) {
        const tree = await this.resolveCategoryTree(categoryId);
        conditions.push(inArray(products.categoryId, tree));
      } else {
        conditions.push(eq(products.categoryId, categoryId));
      }
    }
    if (filters.brandId) {
      // Accept either a brand ID or slug (frontend links use slugs)
      const brandId = await this.resolveBrandId(filters.brandId);
      conditions.push(eq(products.brandId, brandId));
    }
    if (filters.minPrice !== undefined) {
      conditions.push(gte(products.price, filters.minPrice));
    }
    if (filters.maxPrice !== undefined) {
      conditions.push(lte(products.price, filters.maxPrice));
    }
    if (filters.featured !== undefined) {
      conditions.push(eq(products.isFeatured, filters.featured));
    }
    if (filters.ids && filters.ids.length > 0) {
      // Manually-picked home sections fetch specific products in one batch
      conditions.push(inArray(products.id, filters.ids));
    }
    // Active products only
    conditions.push(eq(products.isActive, true));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Best-selling: rank by total units sold across non-cancelled/refunded
    // orders. Sold counts live in order_items, so aggregate them in a subquery
    // and left-join it; products with no sales coalesce to 0 and fall back to
    // newest-first.
    if (filters.sort === 'best_selling') {
      const soldCounts = this.db
        .select({
          productId: orderItems.productId,
          totalSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`.as('total_sold'),
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(sql`${orders.status} not in ('cancelled', 'refunded')`)
        .groupBy(orderItems.productId)
        .as('sold_counts');

      const [rows, totalResult] = await Promise.all([
        this.db
          .select({ product: products })
          .from(products)
          .leftJoin(soldCounts, eq(products.id, soldCounts.productId))
          .where(where)
          .orderBy(sql`coalesce(${soldCounts.totalSold}, 0) desc`, desc(products.createdAt))
          .limit(limit)
          .offset(offset),
        this.db.select({ count: count() }).from(products).where(where),
      ]);

      const total = totalResult[0]?.count ?? 0;

      return ok({
        items: rows.map((row) => this.serialize(row.product)),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    }

    // Determine sort order
    let orderBy;
    switch (filters.sort) {
      case 'price_asc':
        orderBy = [products.price];
        break;
      case 'price_desc':
        orderBy = [desc(products.price)];
        break;
      case 'rating':
        orderBy = [desc(products.rating)];
        break;
      case 'newest':
      default:
        orderBy = [desc(products.createdAt)];
    }

    const [items, totalResult] = await Promise.all([
      this.db
        .select()
        .from(products)
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
      this.db.select({ count: count() }).from(products).where(where),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return ok({
      items: items.map((item) => this.serialize(item)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }

  /**
   * Get a single product by slug.
   */
  async getBySlug(slug: string): Promise<ServiceResult<ProductRecord>> {
    const result = await this.db.select().from(products).where(eq(products.slug, slug)).limit(1);

    const product = result[0];
    if (!product) {
      return err('Product not found', 404);
    }

    return ok(this.serialize(product));
  }
}
