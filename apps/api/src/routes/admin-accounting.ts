import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { and, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';

import type { Env } from '@/types/env';
import type { AuthVariables } from '@/middleware/auth';
import { createDb } from '@/db';
import * as schema from '@/db/schema';
import { toNum } from '@/lib/numbers';
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

  const total = toNum(countRow?.count);
  return c.json({
    success: true,
    data: rows,
    meta: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
      totalAmount: toNum(sumRow?.total),
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
  return c.json({
    success: true,
    data: rows.map((row) => ({
      ...row,
      // SUM() arrives as a string — coerce so `due > 0` comparisons and
      // client-side arithmetic behave.
      totalPurchased: toNum(row.totalPurchased),
      totalPaid: toNum(row.totalPaid),
      due: toNum(row.due),
    })),
  });
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
  // Must go through sql.join: a plain interpolated string would be sent as ONE
  // bind parameter, so `status IN ('a, b, c')` would match nothing and every
  // figure in this report would silently read 0.
  const soldStatusList = sql.join(
    soldStatuses.map((s) => sql`${s}`),
    sql`, `
  );

  const [salesResult, orderTotalsResult, expensesResult, purchasesResult] = await Promise.all([
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
    // Inventory bought from suppliers. Only the amount actually PAID is a cost
    // (cash out); the unpaid remainder is a liability (due), not an expense yet.
    db.execute(sql`
      SELECT
        COALESCE(SUM(total_amount), 0) AS purchases,
        COALESCE(SUM(paid_amount), 0) AS paid
      FROM "purchase"
      WHERE date >= ${fromDate} AND date <= ${toDate}
    `),
  ]);

  // `?detail=1` adds row-level data for the Excel export: a per-order P&L,
  // per-product profitability and the purchase/dues ledger for the period.
  const wantDetail = c.req.query('detail') === '1';
  const [orderDetailResult, productDetailResult, purchaseDetailResult] = wantDetail
    ? await Promise.all([
        db.execute(sql`
          SELECT
            o.order_number,
            o.created_at,
            o.status,
            COALESCE(u.name, o.guest_name, 'Guest') AS customer,
            o.payment_method,
            o.payment_status,
            o.subtotal,
            o.discount,
            o.shipping_cost,
            o.tax,
            o.total,
            COALESCE(items.units, 0) AS units,
            COALESCE(items.revenue, 0) AS revenue,
            COALESCE(items.cogs, 0) AS cogs
          FROM "order" o
          LEFT JOIN "user" u ON u.id = o.user_id
          LEFT JOIN (
            SELECT oi.order_id,
                   SUM(oi.quantity) AS units,
                   SUM(oi.price * oi.quantity) AS revenue,
                   SUM(COALESCE(oi.cost, p.cost, 0) * oi.quantity) AS cogs
            FROM "order_item" oi
            JOIN "product" p ON p.id = oi.product_id
            GROUP BY oi.order_id
          ) items ON items.order_id = o.id
          WHERE o.created_at >= ${fromStr} AND o.created_at <= ${toStr}
            AND o.status IN (${soldStatusList})
          ORDER BY o.created_at DESC
          LIMIT 20000
        `),
        db.execute(sql`
          SELECT
            p.name,
            p.sku,
            SUM(oi.quantity) AS qty_sold,
            SUM(oi.price * oi.quantity) AS revenue,
            SUM(COALESCE(oi.cost, p.cost, 0) * oi.quantity) AS cogs
          FROM "order_item" oi
          JOIN "order" o ON o.id = oi.order_id
          JOIN "product" p ON p.id = oi.product_id
          WHERE o.created_at >= ${fromStr} AND o.created_at <= ${toStr}
            AND o.status IN (${soldStatusList})
          GROUP BY p.id, p.name, p.sku
          ORDER BY revenue DESC
        `),
        db.execute(sql`
          SELECT
            s.name AS supplier,
            pu.description,
            pu.date,
            pu.total_amount,
            pu.paid_amount
          FROM "purchase" pu
          JOIN "supplier" s ON s.id = pu.supplier_id
          WHERE pu.date >= ${fromDate} AND pu.date <= ${toDate}
          ORDER BY pu.date DESC
        `),
      ])
    : [null, null, null];

  type SalesRow = { revenue: unknown; cogs: unknown; units_sold: unknown };
  type OrderTotalsRow = { order_count: unknown; shipping_income: unknown; discounts_given: unknown };
  type ExpenseRow = { category: string; total: unknown };
  type PurchasesRow = { purchases: unknown; paid: unknown };

  const sales = (salesResult[0] ?? null) as SalesRow | null;
  const orderTotals = (orderTotalsResult[0] ?? null) as OrderTotalsRow | null;
  const purchasesRow = (purchasesResult[0] ?? null) as PurchasesRow | null;
  const purchaseTotal = toNum(purchasesRow?.purchases);
  const supplierPayments = toNum(purchasesRow?.paid);

  // What was actually paid to suppliers is a cost; `purchaseTotal` is only
  // reported so the UI can show bought vs paid vs still due.
  const expenseRows: { category: string; total: number }[] = (
    expensesResult as unknown as ExpenseRow[]
  ).map((row) => ({
    category: row.category,
    total: toNum(row.total),
  }));
  if (supplierPayments > 0) {
    expenseRows.push({ category: 'Supplier Payments', total: supplierPayments });
    expenseRows.sort((a, b) => b.total - a.total);
  }

  const revenue = toNum(sales?.revenue);
  const cogs = toNum(sales?.cogs);
  const grossProfit = revenue - cogs;
  const totalExpenses = expenseRows.reduce((sum, row) => sum + row.total, 0);

  // Row-level detail for the workbook. Coerced here because the driver returns
  // SUM() results as strings.
  const orderRows = ((orderDetailResult ?? []) as unknown as Record<string, unknown>[]).map((r) => {
    const orderRevenue = toNum(r.revenue);
    const orderCogs = toNum(r.cogs);
    return {
      orderNumber: String(r.order_number ?? ''),
      date: String(r.created_at ?? ''),
      customer: String(r.customer ?? 'Guest'),
      status: String(r.status ?? ''),
      paymentMethod: (r.payment_method as string | null) ?? null,
      paymentStatus: (r.payment_status as string | null) ?? null,
      units: toNum(r.units),
      revenue: orderRevenue,
      cogs: orderCogs,
      grossProfit: orderRevenue - orderCogs,
      margin: orderRevenue > 0 ? ((orderRevenue - orderCogs) / orderRevenue) * 100 : 0,
      shipping: toNum(r.shipping_cost),
      discount: toNum(r.discount),
      tax: toNum(r.tax),
      total: toNum(r.total),
    };
  });

  const productRows = ((productDetailResult ?? []) as unknown as Record<string, unknown>[]).map(
    (r) => {
      const productRevenue = toNum(r.revenue);
      const productCogs = toNum(r.cogs);
      return {
        name: String(r.name ?? ''),
        sku: (r.sku as string | null) ?? null,
        qtySold: toNum(r.qty_sold),
        revenue: productRevenue,
        cogs: productCogs,
        grossProfit: productRevenue - productCogs,
        margin: productRevenue > 0 ? ((productRevenue - productCogs) / productRevenue) * 100 : 0,
      };
    }
  );

  const purchaseRows = ((purchaseDetailResult ?? []) as unknown as Record<string, unknown>[]).map(
    (r) => {
      const total = toNum(r.total_amount);
      const paid = toNum(r.paid_amount);
      return {
        supplier: String(r.supplier ?? ''),
        description: (r.description as string | null) ?? null,
        date: String(r.date ?? ''),
        total,
        paid,
        due: total - paid,
      };
    }
  );

  return c.json({
    success: true,
    data: {
      revenue,
      cogs,
      grossProfit,
      shippingIncome: toNum(orderTotals?.shipping_income),
      discountsGiven: toNum(orderTotals?.discounts_given),
      expensesByCategory: expenseRows,
      totalExpenses,
      // `supplierPayments` is already inside totalExpenses (deducted).
      // `purchaseTotal` is informational — goods bought, paid or not.
      purchaseTotal,
      supplierPayments,
      netProfit: grossProfit - totalExpenses,
      orderCount: toNum(orderTotals?.order_count),
      unitsSold: toNum(sales?.units_sold),
      ...(wantDetail ? { orderRows, productRows, purchaseRows } : {}),
      range: { from: from ?? null, to: to ?? null },
    },
  });
});
