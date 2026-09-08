import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { and, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';

import type { Env } from '@/types/env';
import type { AuthVariables } from '@/middleware/auth';
import { createDb } from '@/db';
import * as schema from '@/db/schema';
import { parsePagination } from '@/lib/pagination';

/**
 * Admin accounting routes — mounted inside adminApp at /api/admin/accounting.
 * Covers expenses, suppliers/purchases (dues) and the P&L report.
 */
export const accountingRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const dateSchema = z.string().regex(dateRe, 'Expected YYYY-MM-DD');

// ── Expenses ──
const expenseSchema = z.object({
  category: z.string().min(1).max(100),
  amount: z.number().int().positive(),
  note: z.string().max(1000).nullable().optional(),
  date: dateSchema,
});

accountingRoutes.get('/expenses', async (c) => {
  const db = createDb();
  const { page, limit, offset } = parsePagination(c.req.query());
  const from = c.req.query('from');
  const to = c.req.query('to');

  const conditions: SQL[] = [];
  if (from && dateRe.test(from)) conditions.push(gte(schema.expenses.date, from));
  if (to && dateRe.test(to)) conditions.push(lte(schema.expenses.date, to));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [countRow], [sumRow]] = await Promise.all([
    db
      .select()
      .from(schema.expenses)
      .where(where)
      .orderBy(desc(schema.expenses.date), desc(schema.expenses.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.expenses)
      .where(where),
    db
      .select({ total: sql<number>`COALESCE(SUM(${schema.expenses.amount}), 0)` })
      .from(schema.expenses)
      .where(where),
  ]);

  const total = countRow?.count ?? 0;
  return c.json({
    success: true,
    data: rows,
    meta: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
      totalAmount: sumRow?.total ?? 0,
    },
  });
});

accountingRoutes.post('/expenses', zValidator('json', expenseSchema), async (c) => {
  const db = createDb();
  const body = c.req.valid('json');
  const now = new Date().toISOString();
  const [expense] = await db
    .insert(schema.expenses)
    .values({
      id: crypto.randomUUID(),
      category: body.category,
      amount: body.amount,
      note: body.note ?? null,
      date: body.date,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return c.json({ success: true, data: expense }, 201);
});

accountingRoutes.put('/expenses/:id', zValidator('json', expenseSchema.partial()), async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const [expense] = await db
    .update(schema.expenses)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(schema.expenses.id, id))
    .returning();
  if (!expense) return c.json({ error: 'Expense not found' }, 404);
  return c.json({ success: true, data: expense });
});

accountingRoutes.delete('/expenses/:id', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const deleted = await db.delete(schema.expenses).where(eq(schema.expenses.id, id)).returning();
  if (deleted.length === 0) return c.json({ error: 'Expense not found' }, 404);
  return c.json({ success: true, message: 'Expense deleted' });
});

// ── Suppliers (with purchase aggregates in one query) ──
const supplierSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
});

accountingRoutes.get('/suppliers', async (c) => {
  const db = createDb();
  const rows = await db
    .select({
      id: schema.suppliers.id,
      name: schema.suppliers.name,
      phone: schema.suppliers.phone,
      address: schema.suppliers.address,
      note: schema.suppliers.note,
      isActive: schema.suppliers.isActive,
      createdAt: schema.suppliers.createdAt,
      totalPurchased: sql<number>`COALESCE(SUM(${schema.purchases.totalAmount}), 0)`,
      totalPaid: sql<number>`COALESCE(SUM(${schema.purchases.paidAmount}), 0)`,
      due: sql<number>`COALESCE(SUM(${schema.purchases.totalAmount} - ${schema.purchases.paidAmount}), 0)`,
    })
    .from(schema.suppliers)
    .leftJoin(schema.purchases, eq(schema.purchases.supplierId, schema.suppliers.id))
    .groupBy(schema.suppliers.id)
    .orderBy(desc(schema.suppliers.createdAt))
    .limit(1000);
  return c.json({ success: true, data: rows });
});

accountingRoutes.post('/suppliers', zValidator('json', supplierSchema), async (c) => {
  const db = createDb();
  const body = c.req.valid('json');
  const now = new Date().toISOString();
  const [supplier] = await db
    .insert(schema.suppliers)
    .values({
      id: crypto.randomUUID(),
      name: body.name,
      phone: body.phone ?? null,
      address: body.address ?? null,
      note: body.note ?? null,
      isActive: body.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return c.json({ success: true, data: supplier }, 201);
});

accountingRoutes.put('/suppliers/:id', zValidator('json', supplierSchema.partial()), async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const [supplier] = await db
    .update(schema.suppliers)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(schema.suppliers.id, id))
    .returning();
  if (!supplier) return c.json({ error: 'Supplier not found' }, 404);
  return c.json({ success: true, data: supplier });
});

accountingRoutes.delete('/suppliers/:id', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const [supplier] = await db
    .update(schema.suppliers)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(schema.suppliers.id, id))
    .returning();
  if (!supplier) return c.json({ error: 'Supplier not found' }, 404);
  return c.json({ success: true, message: 'Supplier deactivated' });
});

// ── Purchases ──
const purchaseSchema = z.object({
  supplierId: z.string().min(1),
  description: z.string().max(500).nullable().optional(),
  totalAmount: z.number().int().positive(),
  paidAmount: z.number().int().min(0).default(0),
  date: dateSchema,
});

accountingRoutes.get('/suppliers/:id/purchases', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const rows = await db
    .select()
    .from(schema.purchases)
    .where(eq(schema.purchases.supplierId, id))
    .orderBy(desc(schema.purchases.date), desc(schema.purchases.createdAt))
    .limit(1000);
  return c.json({ success: true, data: rows });
});

accountingRoutes.post('/purchases', zValidator('json', purchaseSchema), async (c) => {
  const db = createDb();
  const body = c.req.valid('json');
  if (body.paidAmount > body.totalAmount) {
    return c.json({ error: 'Paid amount cannot exceed total amount' }, 400);
  }
  const now = new Date().toISOString();
  const [purchase] = await db
    .insert(schema.purchases)
    .values({
      id: crypto.randomUUID(),
      supplierId: body.supplierId,
      description: body.description ?? null,
      totalAmount: body.totalAmount,
      paidAmount: body.paidAmount,
      date: body.date,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return c.json({ success: true, data: purchase }, 201);
});

accountingRoutes.put(
  '/purchases/:id',
  zValidator('json', purchaseSchema.partial().omit({ supplierId: true })),
  async (c) => {
    const db = createDb();
    const { id } = c.req.param();
    const body = c.req.valid('json');
    const [existing] = await db
      .select()
      .from(schema.purchases)
      .where(eq(schema.purchases.id, id))
      .limit(1);
    if (!existing) return c.json({ error: 'Purchase not found' }, 404);
    const totalAmount = body.totalAmount ?? existing.totalAmount;
    const paidAmount = body.paidAmount ?? existing.paidAmount;
    if (paidAmount > totalAmount) {
      return c.json({ error: 'Paid amount cannot exceed total amount' }, 400);
    }
    const [purchase] = await db
      .update(schema.purchases)
      .set({ ...body, updatedAt: new Date().toISOString() })
      .where(eq(schema.purchases.id, id))
      .returning();
    return c.json({ success: true, data: purchase });
  }
);

// ── P&L report ──
accountingRoutes.get('/pnl', async (c) => {
  const from = c.req.query('from');
  const to = c.req.query('to');
  const fromStr = from && dateRe.test(from) ? `${from}T00:00:00.000Z` : '1970-01-01T00:00:00.000Z';
  const toStr = to && dateRe.test(to) ? `${to}T23:59:59.999Z` : '9999-12-31T23:59:59.999Z';
  const fromDate = from && dateRe.test(from) ? from : '1970-01-01';
  const toDate = to && dateRe.test(to) ? to : '9999-12-31';

  const db = createDb();
  const soldStatuses = ['confirmed', 'processing', 'shipped', 'delivered'];
  const soldStatusList = soldStatuses.map((s) => `'${s}'`).join(', ');

  const [salesResult, orderTotalsResult, expensesResult] = await Promise.all([
    // Revenue + COGS from line items
    db.execute(sql`
      SELECT
        COALESCE(SUM(oi.price * oi.quantity), 0) AS revenue,
        COALESCE(SUM(COALESCE(oi.cost, p.cost, 0) * oi.quantity), 0) AS cogs,
        COALESCE(SUM(oi.quantity), 0) AS units_sold
      FROM "order_item" oi
      JOIN "order" o ON o.id = oi.order_id
      JOIN "product" p ON p.id = oi.product_id
      WHERE o.created_at >= ${fromStr} AND o.created_at <= ${toStr} AND o.status IN (${soldStatusList})
    `),
    // Shipping income + discounts given + order count
    db.execute(sql`
      SELECT
        COUNT(*) AS order_count,
        COALESCE(SUM(shipping_cost), 0) AS shipping_income,
        COALESCE(SUM(discount), 0) AS discounts_given
      FROM "order"
      WHERE created_at >= ${fromStr} AND created_at <= ${toStr} AND status IN (${soldStatusList})
    `),
    // Operating expenses grouped by category
    db.execute(sql`
      SELECT category, COALESCE(SUM(amount), 0) AS total
      FROM "expense"
      WHERE date >= ${fromDate} AND date <= ${toDate}
      GROUP BY category
      ORDER BY total DESC
    `),
  ]);

  type SalesRow = { revenue: number; cogs: number; units_sold: number };
  type OrderTotalsRow = { order_count: number; shipping_income: number; discounts_given: number };
  type ExpenseRow = { category: string; total: number };

  const sales = (salesResult[0] ?? null) as SalesRow | null;
  const orderTotals = (orderTotalsResult[0] ?? null) as OrderTotalsRow | null;
  const expenseRows = expensesResult as unknown as ExpenseRow[];

  const revenue = sales?.revenue ?? 0;
  const cogs = sales?.cogs ?? 0;
  const grossProfit = revenue - cogs;
  const totalExpenses = expenseRows.reduce((sum, row) => sum + (row.total ?? 0), 0);

  return c.json({
    success: true,
    data: {
      revenue,
      cogs,
      grossProfit,
      shippingIncome: orderTotals?.shipping_income ?? 0,
      discountsGiven: orderTotals?.discounts_given ?? 0,
      expensesByCategory: expenseRows,
      totalExpenses,
      netProfit: grossProfit - totalExpenses,
      orderCount: orderTotals?.order_count ?? 0,
      unitsSold: sales?.units_sold ?? 0,
      range: { from: from ?? null, to: to ?? null },
    },
  });
});
