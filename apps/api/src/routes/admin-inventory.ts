import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { eq, sql, and, like, desc, notInArray, type SQL } from 'drizzle-orm';

import type { Env } from '@/types/env';
import type { AuthVariables } from '@/middleware/auth';
import { createDb } from '@/db';
import * as schema from '@/db/schema';
import { indexBy } from '@/lib/collections';
import { parsePagination } from '@/lib/pagination';

/**
 * Admin inventory routes — mounted inside adminApp at /api/admin/inventories,
 * so the requireAuth + requireRole('admin','moderator') guard already applies.
 */
export const inventoryRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ── Schemas ──
const createInventorySchema = z.object({
  name: z.string().min(1).max(255),
  location: z.string().max(500).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().default(true),
});

const updateInventorySchema = createInventorySchema.partial();

const setAllocationsSchema = z.object({
  productId: z.string().min(1),
  allocations: z
    .array(
      z.object({
        inventoryId: z.string().min(1),
        quantity: z.number().int().min(0),
      })
    )
    .max(50),
});

/**
 * Upsert a product's per-inventory allocations, DELETE allocations removed from
 * the incoming list, and sync product.stock to the sum of remaining allocations.
 * Shared by this router and admin.ts. Run as a single D1 batch for atomicity.
 */
export async function applyProductAllocations(
  db: ReturnType<typeof createDb>,
  productId: string,
  allocations: { inventoryId: string; quantity: number }[]
) {
  const now = new Date().toISOString();

  // Remove allocations that are no longer present in the incoming list.
  // (When the list is empty, clear every row for this product.) Upsert the
  // incoming allocations — all inside a single Postgres transaction.
  const deleteWhere =
    allocations.length > 0
      ? and(
          eq(schema.inventoryStock.productId, productId),
          notInArray(
            schema.inventoryStock.inventoryId,
            allocations.map((a) => a.inventoryId)
          )
        )
      : eq(schema.inventoryStock.productId, productId);

  await db.transaction(async (tx) => {
    await tx.delete(schema.inventoryStock).where(deleteWhere);

    for (const alloc of allocations) {
      await tx
        .insert(schema.inventoryStock)
        .values({
          id: crypto.randomUUID(),
          inventoryId: alloc.inventoryId,
          productId,
          quantity: alloc.quantity,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [schema.inventoryStock.inventoryId, schema.inventoryStock.productId],
          set: { quantity: alloc.quantity, updatedAt: now },
        });
    }
  });

  // product.stock stays the total across all inventories.
  const [{ total }] = await db
    .select({ total: sql<number>`COALESCE(SUM(${schema.inventoryStock.quantity}), 0)` })
    .from(schema.inventoryStock)
    .where(eq(schema.inventoryStock.productId, productId));
  await db
    .update(schema.products)
    .set({ stock: total, updatedAt: now })
    .where(eq(schema.products.id, productId));
  return total;
}

// ── List inventories (with SKU count + total units) ──
inventoryRoutes.get('/', async (c) => {
  const db = createDb();
  const rows = await db
    .select({
      id: schema.inventories.id,
      name: schema.inventories.name,
      location: schema.inventories.location,
      description: schema.inventories.description,
      isActive: schema.inventories.isActive,
      createdAt: schema.inventories.createdAt,
      updatedAt: schema.inventories.updatedAt,
      skuCount: sql<number>`COALESCE(COUNT(CASE WHEN ${schema.inventoryStock.quantity} > 0 THEN 1 END), 0)`,
      totalUnits: sql<number>`COALESCE(SUM(${schema.inventoryStock.quantity}), 0)`,
    })
    .from(schema.inventories)
    .leftJoin(schema.inventoryStock, eq(schema.inventoryStock.inventoryId, schema.inventories.id))
    .groupBy(schema.inventories.id)
    .orderBy(desc(schema.inventories.createdAt));
  return c.json({ success: true, data: rows });
});

// ── Create inventory ──
inventoryRoutes.post('/', zValidator('json', createInventorySchema), async (c) => {
  const db = createDb();
  const body = c.req.valid('json');
  const now = new Date().toISOString();
  const [inventory] = await db
    .insert(schema.inventories)
    .values({
      id: crypto.randomUUID(),
      name: body.name,
      location: body.location ?? null,
      description: body.description ?? null,
      isActive: body.isActive,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return c.json({ success: true, data: inventory }, 201);
});

// ── Set product allocations (must be before /:id routes) ──
inventoryRoutes.put('/stock', zValidator('json', setAllocationsSchema), async (c) => {
  const db = createDb();
  const { productId, allocations } = c.req.valid('json');
  const [product] = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.id, productId))
    .limit(1);
  if (!product) return c.json({ error: 'Product not found' }, 404);
  const total = await applyProductAllocations(db, productId, allocations);
  return c.json({ success: true, data: { productId, totalStock: total } });
});

// ── Update inventory ──
inventoryRoutes.put('/:id', zValidator('json', updateInventorySchema), async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const [inventory] = await db
    .update(schema.inventories)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(schema.inventories.id, id))
    .returning();
  if (!inventory) return c.json({ error: 'Inventory not found' }, 404);
  return c.json({ success: true, data: inventory });
});

// ── Soft-delete inventory ──
inventoryRoutes.delete('/:id', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const [inventory] = await db
    .update(schema.inventories)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(schema.inventories.id, id))
    .returning();
  if (!inventory) return c.json({ error: 'Inventory not found' }, 404);
  return c.json({ success: true, message: 'Inventory deactivated' });
});

// ── Per-inventory stock list ──
inventoryRoutes.get('/:id/stock', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const { page, limit, offset } = parsePagination(c.req.query());
  const search = c.req.query('search');

  const conditions: SQL[] = [eq(schema.inventoryStock.inventoryId, id)];
  if (search) conditions.push(like(schema.products.name, `%${search}%`));
  const where = and(...conditions);

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        productId: schema.products.id,
        name: schema.products.name,
        sku: schema.products.sku,
        image: schema.products.image,
        price: schema.products.price,
        cost: schema.products.cost,
        quantity: schema.inventoryStock.quantity,
        updatedAt: schema.inventoryStock.updatedAt,
      })
      .from(schema.inventoryStock)
      .innerJoin(schema.products, eq(schema.products.id, schema.inventoryStock.productId))
      .where(where)
      .orderBy(desc(schema.inventoryStock.quantity))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.inventoryStock)
      .innerJoin(schema.products, eq(schema.products.id, schema.inventoryStock.productId))
      .where(where),
  ]);

  const total = countRow?.count ?? 0;
  return c.json({
    success: true,
    data: rows,
    meta: { total, page, totalPages: Math.ceil(total / limit), limit },
  });
});

// ── Report: revenue / cost / profit per product over a time range ──
// :id may be 'all' to aggregate every inventory (incl. unassigned rows).
inventoryRoutes.get('/:id/report', async (c) => {
  const { id } = c.req.param();
  const from = c.req.query('from'); // YYYY-MM-DD
  const to = c.req.query('to'); // YYYY-MM-DD
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const fromStr = from && dateRe.test(from) ? `${from}T00:00:00.000Z` : '1970-01-01T00:00:00.000Z';
  const toStr = to && dateRe.test(to) ? `${to}T23:59:59.999Z` : '9999-12-31T23:59:59.999Z';

  const db = createDb();
  const all = id === 'all';

  // Sold = orders that are confirmed or beyond (excludes pending/cancelled/refunded)
  const soldStatuses = ['confirmed', 'processing', 'shipped', 'delivered'];
  const soldStatusList = soldStatuses.map((s) => `'${s}'`).join(', ');

  const salesQuery = db.execute(sql`
    SELECT
      p.id AS product_id,
      p.name,
      p.sku,
      p.cost AS unit_cost,
      SUM(oi.quantity) AS qty_sold,
      SUM(oi.price * oi.quantity) AS revenue,
      SUM(COALESCE(oi.cost, p.cost, 0) * oi.quantity) AS cost_total,
      SUM(oi.price * oi.quantity) - SUM(COALESCE(oi.cost, p.cost, 0) * oi.quantity) AS profit,
      CAST(SUM(oi.price * oi.quantity) AS float8) / SUM(oi.quantity) AS avg_sale_price
    FROM "order_item" oi
    JOIN "order" o ON o.id = oi.order_id
    JOIN "product" p ON p.id = oi.product_id
    WHERE o.created_at >= ${fromStr} AND o.created_at <= ${toStr}
      AND o.status IN (${soldStatusList})
      ${all ? sql`` : sql`AND oi.inventory_id = ${id}`}
    GROUP BY p.id, p.name, p.sku, p.cost
    ORDER BY revenue DESC
  `);

  const stockQuery = db.execute(sql`
    SELECT COALESCE(SUM(s.quantity), 0) AS units, COALESCE(SUM(s.quantity * COALESCE(p.cost, 0)), 0) AS value
    FROM "inventory_stock" s JOIN "product" p ON p.id = s.product_id
    ${all ? sql`` : sql`WHERE s.inventory_id = ${id}`}
  `);

  const perProductStockQuery = db.execute(sql`
    SELECT product_id, SUM(quantity) AS qty FROM "inventory_stock"
    ${all ? sql`` : sql`WHERE inventory_id = ${id}`}
    GROUP BY product_id
  `);

  const [salesResult, stockResult, perProductStockResult] = await Promise.all([
    salesQuery,
    stockQuery,
    perProductStockQuery,
  ]);

  type SalesRow = {
    product_id: string;
    name: string;
    sku: string | null;
    unit_cost: number | null;
    qty_sold: number;
    revenue: number;
    cost_total: number;
    profit: number;
    avg_sale_price: number;
  };

  const sales = salesResult as unknown as SalesRow[];
  const stock = (stockResult[0] ?? null) as { units: number; value: number } | null;
  const perProductStock = perProductStockResult as unknown as {
    product_id: string;
    qty: number;
  }[];

  const stockMap = indexBy(perProductStock, (r) => r.product_id);

  const rows = sales.map((r) => ({
    ...r,
    current_stock: stockMap.get(r.product_id)?.qty ?? 0,
  }));

  const totalRevenue = rows.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const totalCost = rows.reduce((s, r) => s + (r.cost_total ?? 0), 0);
  const unitsSold = rows.reduce((s, r) => s + (r.qty_sold ?? 0), 0);
  const profit = totalRevenue - totalCost;

  return c.json({
    success: true,
    data: {
      summary: {
        units_sold: unitsSold,
        revenue: totalRevenue,
        cost: totalCost,
        profit,
        margin: totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0,
        stock_units: stock?.units ?? 0,
        stock_value: stock?.value ?? 0,
      },
      rows,
      range: { from: from ?? null, to: to ?? null },
      inventoryId: id,
    },
  });
});
