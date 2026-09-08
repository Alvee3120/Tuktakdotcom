import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { eq, sql, desc, and, like, or, inArray, count, not, ne, type SQL } from 'drizzle-orm';

import { requireAuth, requireRole, requirePermission } from '@/middleware/auth';
import type { Env } from '@/types/env';
import type { AuthVariables } from '@/middleware/auth';
import {
  createDb,
  contactMessages,
  newsletterSubscribers,
  settings,
  blogPosts,
} from '@/db';
import { indexBy } from '@/lib/collections';
import { ALLOWED_IMAGE_TYPES } from '@/lib/images';
import { getNewsTickerConfig } from '@/lib/news-ticker';
import { invalidateSetting } from '@/lib/settings-cache';
import { getStorage } from '@/lib/storage';
import { parsePagination } from '@/lib/pagination';
import { recalculateProductRating } from '@/lib/ratings';
import * as schema from '@/db/schema';
import { createAuth } from '@/lib/auth';
import { inventoryRoutes, applyProductAllocations } from './admin-inventory';
import { fraudRoutes } from './admin-fraud';
import { accountingRoutes } from './admin-accounting';
import { sendOrderStatusEmail, sendTemplatePreview } from '@/lib/email';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/order-status';
import { OrderService } from '@/services/order-service';

const adminApp = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/** Trigger Next.js on-demand revalidation for a specific ISR tag.
 * Mirrors the news-ticker pattern: the Worker calls the frontend's
 * /revalidate route server-to-server so the secret never reaches the browser. */
async function revalidateStorefront(
  c: { env: { REVALIDATE_SECRET?: string; APP_URL?: string } },
  tag: string
) {
  if (!c.env.REVALIDATE_SECRET || !c.env.APP_URL) return;
  try {
    await fetch(
      `${c.env.APP_URL}/revalidate?secret=${encodeURIComponent(c.env.REVALIDATE_SECRET)}&tag=${tag}&path=/`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(`Revalidation failed for tag ${tag}:`, err);
  }
}

// ── Apply auth + role guard to all admin routes ──
adminApp.use('*', requireAuth, requireRole('admin', 'moderator'));

// ── Permission / admin-only gating ──
// Moderators may only touch modules they were granted via `permissions`
// (keys from MODERATOR_PAGES). Everything else is admin-only.
adminApp.use('/orders*', requirePermission('orders'));
adminApp.use('/transactions*', requirePermission('transactions'));
adminApp.use('/users*', requirePermission('customers'));
adminApp.use('/products*', requirePermission('products'));
adminApp.use('/upload', requirePermission('products'));
adminApp.use('/variant-types*', requirePermission('products'));
adminApp.use('/variant-options*', requirePermission('products'));
adminApp.use('/categories*', requirePermission('categories'));
adminApp.use('/inventories*', requirePermission('inventory'));
adminApp.use('/reviews*', requirePermission('reviews'));
adminApp.use('/contact-messages*', requirePermission('contact'));
adminApp.use('/blog-posts*', requirePermission('blog'));
adminApp.use('/coupons*', requirePermission('coupon'));

// Sections outside MODERATOR_PAGES stay admin-only.
adminApp.use('/settings*', requireRole('admin'));
adminApp.use('/moderators*', requireRole('admin'));
adminApp.use('/news-ticker', requireRole('admin'));
adminApp.use('/hero-slides*', requireRole('admin'));
adminApp.use('/analytics*', requireRole('admin'));
adminApp.use('/newsletter-subscribers*', requireRole('admin'));
adminApp.use('/brands*', requireRole('admin'));
adminApp.use('/fraud*', requireRole('admin'));
adminApp.use('/accounting*', requireRole('admin'));
// Stats (revenue/order/user aggregates incl. PII-adjacent lists), email test
// (sends REAL emails via Resend) and email logs (customer addresses) must not
// be reachable by moderators.
adminApp.use('/stats', requireRole('admin'));
adminApp.use('/email-test', requireRole('admin'));
adminApp.use('/email-logs', requireRole('admin'));

// ── Current-user context (for the admin UI sidebar / guards) ──
adminApp.get('/me', async (c) => {
  const user = c.var.user;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const db = createDb();
  const [row] = await db
    .select({ permissions: schema.users.permissions })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1);

  let permissions: string[] = [];
  if (row?.permissions) {
    try {
      const parsed = JSON.parse(row.permissions);
      if (Array.isArray(parsed)) permissions = parsed as string[];
    } catch {
      permissions = [];
    }
  }

  return c.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.role === 'admin' ? MODERATOR_PAGES.map((p) => p.key) : permissions,
    },
  });
});

// ── Inventory Management ──
adminApp.route('/inventories', inventoryRoutes);

// ── Fraud Protection ──
adminApp.route('/fraud', fraudRoutes);

// ── Accounting ──
adminApp.route('/accounting', accountingRoutes);

// ── News Ticker (Top Bar) ──
// Admin-managed top-bar ticker stored as JSON in `settings.key === 'newsTicker'`.
// Exposed to the storefront via the public GET /api/news-ticker (app.ts).
const newsTickerSchema = z.object({
  enabled: z.boolean().default(false),
  text: z.string().max(500),
  textBn: z.string().max(2000).nullable().optional(),
  link: z.string().max(2048).nullable().optional(),
  linkLabel: z.string().max(100).nullable().optional(),
  phone: z.string().max(40).default(''),
  announcements: z.array(z.string().max(200)).default([]),
  announcementsBn: z.array(z.string().max(400)).default([]),
});

adminApp.get('/news-ticker', async (c) => {
  const db = createDb();
  const config = await getNewsTickerConfig(db);
  return c.json({ success: true, data: config });
});

adminApp.put('/news-ticker', zValidator('json', newsTickerSchema), async (c) => {
  const db = createDb();
  const body = c.req.valid('json');
  const value = JSON.stringify(body);
  const now = new Date().toISOString();
  const existing = await db
    .select({ key: settings.key })
    .from(settings)
    .where(eq(settings.key, 'newsTicker'))
    .limit(1);
  if (existing.length) {
    await db.update(settings).set({ value, updatedAt: now }).where(eq(settings.key, 'newsTicker'));
  } else {
    await db.insert(settings).values({ key: 'newsTicker', value, updatedAt: now });
  }
  invalidateSetting('newsTicker');

  // Best-effort on-demand revalidation of the storefront so the ticker update
  // is visible immediately (no manual cache purge). The Worker calls the Next
  // frontend's /revalidate route server-to-server — the secret stays on the edge.
  await revalidateStorefront(c, 'news-ticker');

  return c.json({ success: true, data: body });
});

// ── Dashboard Stats ──
adminApp.get('/stats', async (c) => {
  const db = createDb();
  // Start of the 7-day window (today inclusive, UTC to match date() on stored ISO strings)
  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString();

  const [
    totalProducts,
    totalOrders,
    totalUsers,
    totalRevenue,
    recentOrders,
    lowStockProducts,
    outOfStock,
    statusRows,
    dailyRows,
    recentTransactions,
    bestSellers,
    [newsletterRow],
    newCustomers,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.products)
      .where(eq(schema.products.isActive, true)),
    db.select({ count: sql<number>`count(*)` }).from(schema.orders),
    db.select({ count: sql<number>`count(*)` }).from(schema.users),
    db
      .select({ total: sql<number>`COALESCE(SUM(${schema.orders.total}), 0)` })
      .from(schema.orders)
      .where(eq(schema.orders.status, 'delivered')),
    db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(5),
    db
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.isActive, true),
          sql`${schema.products.stock} < ${schema.products.lowStockThreshold}`
        )
      )
      .orderBy(schema.products.stock)
      .limit(10),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.products)
      .where(and(eq(schema.products.isActive, true), eq(schema.products.stock, 0))),
    db
      .select({ status: schema.orders.status, count: sql<number>`count(*)` })
      .from(schema.orders)
      .groupBy(schema.orders.status),
    db
      .select({
        day: sql<string>`date(${schema.orders.createdAt})`,
        revenue: sql<number>`COALESCE(SUM(${schema.orders.total}), 0)`,
        orders: sql<number>`count(*)`,
      })
      .from(schema.orders)
      .where(sql`${schema.orders.createdAt} >= ${weekStartStr}`)
      .groupBy(sql`date(${schema.orders.createdAt})`)
      .orderBy(sql`date(${schema.orders.createdAt})`),
    db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        status: schema.orders.status,
        total: schema.orders.total,
        paymentMethod: schema.orders.paymentMethod,
        paymentStatus: schema.orders.paymentStatus,
        createdAt: schema.orders.createdAt,
        customerName: schema.users.name,
      })
      .from(schema.orders)
      .leftJoin(schema.users, eq(schema.orders.userId, schema.users.id))
      .orderBy(desc(schema.orders.createdAt))
      .limit(5),
    db
      .select({
        productId: schema.orderItems.productId,
        name: schema.products.name,
        image: schema.products.image,
        price: schema.products.price,
        stock: schema.products.stock,
        sold: sql<number>`COALESCE(SUM(${schema.orderItems.quantity}), 0)`,
        revenue: sql<number>`COALESCE(SUM(${schema.orderItems.price} * ${schema.orderItems.quantity}), 0)`,
      })
      .from(schema.orderItems)
      .innerJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
      .groupBy(
        schema.orderItems.productId,
        schema.products.name,
        schema.products.image,
        schema.products.price,
        schema.products.stock
      )
      .orderBy(desc(sql`COALESCE(SUM(${schema.orderItems.quantity}), 0)`))
      .limit(5),
    db.select({ count: sql<number>`count(*)` }).from(newsletterSubscribers),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(sql`${schema.users.createdAt} >= ${weekStartStr}`),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const row of statusRows) statusCounts[row.status] = row.count;

  // Fill in the last 7 days so the chart always has 7 points
  const dailyMap = indexBy(dailyRows, (r) => r.day);
  const weeklySeries: { day: string; revenue: number; orders: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    const row = dailyMap.get(key);
    weeklySeries.push({ day: key, revenue: row?.revenue ?? 0, orders: row?.orders ?? 0 });
  }

  return c.json({
    success: true,
    data: {
      totalProducts: totalProducts[0]?.count ?? 0,
      totalOrders: totalOrders[0]?.count ?? 0,
      totalUsers: totalUsers[0]?.count ?? 0,
      totalRevenue: totalRevenue[0]?.total ?? 0,
      recentOrders,
      lowStockProducts,
      outOfStockCount: outOfStock[0]?.count ?? 0,
      statusCounts,
      weeklySeries,
      recentTransactions,
      bestSellers,
      newsletterCount: newsletterRow?.count ?? 0,
      newCustomersThisWeek: newCustomers[0]?.count ?? 0,
    },
  });
});

// ── Role-aware Dashboard Stats ──
// Admin gets everything. Moderators get data scoped to their granted permissions.
// This is the endpoint the Dashboard page calls; /stats remains admin-only for
// PII-heavy data (revenue, customer lists, email logs).
adminApp.get('/dashboard', async (c) => {
  const user = c.var.user;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const db = createDb();
  const isAdmin = user.role === 'admin';

  // Resolve moderator permissions (admins bypass).
  let granted = new Set<string>();
  if (!isAdmin) {
    const [row] = await db
      .select({ permissions: schema.users.permissions })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1);
    if (row?.permissions) {
      try {
        const parsed = JSON.parse(row.permissions);
        if (Array.isArray(parsed)) granted = new Set(parsed as string[]);
      } catch { /* empty */ }
    }
  }

  const has = (key: string) => isAdmin || granted.has(key);

  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString();

  // Parallel queries — only fetch what the user can see.
  const queries: Promise<unknown>[] = [];

  // Always: basic counts for the stat cards
  if (has('orders')) {
    queries.push(
      db.select({ count: sql<number>`count(*)` }).from(schema.orders),
      db
        .select({ status: schema.orders.status, count: sql<number>`count(*)` })
        .from(schema.orders)
        .groupBy(schema.orders.status),
      db
        .select({
          day: sql<string>`date(${schema.orders.createdAt})`,
          revenue: sql<number>`COALESCE(SUM(${schema.orders.total}), 0)`,
          orders: sql<number>`count(*)`,
        })
        .from(schema.orders)
        .where(sql`${schema.orders.createdAt} >= ${weekStartStr}`)
        .groupBy(sql`date(${schema.orders.createdAt})`)
        .orderBy(sql`date(${schema.orders.createdAt})`),
      db
        .select({
          id: schema.orders.id,
          orderNumber: schema.orders.orderNumber,
          status: schema.orders.status,
          total: schema.orders.total,
          createdAt: schema.orders.createdAt,
          customerName: schema.users.name,
        })
        .from(schema.orders)
        .leftJoin(schema.users, eq(schema.orders.userId, schema.users.id))
        .orderBy(desc(schema.orders.createdAt))
        .limit(5),
    );
  } else {
    // Placeholder slots so Promise.all indices stay consistent
    queries.push(
      Promise.resolve([{ count: 0 }]),
      Promise.resolve([]),
      Promise.resolve([]),
      Promise.resolve([]),
    );
  }

  if (has('products')) {
    queries.push(
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.products)
        .where(eq(schema.products.isActive, true)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.products)
        .where(and(eq(schema.products.isActive, true), eq(schema.products.stock, 0))),
      db
        .select()
        .from(schema.products)
        .where(
          and(
            eq(schema.products.isActive, true),
            sql`${schema.products.stock} < ${schema.products.lowStockThreshold}`
          )
        )
        .orderBy(schema.products.stock)
        .limit(10),
      db
        .select({
          productId: schema.orderItems.productId,
          name: schema.products.name,
          image: schema.products.image,
          price: schema.products.price,
          stock: schema.products.stock,
          sold: sql<number>`COALESCE(SUM(${schema.orderItems.quantity}), 0)`,
          revenue: sql<number>`COALESCE(SUM(${schema.orderItems.price} * ${schema.orderItems.quantity}), 0)`,
        })
        .from(schema.orderItems)
        .innerJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
        .groupBy(
          schema.orderItems.productId,
          schema.products.name,
          schema.products.image,
          schema.products.price,
          schema.products.stock
        )
        .orderBy(desc(sql`COALESCE(SUM(${schema.orderItems.quantity}), 0)`))
        .limit(5),
    );
  } else {
    queries.push(
      Promise.resolve([{ count: 0 }]),
      Promise.resolve([{ count: 0 }]),
      Promise.resolve([]),
      Promise.resolve([]),
    );
  }

  if (has('customers')) {
    queries.push(
      db.select({ count: sql<number>`count(*)` }).from(schema.users),
    );
  } else {
    queries.push(Promise.resolve([{ count: 0 }]));
  }

  if (has('transactions')) {
    queries.push(
      db
        .select({
          id: schema.orders.id,
          orderNumber: schema.orders.orderNumber,
          status: schema.orders.status,
          total: schema.orders.total,
          paymentMethod: schema.orders.paymentMethod,
          paymentStatus: schema.orders.paymentStatus,
          createdAt: schema.orders.createdAt,
          customerName: schema.users.name,
        })
        .from(schema.orders)
        .leftJoin(schema.users, eq(schema.orders.userId, schema.users.id))
        .orderBy(desc(schema.orders.createdAt))
        .limit(5),
    );
  } else {
    queries.push(Promise.resolve([]));
  }

  const results = await Promise.all(queries);

  // Unpack results in order
  let idx = 0;
  const totalOrders = has('orders') ? (results[idx++] as { count: number }[])[0]?.count ?? 0 : 0;
  const statusRows = has('orders') ? (results[idx++] as { status: string; count: number }[]) : [];
  const dailyRows = has('orders')
    ? (results[idx++] as { day: string; revenue: number; orders: number }[])
    : [];
  const recentOrders = has('orders') ? (results[idx++] as Record<string, unknown>[]) : [];
  const totalProducts = has('products') ? (results[idx++] as { count: number }[])[0]?.count ?? 0 : 0;
  const outOfStock = has('products') ? (results[idx++] as { count: number }[])[0]?.count ?? 0 : 0;
  const lowStockProducts = has('products') ? (results[idx++] as Record<string, unknown>[]) : [];
  const bestSellers = has('products') ? (results[idx++] as Record<string, unknown>[]) : [];
  const totalUsers = has('customers') ? (results[idx++] as { count: number }[])[0]?.count ?? 0 : 0;
  const recentTransactions = has('transactions') ? (results[idx++] as Record<string, unknown>[]) : [];

  // Revenue (admin-only — financial data)
  let totalRevenue = 0;
  if (isAdmin) {
    const [rev] = await db
      .select({ total: sql<number>`COALESCE(SUM(${schema.orders.total}), 0)` })
      .from(schema.orders)
      .where(eq(schema.orders.status, 'delivered'));
    totalRevenue = rev?.total ?? 0;
  }

  const statusCounts: Record<string, number> = {};
  for (const row of statusRows) statusCounts[row.status] = row.count;

  const dailyMap = indexBy(dailyRows, (r) => r.day);
  const weeklySeries: { day: string; revenue: number; orders: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    const row = dailyMap.get(key);
    weeklySeries.push({ day: key, revenue: row?.revenue ?? 0, orders: row?.orders ?? 0 });
  }

  return c.json({
    success: true,
    data: {
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue,
      recentOrders,
      lowStockProducts,
      outOfStockCount: outOfStock,
      statusCounts,
      weeklySeries,
      recentTransactions,
      bestSellers,
      newsletterCount: 0,
      newCustomersThisWeek: 0,
    },
  });
});

// Accepts absolute URLs or uploaded relative paths (/api/images/...)
const imageRef = z
  .string()
  .min(1)
  .max(2048)
  .refine((v) => v.startsWith('/') || /^https?:\/\//.test(v), {
    message: 'Must be a URL or an uploaded image path',
  });

// ── Product CRUD ──
const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  sku: z.string().max(255).nullable().optional(),
  weight: z.number().int().min(0).nullable().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().nullable().optional(),
  cost: z.number().int().min(0).nullable().optional(),
  stock: z.number().int().min(0),
  categoryId: z.string().nullable().optional(),
  brandId: z.string().nullable().optional(),
  image: imageRef,
  images: z.array(imageRef).max(20).optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  inventoryAllocations: z
    .array(z.object({ inventoryId: z.string().min(1), quantity: z.number().int().min(0) }))
    .max(50)
    .optional(),
});

const updateProductSchema = createProductSchema.partial();

adminApp.get('/products', async (c) => {
  const db = createDb();
  const { page, limit, offset } = parsePagination(c.req.query());
  const search = c.req.query('search');
  const active = c.req.query('active');
  const category = c.req.query('category');
  const conditions: SQL[] = [];
  if (search) conditions.push(like(schema.products.name, `%${search}%`));
  if (active !== undefined && active !== null) {
    conditions.push(eq(schema.products.isActive, active === 'true'));
  }
  if (category) conditions.push(eq(schema.products.categoryId, category));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [products, [countResult]] = await Promise.all([
    db
      .select()
      .from(schema.products)
      .where(where)
      .orderBy(desc(schema.products.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.products)
      .where(where),
  ]);
  const total = countResult?.count ?? 0;
  return c.json({
    success: true,
    data: products,
    meta: { total, page, totalPages: Math.ceil(total / limit), limit },
  });
});

adminApp.post('/products', zValidator('json', createProductSchema), async (c) => {
  const db = createDb();
  const body = c.req.valid('json');
  const now = new Date().toISOString();
  const [product] = await db
    .insert(schema.products)
    .values({
      id: crypto.randomUUID(),
      name: body.name,
      slug: body.slug,
      sku: body.sku ?? null,
      weight: body.weight ?? null,
      lowStockThreshold: body.lowStockThreshold ?? 5,
      description: body.description ?? null,
      shortDescription: body.shortDescription ?? null,
      price: body.price,
      compareAtPrice: body.compareAtPrice ?? null,
      cost: body.cost ?? null,
      stock: body.stock,
      categoryId: body.categoryId ?? null,
      brandId: body.brandId ?? null,
      image: body.image,
      images: body.images ? JSON.stringify(body.images) : null,
      isActive: body.isActive,
      isFeatured: body.isFeatured,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (body.inventoryAllocations && body.inventoryAllocations.length > 0) {
    await applyProductAllocations(db, product.id, body.inventoryAllocations);
    product.stock = body.inventoryAllocations.reduce((s, a) => s + a.quantity, 0);
  }
  await revalidateStorefront(c, 'product');
  return c.json({ success: true, data: product }, 201);
});

adminApp.put('/products/:id', zValidator('json', updateProductSchema), async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const { inventoryAllocations, ...fields } = body;

  // Clean up old R2 files when replacing images. Only delete gallery objects
  // when `images` is explicitly provided; an omitted `images` field means "keep
  // the existing gallery" — deleting files the DB still references would break
  // the stored image URLs.
  if (body.images !== undefined || body.image) {
    const [existingProduct] = await db
      .select({ images: schema.products.images, image: schema.products.image })
      .from(schema.products)
      .where(eq(schema.products.id, id))
      .limit(1);
    if (existingProduct) {
      let oldImages: string[] = [];
      if (existingProduct.images) {
        try {
          oldImages = JSON.parse(existingProduct.images);
        } catch {
          /* ignore */
        }
      }
      // The effective new gallery is the provided one when given, otherwise the
      // existing gallery (unchanged) — so the main-image check below never
      // treats a still-referenced image as removable.
      const newImageSet = new Set(body.images !== undefined ? body.images : oldImages);
      if (body.images !== undefined) {
        const storage = getStorage();
        for (const oldImg of oldImages) {
          if (oldImg.startsWith('/api/images/') && !newImageSet.has(oldImg)) {
            const oldKey = oldImg.replace('/api/images/', '');
            try {
              await storage.delete(oldKey);
            } catch {
              /* ignore cleanup errors */
            }
          }
        }
      }
      // The main product image is stored separately — clean the previous one
      // when it is replaced and no longer referenced by the gallery.
      const oldMain = existingProduct.image;
      if (
        body.image &&
        oldMain &&
        oldMain.startsWith('/api/images/') &&
        oldMain !== body.image &&
        !newImageSet.has(oldMain)
      ) {
        try {
          await getStorage().delete(oldMain.replace('/api/images/', ''));
        } catch {
          /* ignore cleanup errors */
        }
      }
    }
  }

  const updateData: Record<string, unknown> = { ...fields, updatedAt: new Date().toISOString() };
  if (body.images) updateData.images = JSON.stringify(body.images);
  const [product] = await db
    .update(schema.products)
    .set(updateData)
    .where(eq(schema.products.id, id))
    .returning();
  if (!product) return c.json({ error: 'Product not found' }, 404);
  if (inventoryAllocations !== undefined) {
    product.stock = await applyProductAllocations(db, id, inventoryAllocations);
  }
  await revalidateStorefront(c, 'product');
  return c.json({ success: true, data: product });
});

adminApp.delete('/products/:id', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const [product] = await db
    .update(schema.products)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(schema.products.id, id))
    .returning();
  if (!product) return c.json({ error: 'Product not found' }, 404);
  await revalidateStorefront(c, 'product');
  return c.json({ success: true, message: 'Product deactivated' });
});

// ── Image Upload ──
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

adminApp.post('/upload', async (c) => {
  const form = await c.req.formData();
  const file = form.get('file');
  const folder = (form.get('folder') as string) || 'products';
  if (!file || typeof file === 'string') return c.json({ error: 'No file provided' }, 400);
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext)
    return c.json({ error: 'Unsupported image type. Use JPG, PNG, WebP, GIF or AVIF.' }, 400);
  if (file.size > MAX_UPLOAD_BYTES) return c.json({ error: 'Image must be 5MB or smaller' }, 400);
  const safeFolder = ['products', 'categories', 'avatars', 'hero', 'blog'].includes(folder)
    ? folder
    : 'products';
  const key = `${safeFolder}/${crypto.randomUUID()}.${ext}`;
  await getStorage().put(key, await file.arrayBuffer(), file.type);
  // Relative path — served via GET /api/images/* (same-origin through the Next.js rewrite)
  return c.json({ success: true, data: { url: `/api/images/${key}`, key } }, 201);
});

// ── Product Detail (with variants + inventory allocations, for the admin edit page) ──
adminApp.get('/products/:id', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const [product] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, id))
    .limit(1);
  if (!product) return c.json({ error: 'Product not found' }, 404);
  const [variants] = await Promise.all([
    db
      .select()
      .from(schema.productVariants)
      .where(eq(schema.productVariants.productId, id))
      .orderBy(schema.productVariants.createdAt),
  ]);
  let allocations: { inventoryId: string; quantity: number }[] = [];
  try {
    allocations = await db
      .select({
        inventoryId: schema.inventoryStock.inventoryId,
        quantity: schema.inventoryStock.quantity,
      })
      .from(schema.inventoryStock)
      .where(eq(schema.inventoryStock.productId, id));
  } catch {
    /* inventory_stock table may not exist */
  }
  let images: string[];
  try {
    images = product.images ? JSON.parse(product.images) : [];
  } catch {
    images = [];
  }
  return c.json({
    success: true,
    data: { ...product, images, variants, inventoryAllocations: allocations },
  });
});

// ── Product Variants (full replace/sync) ──
const variantInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(255),
  sku: z.string().max(100).nullable().optional(),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().nullable().optional(),
  cost: z.number().int().min(0).nullable().optional(),
  stock: z.number().int().min(0).default(0),
  image: imageRef.nullable().optional(),
  isActive: z.boolean().default(true),
});

adminApp.put(
  '/products/:id/variants',
  zValidator('json', z.object({ variants: z.array(variantInputSchema).max(50) })),
  async (c) => {
    const db = createDb();
    const { id } = c.req.param();
    const { variants } = c.req.valid('json');
    const [product] = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.id, id))
      .limit(1);
    if (!product) return c.json({ error: 'Product not found' }, 404);

    const existing = await db
      .select({ id: schema.productVariants.id, image: schema.productVariants.image })
      .from(schema.productVariants)
      .where(eq(schema.productVariants.productId, id));
    const existingById = new Map(existing.map((e) => [e.id, e]));
    const existingIds = new Set(existing.map((e) => e.id));
    const incomingIds = new Set(variants.filter((v) => v.id).map((v) => v.id!));
    const toDelete = [...existingIds].filter((eid) => !incomingIds.has(eid));
    const now = new Date().toISOString();

    // SKU uniqueness pre-check — the schema has a GLOBAL unique index on sku,
    // so fail fast with a friendly 400 (instead of a raw constraint 500 after
    // the delete has already been applied) when an incoming SKU already exists
    // elsewhere. Also reject duplicate SKUs within the same payload.
    const skus = variants.map((v) => v.sku?.trim()).filter((s): s is string => !!s);
    if (skus.length > 0) {
      const dupes = skus.filter((s, i) => skus.indexOf(s) !== i);
      if (dupes.length > 0) {
        return c.json({ error: `Duplicate SKUs in payload: ${dupes.join(', ')}` }, 400);
      }
      const keptIds = [...incomingIds];
      const [collision] = keptIds.length
        ? await db
            .select({ sku: schema.productVariants.sku })
            .from(schema.productVariants)
            .where(
              and(
                inArray(schema.productVariants.sku, skus),
                not(inArray(schema.productVariants.id, keptIds))
              )
            )
            .limit(1)
        : await db
            .select({ sku: schema.productVariants.sku })
            .from(schema.productVariants)
            .where(inArray(schema.productVariants.sku, skus))
            .limit(1);
      if (collision) {
        return c.json(
          { error: `SKU "${collision.sku}" is already in use by another variant.` },
          400
        );
      }
    }

    // Atomic full-replace: soft-delete FK-referenced variants, hard-delete
    // safe ones, upsert the rest, and mirror product.stock — all in ONE
    // db.batch so a mid-payload failure can never leave half applied.
    // Find which toDelete IDs are referenced by order_items (FK enforced by D1).
    let referencedDeleteIds = new Set<string>();
    if (toDelete.length > 0) {
      const refs = await db
        .selectDistinct({ variantId: schema.orderItems.variantId })
        .from(schema.orderItems)
        .where(inArray(schema.orderItems.variantId, toDelete));
      referencedDeleteIds = new Set(
        refs.map((r) => r.variantId).filter((id): id is string => !!id)
      );
    }
    const toHardDelete = toDelete.filter((vid) => !referencedDeleteIds.has(vid));
    const toSoftDelete = toDelete.filter((vid) => referencedDeleteIds.has(vid));

    // Atomic full-replace: soft-delete FK-referenced variants, hard-delete
    // safe ones, upsert the rest, and mirror product.stock — all inside a
    // single Postgres transaction so a mid-payload failure rolls everything back.
    const variantTotal = variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);

    await db.transaction(async (tx) => {
      if (toHardDelete.length > 0) {
        await tx.delete(schema.productVariants).where(inArray(schema.productVariants.id, toHardDelete));
      }
      if (toSoftDelete.length > 0) {
        await tx
          .update(schema.productVariants)
          .set({ isActive: false, sku: null, image: null, updatedAt: now })
          .where(inArray(schema.productVariants.id, toSoftDelete));
      }

      for (const v of variants) {
        const values = {
          name: v.name,
          sku: v.sku?.trim() || null,
          price: v.price,
          compareAtPrice: v.compareAtPrice ?? null,
          cost: v.cost ?? null,
          stock: v.stock,
          image: v.image ?? null,
          isActive: v.isActive,
          updatedAt: now,
        };
        if (v.id && existingIds.has(v.id)) {
          await tx
            .update(schema.productVariants)
            .set(values)
            .where(eq(schema.productVariants.id, v.id));
        } else {
          await tx.insert(schema.productVariants).values({
            ...values,
            id: crypto.randomUUID(),
            productId: id,
            attributes: null,
            createdAt: now,
          });
        }
      }

      await tx
        .update(schema.products)
        .set({ stock: variantTotal, updatedAt: now })
        .where(eq(schema.products.id, id));
    });

    // Best-effort cleanup of images left behind by removed variants
    // (both hard-deleted and soft-deleted had their images cleared).
    const allRemovedIds = [...toHardDelete, ...toSoftDelete];
    if (allRemovedIds.length > 0) {
      c.executionCtx.waitUntil(
        Promise.all(
          allRemovedIds
            .map((eid) => existingById.get(eid)?.image)
            .filter((img): img is string => !!img && img.startsWith('/api/images/'))
            .map((img) => getStorage().delete(img.replace('/api/images/', '')))
        ).catch((err) => console.error('[storage] Failed to delete removed variant images:', err))
      );
    }

    const updated = await db
      .select()
      .from(schema.productVariants)
      .where(eq(schema.productVariants.productId, id))
      .orderBy(schema.productVariants.createdAt);
    return c.json({ success: true, data: updated });
  }
);

// ── Order Management ──
const updateOrderSchema = z.object({ status: z.enum(ORDER_STATUSES) });

adminApp.get('/orders', async (c) => {
  const db = createDb();
  const { page, limit, offset } = parsePagination(c.req.query());
  const status = c.req.query('status') as OrderStatus | undefined;
  const search = c.req.query('search');
  const conditions: SQL[] = [];
  if (status) conditions.push(eq(schema.orders.status, status));
  if (search) {
    const term = `%${search}%`;
    conditions.push(
      or(
        like(schema.orders.orderNumber, term),
        like(schema.orders.paymentTransactionId, term),
        like(schema.orders.guestName, term),
        like(schema.orders.guestEmail, term),
        like(schema.orders.guestPhone, term)
      )!
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [orders, [countResult], statusRows] = await Promise.all([
    db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        status: schema.orders.status,
        subtotal: schema.orders.subtotal,
        discount: schema.orders.discount,
        shippingCost: schema.orders.shippingCost,
        tax: schema.orders.tax,
        total: schema.orders.total,
        paymentMethod: schema.orders.paymentMethod,
        paymentStatus: schema.orders.paymentStatus,
        paymentTransactionId: schema.orders.paymentTransactionId,
        couponCode: schema.orders.couponCode,
        notes: schema.orders.notes,
        riskScore: schema.orders.riskScore,
        riskFlags: schema.orders.riskFlags,
        createdAt: schema.orders.createdAt,
        userId: schema.orders.userId,
        customerName: schema.users.name,
        customerEmail: schema.users.email,
        customerImage: schema.users.image,
        guestName: schema.orders.guestName,
        guestEmail: schema.orders.guestEmail,
        guestPhone: schema.orders.guestPhone,
      })
      .from(schema.orders)
      .leftJoin(schema.users, eq(schema.orders.userId, schema.users.id))
      .where(where)
      .orderBy(desc(schema.orders.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.orders)
      .where(where),
    db
      .select({ status: schema.orders.status, count: sql<number>`count(*)` })
      .from(schema.orders)
      .groupBy(schema.orders.status),
  ]);
  // Attach line items (product name/image) to each order in one batch query
  const orderIds = orders.map((o) => o.id);
  const items =
    orderIds.length > 0
      ? await db
          .select()
          .from(schema.orderItems)
          .where(inArray(schema.orderItems.orderId, orderIds))
      : [];
  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }
  const data = orders.map((o) => ({ ...o, items: itemsByOrder.get(o.id) ?? [] }));
  const statusCounts: Record<string, number> = {};
  for (const row of statusRows) statusCounts[row.status] = row.count;
  const total = countResult?.count ?? 0;
  return c.json({
    success: true,
    data,
    meta: { total, page, totalPages: Math.ceil(total / limit), limit, statusCounts },
  });
});

adminApp.get('/orders/:id', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const [order] = await db
    .select({
      id: schema.orders.id,
      orderNumber: schema.orders.orderNumber,
      status: schema.orders.status,
      subtotal: schema.orders.subtotal,
      discount: schema.orders.discount,
      shippingCost: schema.orders.shippingCost,
      tax: schema.orders.tax,
      total: schema.orders.total,
      paymentMethod: schema.orders.paymentMethod,
      paymentStatus: schema.orders.paymentStatus,
      paymentTransactionId: schema.orders.paymentTransactionId,
      couponCode: schema.orders.couponCode,
      notes: schema.orders.notes,
      createdAt: schema.orders.createdAt,
      updatedAt: schema.orders.updatedAt,
      shippingAddressId: schema.orders.shippingAddressId,
      invoiceAccessToken: schema.orders.invoiceAccessToken,
      voucherNumber: schema.orders.voucherNumber,
      voucherQrKey: schema.orders.voucherQrKey,
      customerId: schema.users.id,
      customerName: schema.users.name,
      customerEmail: schema.users.email,
      customerImage: schema.users.image,
      customerPhone: schema.users.phone,
      guestName: schema.orders.guestName,
      guestEmail: schema.orders.guestEmail,
      guestPhone: schema.orders.guestPhone,
      shippingSnapshot: schema.orders.shippingSnapshot,
    })
    .from(schema.orders)
    .leftJoin(schema.users, eq(schema.orders.userId, schema.users.id))
    .where(or(eq(schema.orders.id, id), eq(schema.orders.orderNumber, id)))
    .limit(1);
  if (!order) return c.json({ error: 'Order not found' }, 404);
  const [items, address] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id)),
    order.shippingAddressId
      ? db
          .select()
          .from(schema.addresses)
          .where(eq(schema.addresses.id, order.shippingAddressId))
          .limit(1)
      : Promise.resolve([]),
  ]);
  return c.json({ success: true, data: { ...order, items, shippingAddress: address[0] ?? null } });
});

adminApp.patch('/orders/:id/status', zValidator('json', updateOrderSchema), async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const { status } = c.req.valid('json');

  const ORDER_STATUS_TRANSITIONS: Record<string, OrderStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['pending', 'processing', 'cancelled'],
    processing: ['confirmed', 'shipped', 'cancelled'],
    shipped: ['processing', 'delivered'],
    delivered: ['shipped', 'refunded'],
    cancelled: ['pending'],
    refunded: ['pending'],
  };

  const [currentOrder] = await db
    .select({ status: schema.orders.status })
    .from(schema.orders)
    .where(eq(schema.orders.id, id))
    .limit(1);
  if (!currentOrder) return c.json({ error: 'Order not found' }, 404);

  const allowed = ORDER_STATUS_TRANSITIONS[currentOrder.status];
  if (!allowed || !allowed.includes(status)) {
    return c.json(
      { error: `Invalid status transition from ${currentOrder.status} to ${status}` },
      400
    );
  }

  let order;
  // Cancel/refund must give back every stock reservation (product total +
  // inventory + variant pool) and roll back coupon usage — atomically. The
  // transition map above is only a coarse guard; the service re-checks the
  // status inside the batch so concurrent cancels can never double-restore.
  // The guard must match the order's CURRENT status (not the transition map's
  // destination list) — otherwise a pending order could never be cancelled
  // because 'pending' is not among its own destinations.
  //
  // Reversing a cancelled/refunded order back to an active status requires
  // re-deducting stock (inverse of the restore that happened on cancel/refund).
  if (status === 'cancelled' || status === 'refunded') {
    const service = new OrderService(db);
    const result = await service.adminCancel(id, [currentOrder.status], status);
    if (!result.ok) {
      return c.json({ error: result.error }, (result.status ?? 409) as 400 | 409);
    }
    order = result.data.order;
  } else if (currentOrder.status === 'cancelled' || currentOrder.status === 'refunded') {
    // Reversing a cancelled/refunded order — re-deduct stock and coupon.
    const service = new OrderService(db);
    const result = await service.reverseCancel(id, [currentOrder.status], status);
    if (!result.ok) {
      return c.json({ error: result.error }, (result.status ?? 409) as 400 | 409);
    }
    order = result.data.order;
  } else {
    const [updated] = await db
      .update(schema.orders)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(schema.orders.id, id))
      .returning();
    order = updated;
  }

  // Send email notification asynchronously (don't block the response)
  try {
    // Fetch order with customer details via join
    const [orderWithCustomer] = await db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        status: schema.orders.status,
        total: schema.orders.total,
        shippingAddressId: schema.orders.shippingAddressId,
        customerEmail: schema.users.email,
        customerName: schema.users.name,
        guestEmail: schema.orders.guestEmail,
        guestName: schema.orders.guestName,
      })
      .from(schema.orders)
      .leftJoin(schema.users, eq(schema.orders.userId, schema.users.id))
      .where(eq(schema.orders.id, id))
      .limit(1);

    const customerEmail = orderWithCustomer?.customerEmail || orderWithCustomer?.guestEmail;
    const customerName =
      orderWithCustomer?.customerName || orderWithCustomer?.guestName || 'Customer';
    if (customerEmail) {
      // Send email in background — waitUntil keeps the isolate alive so the
      // fetch isn't dropped when the response returns (correct pattern per orders.ts:60).
      c.executionCtx.waitUntil(
        sendOrderStatusEmail(c.env, {
          orderId: orderWithCustomer.orderNumber || orderWithCustomer.id,
          customerEmail,
          customerName,
          status,
        }).catch((err) => console.error('[EMAIL] Failed to send order status email:', err))
      );
    }
  } catch (err) {
    console.error('[EMAIL] Error preparing order status email:', err);
  }

  return c.json({ success: true, data: order });
});

// ── Transactions (payment view over orders) ──
const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']),
});

adminApp.get('/transactions', async (c) => {
  const db = createDb();
  const { page, limit, offset } = parsePagination(c.req.query());
  const paymentStatus = c.req.query('paymentStatus') as
    'pending' | 'paid' | 'failed' | 'refunded' | undefined;
  const method = c.req.query('method') as 'bkash' | 'nagad' | 'sslcommerz' | 'cod' | undefined;
  const search = c.req.query('search');
  const conditions: SQL[] = [];
  if (paymentStatus) conditions.push(eq(schema.orders.paymentStatus, paymentStatus));
  if (method) conditions.push(eq(schema.orders.paymentMethod, method));
  if (search) {
    const term = `%${search}%`;
    conditions.push(
      or(like(schema.orders.paymentTransactionId, term), like(schema.orders.orderNumber, term))!
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [rows, [countResult], statusRows, methodRows, [revenueRow]] = await Promise.all([
    db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        status: schema.orders.status,
        total: schema.orders.total,
        paymentMethod: schema.orders.paymentMethod,
        paymentStatus: schema.orders.paymentStatus,
        paymentTransactionId: schema.orders.paymentTransactionId,
        createdAt: schema.orders.createdAt,
        customerName: schema.users.name,
        customerEmail: schema.users.email,
        customerImage: schema.users.image,
      })
      .from(schema.orders)
      .leftJoin(schema.users, eq(schema.orders.userId, schema.users.id))
      .where(where)
      .orderBy(desc(schema.orders.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.orders)
      .where(where),
    db
      .select({ paymentStatus: schema.orders.paymentStatus, count: sql<number>`count(*)` })
      .from(schema.orders)
      .groupBy(schema.orders.paymentStatus),
    db
      .select({
        paymentMethod: schema.orders.paymentMethod,
        count: sql<number>`count(*)`,
        total: sql<number>`COALESCE(SUM(${schema.orders.total}), 0)`,
      })
      .from(schema.orders)
      .groupBy(schema.orders.paymentMethod),
    db
      .select({ total: sql<number>`COALESCE(SUM(${schema.orders.total}), 0)` })
      .from(schema.orders)
      .where(eq(schema.orders.paymentStatus, 'paid')),
  ]);
  // Attach products so each transaction can be traced back to what was bought
  const orderIds = rows.map((r) => r.id);
  const items =
    orderIds.length > 0
      ? await db
          .select()
          .from(schema.orderItems)
          .where(inArray(schema.orderItems.orderId, orderIds))
      : [];
  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }
  const data = rows.map((r) => ({ ...r, items: itemsByOrder.get(r.id) ?? [] }));
  const paymentStatusCounts: Record<string, number> = {};
  for (const row of statusRows) paymentStatusCounts[row.paymentStatus] = row.count;
  const methodBreakdown = methodRows.map((m) => ({
    method: m.paymentMethod ?? 'unknown',
    count: m.count,
    total: m.total,
  }));
  const total = countResult?.count ?? 0;
  return c.json({
    success: true,
    data,
    meta: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
      paymentStatusCounts,
      methodBreakdown,
      paidRevenue: revenueRow?.total ?? 0,
    },
  });
});

adminApp.patch(
  '/transactions/:id/payment-status',
  zValidator('json', updatePaymentStatusSchema),
  async (c) => {
    const db = createDb();
    const { id } = c.req.param();
    const { paymentStatus } = c.req.valid('json');

    const PAYMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
      pending: ['paid', 'failed'],
      paid: ['pending', 'refunded'],
      failed: ['pending'],
      refunded: ['paid'],
    };

    const [currentOrder] = await db
      .select({ paymentStatus: schema.orders.paymentStatus })
      .from(schema.orders)
      .where(eq(schema.orders.id, id))
      .limit(1);
    if (!currentOrder) return c.json({ error: 'Order not found' }, 404);

    const allowed = PAYMENT_STATUS_TRANSITIONS[currentOrder.paymentStatus];
    if (!allowed || !allowed.includes(paymentStatus)) {
      return c.json({ error: 'Invalid payment status transition' }, 400);
    }

    const [order] = await db
      .update(schema.orders)
      .set({ paymentStatus, updatedAt: new Date().toISOString() })
      .where(eq(schema.orders.id, id))
      .returning();
    return c.json({ success: true, data: order });
  }
);

// ── User Management ──
adminApp.get('/users', async (c) => {
  const db = createDb();
  const { page, limit, offset } = parsePagination(c.req.query());
  const search = c.req.query('search');
  const where = search
    ? or(like(schema.users.name, `%${search}%`), like(schema.users.email, `%${search}%`))
    : undefined;
  const [users, [countResult]] = await Promise.all([
    db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        image: schema.users.image,
        role: schema.users.role,
        banned: schema.users.banned,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(where)
      .orderBy(desc(schema.users.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(where),
  ]);
  return c.json({
    success: true,
    data: users,
    meta: {
      total: countResult?.count ?? 0,
      page,
      totalPages: Math.ceil((countResult?.count ?? 0) / limit),
      limit,
    },
  });
});

adminApp.patch('/users/:id/ban', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const actor = c.var.user;
  if (!actor) return c.json({ error: 'Unauthorized' }, 401);
  const user = await db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!user.length) return c.json({ error: 'User not found' }, 404);
  // Moderators (even with the `customers` permission) must not be able to
  // suspend admins, other moderators, or themselves.
  if (actor.role !== 'admin' && (user[0].role !== 'customer' || user[0].id === actor.id)) {
    return c.json({ error: 'Forbidden: you cannot moderate this account' }, 403);
  }
  const [updated] = await db
    .update(schema.users)
    .set({
      banned: !user[0].banned,
      banReason: user[0].banned ? null : 'Suspended by admin',
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.users.id, id))
    .returning();
  return c.json({ success: true, data: { id: updated.id, banned: updated.banned } });
});

// ── Customer Orders ──
adminApp.get('/users/:id/orders', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const { page, limit, offset } = parsePagination(c.req.query(), { limit: 10 });

  // Verify user exists
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  if (!user) return c.json({ error: 'User not found' }, 404);

  const [orders, [countResult]] = await Promise.all([
    db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        status: schema.orders.status,
        total: schema.orders.total,
        paymentMethod: schema.orders.paymentMethod,
        paymentStatus: schema.orders.paymentStatus,
        createdAt: schema.orders.createdAt,
        updatedAt: schema.orders.updatedAt,
      })
      .from(schema.orders)
      .where(eq(schema.orders.userId, id))
      .orderBy(desc(schema.orders.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.orders)
      .where(eq(schema.orders.userId, id)),
  ]);

  // Fetch items for each order
  const orderIds = orders.map((o) => o.id);
  type ItemRow = {
    orderId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    imageUrl: string;
  };
  const allItems: ItemRow[] = orderIds.length
    ? await db
        .select({
          orderId: schema.orderItems.orderId,
          productName: schema.orderItems.name,
          quantity: schema.orderItems.quantity,
          unitPrice: schema.orderItems.price,
          imageUrl: schema.orderItems.image,
        })
        .from(schema.orderItems)
        .where(inArray(schema.orderItems.orderId, orderIds))
    : [];

  // Group items by order
  const itemsByOrder = new Map<string, ItemRow[]>();
  for (const item of allItems) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  const data = orders.map((o) => ({
    ...o,
    items: itemsByOrder.get(o.id) || [],
  }));

  return c.json({
    success: true,
    data,
    meta: {
      total: countResult?.count ?? 0,
      page,
      totalPages: Math.ceil((countResult?.count ?? 0) / limit),
      limit,
    },
  });
});

// ── Moderator Management ──
const createModeratorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  permissions: z.array(z.string()).default([]),
});

const updateModeratorSchema = z.object({
  name: z.string().min(1).optional(),
  permissions: z.array(z.string()).optional(),
  banned: z.boolean().optional(),
});

// Available pages/sections moderators can access
export const MODERATOR_PAGES = [
  { key: 'orders', label: 'Orders', section: 'sales' },
  { key: 'transactions', label: 'Transactions', section: 'sales' },
  { key: 'customers', label: 'Customers', section: 'people' },
  { key: 'products', label: 'Products', section: 'catalog' },
  { key: 'categories', label: 'Categories', section: 'catalog' },
  { key: 'inventory', label: 'Inventory', section: 'operations' },
  { key: 'reviews', label: 'Reviews', section: 'catalog' },
  { key: 'contact', label: 'Messages', section: 'people' },
  { key: 'blog', label: 'Blog Posts', section: 'content' },
  { key: 'coupon', label: 'Coupons', section: 'sales' },
];

adminApp.get('/moderators', requireRole('admin'), async (c) => {
  const db = createDb();
  const { page, limit, offset } = parsePagination(c.req.query());
  const search = c.req.query('search');

  const where = search
    ? and(
        eq(schema.users.role, 'moderator'),
        or(like(schema.users.name, `%${search}%`), like(schema.users.email, `%${search}%`))
      )
    : eq(schema.users.role, 'moderator');

  const [moderators, [countResult]] = await Promise.all([
    db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        image: schema.users.image,
        role: schema.users.role,
        permissions: schema.users.permissions,
        banned: schema.users.banned,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(where)
      .orderBy(desc(schema.users.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(where),
  ]);

  return c.json({
    success: true,
    data: moderators,
    meta: {
      total: countResult?.count ?? 0,
      page,
      totalPages: Math.ceil((countResult?.count ?? 0) / limit),
      limit,
    },
  });
});

adminApp.get('/moderators/pages', requireRole('admin'), async (c) => {
  return c.json({ success: true, data: MODERATOR_PAGES });
});

adminApp.post(
  '/moderators',
  requireRole('admin'),
  zValidator('json', createModeratorSchema),
  async (c) => {
    const db = createDb();
    const body = c.req.valid('json');

    // Check if email already exists
    const [existing] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, body.email))
      .limit(1);
    if (existing) return c.json({ error: 'Email already in use' }, 400);

    // Hash password with Better Auth's scrypt hasher so the moderator can
    // actually sign in (the credential account stores its exact format).
    const auth = createAuth(c.env);
    const ctx = await auth.$context;
    const passwordHash = await ctx.password.hash(body.password);

    const now = new Date().toISOString();
    const [moderator] = await db
      .insert(schema.users)
      .values({
        id: crypto.randomUUID(),
        name: body.name,
        email: body.email,
        emailVerified: false,
        role: 'moderator',
        permissions: JSON.stringify(body.permissions),
        banned: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Create account entry for Better Auth
    await db.insert(schema.accounts).values({
      id: crypto.randomUUID(),
      accountId: moderator.id,
      providerId: 'credential',
      password: passwordHash,
      userId: moderator.id,
      createdAt: now,
      updatedAt: now,
    });

    return c.json(
      { success: true, data: { id: moderator.id, name: moderator.name, email: moderator.email } },
      201
    );
  }
);

adminApp.patch(
  '/moderators/:id',
  requireRole('admin'),
  zValidator('json', updateModeratorSchema),
  async (c) => {
    const db = createDb();
    const { id } = c.req.param();
    const body = c.req.valid('json');

    const [existing] = await db
      .select({ id: schema.users.id, role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    if (!existing) return c.json({ error: 'User not found' }, 404);
    if (existing.role !== 'moderator') return c.json({ error: 'User is not a moderator' }, 400);

    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.permissions !== undefined) updateData.permissions = JSON.stringify(body.permissions);
    if (body.banned !== undefined) updateData.banned = body.banned;

    const [updated] = await db
      .update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, id))
      .returning();
    return c.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        permissions: updated.permissions,
        banned: updated.banned,
      },
    });
  }
);

adminApp.delete('/moderators/:id', requireRole('admin'), async (c) => {
  const db = createDb();
  const { id } = c.req.param();

  const [existing] = await db
    .select({ id: schema.users.id, role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  if (!existing) return c.json({ error: 'User not found' }, 404);
  if (existing.role !== 'moderator') return c.json({ error: 'User is not a moderator' }, 400);

  // Delete account entries first
  await db.delete(schema.accounts).where(eq(schema.accounts.userId, id));
  // Delete sessions
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  // Delete user
  await db.delete(schema.users).where(eq(schema.users.id, id));

  return c.json({ success: true });
});

// ── Category Management ──
const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
const updateCategorySchema = createCategorySchema.partial();

adminApp.get('/categories', async (c) => {
  const db = createDb();
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));
  const offset = (page - 1) * limit;
  const [{ count: total }] = await db.select({ count: count() }).from(schema.categories);
  const all = await db
    .select()
    .from(schema.categories)
    .orderBy(schema.categories.sortOrder)
    .limit(limit)
    .offset(offset);
  return c.json({
    success: true,
    data: all,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

adminApp.post('/categories', zValidator('json', createCategorySchema), async (c) => {
  const db = createDb();
  const body = c.req.valid('json');
  if (body.parentId) {
    const [parent] = await db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(eq(schema.categories.id, body.parentId))
      .limit(1);
    if (!parent) return c.json({ error: 'Parent category not found' }, 400);
  }
  const now = new Date().toISOString();
  const [cat] = await db
    .insert(schema.categories)
    .values({
      id: crypto.randomUUID(),
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      image: body.image ?? null,
      parentId: body.parentId ?? null,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  await revalidateStorefront(c, 'category');
  return c.json({ success: true, data: cat }, 201);
});

adminApp.patch('/categories/:id', zValidator('json', updateCategorySchema), async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const body = c.req.valid('json');

  if (body.parentId !== undefined && body.parentId !== null) {
    if (body.parentId === id) {
      return c.json({ error: 'Category cannot be its own parent' }, 400);
    }
    const [parent] = await db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(eq(schema.categories.id, body.parentId))
      .limit(1);
    if (!parent) return c.json({ error: 'Parent category not found' }, 400);

    let ancestorId: string | null = body.parentId;
    for (let depth = 0; depth < 5; depth++) {
      if (!ancestorId) break;
      if (ancestorId === id) {
        return c.json({ error: 'Invalid parentId: would create a circular reference' }, 400);
      }
      const [ancestor] = await db
        .select({ parentId: schema.categories.parentId })
        .from(schema.categories)
        .where(eq(schema.categories.id, ancestorId))
        .limit(1);
      ancestorId = ancestor?.parentId ?? null;
    }
  }

  const [cat] = await db
    .update(schema.categories)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(schema.categories.id, id))
    .returning();
  if (!cat) return c.json({ error: 'Category not found' }, 404);
  await revalidateStorefront(c, 'category');
  return c.json({ success: true, data: cat });
});

adminApp.delete('/categories/:id', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const [cat] = await db
    .update(schema.categories)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(schema.categories.id, id))
    .returning();
  if (!cat) return c.json({ error: 'Category not found' }, 404);
  await revalidateStorefront(c, 'category');
  return c.json({ success: true, message: 'Category deactivated' });
});

// ── Settings Management ──
// Secret keys are masked for non-admin roles; the masked placeholder is never persisted.
const SECRET_SETTING_KEYS = new Set([
  'resendApiKey',
  'metaCapiToken',
  'courierApiKey',
  'whatsapp_access_token',
  'messenger_access_token',
]);
const SECRET_MASK = '••••••••';

// Keys whose changes affect the storefront via the /api/tracking-config endpoint.
const PUBLIC_TRACKING_KEYS = new Set([
  'trackingEnabled',
  'gtmId',
  'ga4Id',
  'metaPixelId',
  'clarityId',
]);

const emailTestSchema = z.object({
  to: z.string().email(),
  template: z
    .enum(['test', 'welcome', 'password-reset', 'order-confirmation', 'order-status'])
    .optional(),
});

// Simple in-memory rate limiter for email-test (5/min per IP) — prevents Resend abuse
const emailTestRateLimit = new Map<string, number[]>();
function checkEmailTestRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = 5;
  const list = emailTestRateLimit.get(ip) || [];
  const recent = list.filter((t) => now - t < windowMs);
  if (recent.length >= max) return false;
  recent.push(now);
  emailTestRateLimit.set(ip, recent);
  // cleanup occasionally
  if (emailTestRateLimit.size > 1000) {
    for (const [k, v] of emailTestRateLimit.entries()) if (v.every((t) => now - t >= windowMs)) emailTestRateLimit.delete(k);
  }
  return true;
}

// POST /api/admin/email-test — send a real Resend test email (any template) to prove delivery.
adminApp.post('/email-test', zValidator('json', emailTestSchema), async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown';
  if (!checkEmailTestRateLimit(ip)) {
    return c.json({ error: 'Too many test emails, please try again in a minute' }, 429);
  }
  const { to, template } = c.req.valid('json');
  const result = await sendTemplatePreview(c.env, { to, template: template || 'test' });
  if (!result.success) {
    return c.json({ error: result.error || 'Failed to send test email' }, 500);
  }
  return c.json({ success: true, message: 'Test email sent' });
});

// GET /api/admin/email-logs — recent sends/failures for the admin Email settings tab.
adminApp.get('/email-logs', async (c) => {
  const db = createDb();
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '30')));
  const rows = await db
    .select()
    .from(schema.emailLogs)
    .orderBy(desc(schema.emailLogs.createdAt))
    .limit(limit);
  return c.json({ success: true, data: rows });
});

adminApp.get('/settings', async (c) => {
  const db = createDb();
  const user = c.var.user!;
  const rows = await db.select().from(settings);
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] =
      SECRET_SETTING_KEYS.has(row.key) && user.role !== 'admin' && row.value
        ? SECRET_MASK
        : row.value;
  }
  return c.json({ success: true, data: map });
});

adminApp.put(
  '/settings',
  zValidator(
    'json',
    z.record(z.string().max(50000)).superRefine((val, ctx) => {
      for (const key of Object.keys(val)) {
        if (key.length < 1 || key.length > 100 || !/^[a-zA-Z0-9_.-]+$/.test(key)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid setting key: ${key}`, path: [key] });
        }
        if (val[key] && val[key].length > 50000) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Value too long for ${key}`, path: [key] });
        }
      }
    })
  ),
  async (c) => {
  const db = createDb();
  const body = c.req.valid('json');
  const now = new Date().toISOString();
  // Ignore masked placeholders echoed back from the UI — keep the stored secret.
  const entries = Object.entries(body).filter(
    ([key, value]) => !(SECRET_SETTING_KEYS.has(key) && value === SECRET_MASK)
  );
  if (entries.length > 0) {
    await db.transaction(async (tx) => {
      for (const [key, value] of entries) {
        await tx
          .insert(settings)
          .values({ key, value, updatedAt: now })
          .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } });
      }
    });
  }

  // Invalidate settings cache so fresh values are fetched on next read
  for (const key of Object.keys(body)) {
    invalidateSetting(key);
  }

  // Best-effort on-demand revalidation -- invalidates Next.js ISR caches so
  // admin settings appear instantly on the storefront instead of waiting
  // for the revalidate window.
  if ('homeConfig' in body) await revalidateStorefront(c, 'home-config');
  if ('menuConfig' in body) await revalidateStorefront(c, 'menu-config');
  if ('paymentMethods' in body || 'shippingMethods' in body || 'taxRate' in body)
    await revalidateStorefront(c, 'checkout-config');
  if ([...PUBLIC_TRACKING_KEYS].some((k) => k in body))
    await revalidateStorefront(c, 'tracking-config');
  if ('customSnippets' in body) await revalidateStorefront(c, 'custom-snippets');

  return c.json({ success: true });
});

// ── Contact Messages ──
adminApp.get('/contact-messages', async (c) => {
  const db = createDb();
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));
  const offset = (page - 1) * limit;
  const [[{ count: total }], messages] = await Promise.all([
    db.select({ count: count() }).from(contactMessages),
    db
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt))
      .limit(limit)
      .offset(offset),
  ]);
  return c.json({
    success: true,
    data: messages,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

adminApp.patch('/contact-messages/:id/read', async (c) => {
  const { id } = c.req.param();
  const db = createDb();
  await db
    .update(contactMessages)
    .set({ isRead: true, updatedAt: new Date().toISOString() })
    .where(eq(contactMessages.id, id));
  return c.json({ success: true });
});

const replySchema = z.object({ reply: z.string().min(1).max(10000) });

adminApp.post('/contact-messages/:id/reply', zValidator('json', replySchema), async (c) => {
  const { id } = c.req.param();
  const { reply } = c.req.valid('json');
  const db = createDb();
  const [msg] = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
  if (!msg) return c.json({ error: 'Message not found' }, 404);
  const sRows = await db.select().from(settings);
  const sMap: Record<string, string> = {};
  for (const row of sRows) sMap[row.key] = row.value;
  const resendKey = sMap.resendApiKey || c.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const fromE = sMap.fromEmail || 'noreply@tuktakdot.com';
      const fromN = sMap.fromName || 'Tuktak';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${fromN} <${fromE}>`,
          to: msg.email,
          subject: `Re: ${msg.subject || 'Your message'} — ${fromN}`,
          html: `<div style="font-family:sans-serif;max-width:600px"><p>Dear ${msg.name},</p><div style="margin:24px 0;padding:16px;background:#f5f5f5;border-radius:8px">${reply.replace(/\n/g, '<br>')}</div><hr style="border:none;border-top:1px solid #eee"><p style="color:#666;font-size:12px">Original message:</p><blockquote style="color:#999;font-size:12px;border-left:2px solid #ddd;padding-left:12px">${msg.message.replace(/\n/g, '<br>')}</blockquote></div>`,
        }),
      });
      if (!res.ok) return c.json({ error: 'Failed to send email' }, 500);
    } catch {
      return c.json({ error: 'Failed to send email' }, 500);
    }
  }
  await db
    .update(contactMessages)
    .set({ repliedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(contactMessages.id, id));
  return c.json({ success: true, message: 'Reply sent' });
});

adminApp.delete('/contact-messages/:id', async (c) => {
  const { id } = c.req.param();
  const db = createDb();
  await db.delete(contactMessages).where(eq(contactMessages.id, id));
  return c.json({ success: true });
});

// ── Analytics ──
adminApp.get('/analytics/overview', async (c) => {
  const period = c.req.query('period') || 'month';
  const now = new Date();
  let fromDate: Date;
  if (period === 'week') {
    fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 7);
  } else if (period === 'month') {
    fromDate = new Date(now);
    fromDate.setMonth(fromDate.getMonth() - 1);
  } else if (period === 'year') {
    fromDate = new Date(now);
    fromDate.setFullYear(fromDate.getFullYear() - 1);
  } else {
    fromDate = new Date(0);
  }
  const fromStr = fromDate.toISOString();

  const db = createDb();

  // All 6 queries are independent — run them all in parallel.
  const [revenueRaw, topProducts, ordersByStatus, paymentMethods, summary, categoryBreakdown] =
    await Promise.all([
      db.execute(sql`
        SELECT date(created_at) as day, COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
        FROM "order" WHERE created_at >= ${fromStr} AND status = 'delivered'
        GROUP BY date(created_at) ORDER BY day ASC
      `),
      db.execute(sql`
        SELECT oi.product_id, p.name, p.image, SUM(oi.quantity) as sold, SUM(oi.price * oi.quantity) as revenue
        FROM "order_item" oi
        JOIN "product" p ON p.id = oi.product_id
        JOIN "order" o ON o.id = oi.order_id
        WHERE o.created_at >= ${fromStr} AND o.status = 'delivered'
        GROUP BY oi.product_id, p.name, p.image ORDER BY revenue DESC LIMIT 10
      `),
      db.execute(sql`
        SELECT status, COUNT(*) as count, COALESCE(SUM(total), 0) as total
        FROM "order" WHERE created_at >= ${fromStr} GROUP BY status
      `),
      db.execute(sql`
        SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total), 0) as total
        FROM "order" WHERE created_at >= ${fromStr} AND payment_method IS NOT NULL
        GROUP BY payment_method
      `),
      db.execute(sql`
        SELECT COUNT(*) as total_orders, COALESCE(SUM(total), 0) as total_revenue,
               COALESCE(AVG(total), 0) as avg_order_value, COUNT(DISTINCT user_id) as unique_customers
        FROM "order" WHERE created_at >= ${fromStr}
      `),
      db.execute(sql`
        SELECT c.name, COUNT(oi.id) as items_sold, COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
        FROM "order_item" oi
        JOIN "product" p ON p.id = oi.product_id
        JOIN "category" c ON c.id = p.category_id
        JOIN "order" o ON o.id = oi.order_id
        WHERE o.created_at >= ${fromStr} AND o.status = 'delivered'
        GROUP BY c.name ORDER BY revenue DESC
      `),
    ]);

  return c.json({
    success: true,
    data: {
      summary: (summary?.[0] ?? {}) as Record<string, unknown>,
      revenueOverTime: revenueRaw as unknown[],
      topProducts: topProducts as unknown[],
      ordersByStatus: ordersByStatus as unknown[],
      paymentMethods: paymentMethods as unknown[],
      categoryBreakdown: categoryBreakdown as unknown[],
      period,
    },
  });
});

// ── Newsletter Subscribers ──
adminApp.get('/newsletter-subscribers', async (c) => {
  const db = createDb();
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));
  const offset = (page - 1) * limit;
  const [[{ count: total }], subs] = await Promise.all([
    db.select({ count: count() }).from(newsletterSubscribers),
    db
      .select()
      .from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.createdAt))
      .limit(limit)
      .offset(offset),
  ]);
  return c.json({
    success: true,
    data: subs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ── Hero Slides ──
const createHeroSlideSchema = z.object({
  title: z.string().max(255).default(''),
  titleBn: z.string().nullish(),
  subtitle: z.string().nullish(),
  subtitleBn: z.string().nullish(),
  description: z.string().nullish(),
  descriptionBn: z.string().nullish(),
  image: z.string().max(2000).default(''),
  backgroundImage: z.string().nullish(),
  mobileBackgroundImage: z.string().nullish(),
  ctaText: z.string().nullish(),
  ctaTextBn: z.string().nullish(),
  ctaLink: z.string().nullish(),
  ctaSecondaryText: z.string().nullish(),
  ctaSecondaryTextBn: z.string().nullish(),
  ctaSecondaryLink: z.string().nullish(),
  overlayColor: z.string().default('from-black/60 to-transparent'),
  textAlign: z.enum(['left', 'center', 'right']).default('left'),
  textColor: z.string().default('#ffffff'),
  badge: z.string().nullish(),
  badgeBn: z.string().nullish(),
  badgeVariant: z.enum(['default', 'secondary', 'destructive', 'outline']).default('default'),
  animation: z
    .enum([
      'fade',
      'top-to-bottom',
      'bottom-to-top',
      'left-to-right',
      'right-to-left',
      'scale-up',
      'zoom-out',
      'parallax',
    ])
    .default('fade'),
  animationDuration: z.number().int().min(200).max(3000).default(700),
  titleFontSize: z.enum(['sm', 'md', 'lg', 'xl']).default('lg'),
  subtitleFontSize: z.enum(['sm', 'md', 'lg', 'xl']).default('md'),
  productId: z.string().nullish(),
  showTrustBadges: z.boolean().default(true),
  showTitle: z.boolean().default(true),
  showSubtitle: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
const updateHeroSlideSchema = createHeroSlideSchema.partial();

adminApp.get('/hero-slides', async (c) => {
  const db = createDb();
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));
  const offset = (page - 1) * limit;
  const [[{ count: total }], slides] = await Promise.all([
    db.select({ count: count() }).from(schema.heroSlides),
    db
      .select()
      .from(schema.heroSlides)
      .orderBy(schema.heroSlides.sortOrder)
      .limit(limit)
      .offset(offset),
  ]);
  return c.json({
    success: true,
    data: slides,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

adminApp.post('/hero-slides', zValidator('json', createHeroSlideSchema), async (c) => {
  const db = createDb();
  const body = c.req.valid('json');
  const now = new Date().toISOString();
  const [slide] = await db
    .insert(schema.heroSlides)
    .values({
      id: crypto.randomUUID(),
      title: body.title,
      titleBn: body.titleBn ?? null,
      subtitle: body.subtitle ?? null,
      subtitleBn: body.subtitleBn ?? null,
      description: body.description ?? null,
      descriptionBn: body.descriptionBn ?? null,
      image: body.image,
      backgroundImage: body.backgroundImage ?? null,
      mobileBackgroundImage: body.mobileBackgroundImage ?? null,
      ctaText: body.ctaText ?? null,
      ctaTextBn: body.ctaTextBn ?? null,
      ctaLink: body.ctaLink ?? null,
      ctaSecondaryText: body.ctaSecondaryText ?? null,
      ctaSecondaryTextBn: body.ctaSecondaryTextBn ?? null,
      ctaSecondaryLink: body.ctaSecondaryLink ?? null,
      overlayColor: body.overlayColor,
      textAlign: body.textAlign,
      textColor: body.textColor,
      badge: body.badge ?? null,
      badgeBn: body.badgeBn ?? null,
      badgeVariant: body.badgeVariant,
      animation: body.animation,
      animationDuration: body.animationDuration ?? 700,
      titleFontSize: body.titleFontSize,
      subtitleFontSize: body.subtitleFontSize,
      productId: body.productId ?? null,
      showTrustBadges: body.showTrustBadges,
      showTitle: body.showTitle,
      showSubtitle: body.showSubtitle,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  await revalidateStorefront(c, 'hero-slides');
  return c.json({ success: true, data: slide }, 201);
});

adminApp.put('/hero-slides/:id', zValidator('json', updateHeroSlideSchema), async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const body = c.req.valid('json');
  // Filter out undefined so only explicitly provided fields are updated.
  // Drizzle .set() skips undefined keys, preserving existing DB values.
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) fields[key] = value;
  }
  if (Object.keys(fields).length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }
  fields.updatedAt = new Date().toISOString();
  try {
    const [slide] = await db
      .update(schema.heroSlides)
      .set(fields)
      .where(eq(schema.heroSlides.id, id))
      .returning();
    if (!slide) return c.json({ error: 'Hero slide not found' }, 404);
    await revalidateStorefront(c, 'hero-slides');
    return c.json({ success: true, data: slide });
  } catch (err) {
    console.error('Failed to update hero slide:', err);
    return c.json({ error: 'Database update failed' }, 500);
  }
});

adminApp.patch(
  '/hero-slides/:id/sort',
  zValidator('json', z.object({ sortOrder: z.number().int().min(0) })),
  async (c) => {
    const { id } = c.req.param();
    const { sortOrder } = c.req.valid('json');
    const db = createDb();
    await db
      .update(schema.heroSlides)
      .set({ sortOrder, updatedAt: new Date().toISOString() })
      .where(eq(schema.heroSlides.id, id));
    await revalidateStorefront(c, 'hero-slides');
    return c.json({ success: true });
  }
);

adminApp.delete('/hero-slides/:id', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  await db.delete(schema.heroSlides).where(eq(schema.heroSlides.id, id));
  await revalidateStorefront(c, 'hero-slides');
  return c.json({ success: true, message: 'Slide deleted' });
});

// ── Blog Management ──
const createBlogSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  image: z.string().optional(),
  author: z.string().optional(),
  tags: z.string().optional(),
  isPublished: z.boolean().default(false),
});
const updateBlogSchema = createBlogSchema.partial();

adminApp.get('/blog-posts', async (c) => {
  const db = createDb();
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));
  const offset = (page - 1) * limit;
  const [[{ count: total }], posts] = await Promise.all([
    db.select({ count: count() }).from(blogPosts),
    db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt)).limit(limit).offset(offset),
  ]);
  return c.json({
    success: true,
    data: posts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

adminApp.post('/blog-posts', zValidator('json', createBlogSchema), async (c) => {
  const db = createDb();
  const body = c.req.valid('json');
  const now = new Date().toISOString();
  const [post] = await db
    .insert(blogPosts)
    .values({
      id: crypto.randomUUID(),
      title: body.title,
      slug: body.slug,
      excerpt: body.excerpt ?? null,
      content: body.content,
      image: body.image ?? null,
      author: body.author ?? 'Tuktak',
      tags: body.tags ?? null,
      isPublished: body.isPublished,
      publishedAt: body.isPublished ? now : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  await revalidateStorefront(c, 'blog');
  return c.json({ success: true, data: post }, 201);
});

adminApp.put('/blog-posts/:id', zValidator('json', updateBlogSchema), async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const updates: Record<string, unknown> = { ...body, updatedAt: new Date().toISOString() };
  const [post] = await db.update(blogPosts).set(updates).where(eq(blogPosts.id, id)).returning();
  if (!post) return c.json({ error: 'Post not found' }, 404);
  await revalidateStorefront(c, 'blog');
  return c.json({ success: true, data: post });
});

adminApp.delete('/blog-posts/:id', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
  await revalidateStorefront(c, 'blog');
  return c.json({ success: true, message: 'Post deleted' });
});

// ── Coupon Management ──
const createCouponSchema = z.object({
  code: z.string().min(1).max(50),
  description: z.string().optional(),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().int().positive(),
  minOrderAmount: z.number().int().min(0).default(0),
  maxDiscountAmount: z.number().int().positive().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});
const updateCouponSchema = createCouponSchema.partial();

adminApp.get('/coupons', async (c) => {
  const db = createDb();
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));
  const offset = (page - 1) * limit;
  const [[{ count: total }], all] = await Promise.all([
    db.select({ count: count() }).from(schema.coupons),
    db
      .select()
      .from(schema.coupons)
      .orderBy(desc(schema.coupons.createdAt))
      .limit(limit)
      .offset(offset),
  ]);
  return c.json({
    success: true,
    data: all,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

adminApp.post('/coupons', zValidator('json', createCouponSchema), async (c) => {
  const db = createDb();
  const body = c.req.valid('json');
  const now = new Date().toISOString();
  const [coupon] = await db
    .insert(schema.coupons)
    .values({
      id: crypto.randomUUID(),
      code: body.code.toUpperCase(),
      description: body.description ?? null,
      type: body.type,
      value: body.value,
      minOrderAmount: body.minOrderAmount,
      maxDiscountAmount: body.maxDiscountAmount ?? null,
      usageLimit: body.usageLimit ?? null,
      usageCount: 0,
      isActive: body.isActive,
      startsAt: body.startsAt ?? null,
      expiresAt: body.expiresAt ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return c.json({ success: true, data: coupon }, 201);
});

adminApp.put('/coupons/:id', zValidator('json', updateCouponSchema), async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const [coupon] = await db
    .update(schema.coupons)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(schema.coupons.id, id))
    .returning();
  if (!coupon) return c.json({ error: 'Coupon not found' }, 404);
  return c.json({ success: true, data: coupon });
});

adminApp.delete('/coupons/:id', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  await db.delete(schema.coupons).where(eq(schema.coupons.id, id));
  return c.json({ success: true, message: 'Coupon deleted' });
});

// ── Brand Management ──
const createBrandSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  logo: z.string().optional(),
  isActive: z.boolean().default(true),
});
const updateBrandSchema = createBrandSchema.partial();

adminApp.get('/brands', async (c) => {
  const db = createDb();
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));
  const offset = (page - 1) * limit;
  const [[{ count: total }], all] = await Promise.all([
    db.select({ count: count() }).from(schema.brands),
    db.select().from(schema.brands).orderBy(schema.brands.name).limit(limit).offset(offset),
  ]);
  return c.json({
    success: true,
    data: all,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

adminApp.post('/brands', zValidator('json', createBrandSchema), async (c) => {
  const db = createDb();
  const body = c.req.valid('json');
  const now = new Date().toISOString();
  const [brand] = await db
    .insert(schema.brands)
    .values({
      id: crypto.randomUUID(),
      name: body.name,
      slug: body.slug,
      logo: body.logo ?? null,
      isActive: body.isActive,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  await revalidateStorefront(c, 'brand');
  return c.json({ success: true, data: brand }, 201);
});

adminApp.put('/brands/:id', zValidator('json', updateBrandSchema), async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const [brand] = await db
    .update(schema.brands)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(schema.brands.id, id))
    .returning();
  if (!brand) return c.json({ error: 'Brand not found' }, 404);
  await revalidateStorefront(c, 'brand');
  return c.json({ success: true, data: brand });
});

adminApp.delete('/brands/:id', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const [brand] = await db
    .update(schema.brands)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(schema.brands.id, id))
    .returning();
  if (!brand) return c.json({ error: 'Brand not found' }, 404);
  await revalidateStorefront(c, 'brand');
  return c.json({ success: true, message: 'Brand deactivated' });
});

// ── Review Management ──
const updateReviewSchema = z.object({
  isApproved: z.boolean().optional(),
  isVerifiedPurchase: z.boolean().optional(),
});

adminApp.get('/reviews', async (c) => {
  const db = createDb();
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));
  const offset = (page - 1) * limit;
  const [{ count: total }] = await db.select({ count: count() }).from(schema.reviews);

  // Join reviews with product name + image and user name
  const reviews = await db
    .select({
      id: schema.reviews.id,
      productId: schema.reviews.productId,
      userId: schema.reviews.userId,
      orderId: schema.reviews.orderId,
      rating: schema.reviews.rating,
      title: schema.reviews.title,
      body: schema.reviews.body,
      isApproved: schema.reviews.isApproved,
      isVerifiedPurchase: schema.reviews.isVerifiedPurchase,
      createdAt: schema.reviews.createdAt,
      productName: schema.products.name,
      productImage: schema.products.image,
      productSlug: schema.products.slug,
      userName: schema.users.name,
      userEmail: schema.users.email,
    })
    .from(schema.reviews)
    .leftJoin(schema.products, eq(schema.reviews.productId, schema.products.id))
    .leftJoin(schema.users, eq(schema.reviews.userId, schema.users.id))
    .orderBy(desc(schema.reviews.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({
    success: true,
    data: reviews,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

adminApp.patch('/reviews/:id', zValidator('json', updateReviewSchema), async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const [review] = await db
    .update(schema.reviews)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(schema.reviews.id, id))
    .returning();
  if (!review) return c.json({ error: 'Review not found' }, 404);
  // Recalculate product rating when approval status changes
  if (body.isApproved !== undefined) {
    await recalculateProductRating(db, review.productId);
  }
  return c.json({ success: true, data: review });
});

adminApp.delete('/reviews/:id', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  // Get the product ID before deleting so we can recalculate
  const [review] = await db
    .select({ productId: schema.reviews.productId })
    .from(schema.reviews)
    .where(eq(schema.reviews.id, id))
    .limit(1);
  await db.delete(schema.reviews).where(eq(schema.reviews.id, id));
  if (review) {
    await recalculateProductRating(db, review.productId);
  }
  return c.json({ success: true, message: 'Review deleted' });
});

// ═══════════════════════════════════════════════════════════════
// VARIANT TYPES — structured variant groups per product
// ═══════════════════════════════════════════════════════════════

const variantTypeSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['color', 'size', 'storage', 'material', 'custom']).default('custom'),
  sortOrder: z.number().int().min(0).default(0),
});

const variantOptionSchema = z.object({
  name: z.string().min(1).max(100),
  value: z.string().max(255).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

const generateCombinationsSchema = z.object({
  defaultPrice: z.number().positive(),
  defaultCompareAtPrice: z.number().positive().nullable().optional(),
  defaultStock: z.number().int().min(0).default(0),
  defaultSku: z.string().max(100).nullable().optional(),
  defaultCost: z.number().int().min(0).nullable().optional(),
});

/** List variant types + options for a product */
adminApp.get('/products/:id/variant-types', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const types = await db
    .select()
    .from(schema.variantTypes)
    .where(eq(schema.variantTypes.productId, id))
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

  // Group options by type
  const optionsByType = new Map<string, typeof allOptions>();
  for (const opt of allOptions) {
    const list = optionsByType.get(opt.variantTypeId) || [];
    list.push(opt);
    optionsByType.set(opt.variantTypeId, list);
  }

  const typesWithOptions = types.map((vt) => ({
    ...vt,
    options: optionsByType.get(vt.id) || [],
  }));

  return c.json({ success: true, data: typesWithOptions });
});

/** Create a variant type for a product */
adminApp.post('/products/:id/variant-types', zValidator('json', variantTypeSchema), async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const body = c.req.valid('json');

  const [product] = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.id, id))
    .limit(1);
  if (!product)
    return c.json(
      { error: 'Product not found. Make sure the product exists in the database.' },
      404
    );

  const now = new Date().toISOString();
  try {
    const [vt] = await db
      .insert(schema.variantTypes)
      .values({
        id: crypto.randomUUID(),
        productId: id,
        name: body.name,
        type: body.type,
        sortOrder: body.sortOrder,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return c.json({ success: true, data: vt }, 201);
  } catch (err) {
    // FK constraint failure = product doesn't exist in DB
    if (err instanceof Error && err.message.includes('FOREIGN KEY')) {
      return c.json(
        { error: 'Product not found in database. The product may need to be re-created.' },
        400
      );
    }
    // UNIQUE constraint failure = a variant type with this name already exists
    // for this product (variant_type_product_name_idx).
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return c.json(
        { error: 'A variant type with this name already exists for this product.' },
        409
      );
    }
    throw err;
  }
});

/** Update a variant type */
adminApp.put('/variant-types/:id', zValidator('json', variantTypeSchema), async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const [vt] = await db
    .update(schema.variantTypes)
    .set({
      name: body.name,
      type: body.type,
      sortOrder: body.sortOrder,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.variantTypes.id, id))
    .returning();
  if (!vt) return c.json({ error: 'Variant type not found' }, 404);
  return c.json({ success: true, data: vt });
});

/** Delete a variant type (cascades to options) */
adminApp.delete('/variant-types/:id', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  await db.delete(schema.variantTypes).where(eq(schema.variantTypes.id, id));
  return c.json({ success: true, message: 'Variant type deleted' });
});

/** Add an option to a variant type */
adminApp.post('/variant-types/:id/options', zValidator('json', variantOptionSchema), async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const body = c.req.valid('json');

  const [vt] = await db
    .select()
    .from(schema.variantTypes)
    .where(eq(schema.variantTypes.id, id))
    .limit(1);
  if (!vt) return c.json({ error: 'Variant type not found' }, 404);

  const now = new Date().toISOString();
  const [opt] = await db
    .insert(schema.variantOptions)
    .values({
      id: crypto.randomUUID(),
      variantTypeId: id,
      name: body.name,
      value: body.value ?? null,
      sortOrder: body.sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return c.json({ success: true, data: opt }, 201);
});

/** Update a variant option */
adminApp.put('/variant-options/:id', zValidator('json', variantOptionSchema), async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const [opt] = await db
    .update(schema.variantOptions)
    .set({
      name: body.name,
      value: body.value ?? null,
      sortOrder: body.sortOrder,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.variantOptions.id, id))
    .returning();
  if (!opt) return c.json({ error: 'Variant option not found' }, 404);
  return c.json({ success: true, data: opt });
});

/** Delete a variant option */
adminApp.delete('/variant-options/:id', async (c) => {
  const db = createDb();
  const { id } = c.req.param();
  await db.delete(schema.variantOptions).where(eq(schema.variantOptions.id, id));
  return c.json({ success: true, message: 'Variant option deleted' });
});

/**
 * Generate variant combinations from variant types/options.
 * Creates product_variant rows with attributes JSON mapping each type name to option name.
 * Replaces existing variants for this product.
 */
adminApp.post(
  '/products/:id/variant-types/generate',
  zValidator('json', generateCombinationsSchema),
  async (c) => {
    const db = createDb();
    const { id } = c.req.param();
    const body = c.req.valid('json');

    const [product] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, id))
      .limit(1);
    if (!product) return c.json({ error: 'Product not found' }, 404);

    const types = await db
      .select()
      .from(schema.variantTypes)
      .where(eq(schema.variantTypes.productId, id))
      .orderBy(schema.variantTypes.sortOrder);

    // Fetch all options in a single query (eliminates N+1)
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

    const typesWithOptions = types.map((vt) => ({
      ...vt,
      options: optionsByType.get(vt.id) || [],
    }));

    // Generate cartesian product
    const combinations: Record<string, string>[] = [{}];
    for (const vt of typesWithOptions) {
      if (vt.options.length === 0) continue;
      const newCombos: Record<string, string>[] = [];
      for (const combo of combinations) {
        for (const opt of vt.options) {
          newCombos.push({ ...combo, [vt.name]: opt.name });
        }
      }
      combinations.length = 0;
      combinations.push(...newCombos);
    }

    // Filter out empty combinations (can happen when all types have zero
    // options — cartesian starts as [{}] which never gets populated).
    const validCombinations = combinations.filter((c) => Object.keys(c).length > 0);
    if (validCombinations.length === 0) {
      return c.json({ error: 'No variant types or options defined' }, 400);
    }

    const now = new Date().toISOString();
    const newVariants: (typeof schema.productVariants.$inferInsert)[] = validCombinations.map(
      (attrs, i) => ({
        id: crypto.randomUUID(),
        productId: id,
        name: Object.values(attrs).join(' / '),
        sku: body.defaultSku ? `${body.defaultSku}-${i + 1}` : null,
        price: body.defaultPrice,
        compareAtPrice: body.defaultCompareAtPrice ?? null,
        cost: body.defaultCost ?? null,
        stock: body.defaultStock,
        image: null,
        attributes: JSON.stringify(attrs),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
    );

    // SKU uniqueness pre-check — generated SKUs are deterministic (PREFIX-N),
    // so validate against OTHER products' variants BEFORE deleting anything.
    // Without this, a shared prefix would blow up mid-insert after the existing
    // variants were already deleted, leaving the product with zero variants.
    const generatedSkus = newVariants.map((v) => v.sku).filter((s): s is string => !!s);
    if (generatedSkus.length > 0) {
      const [collision] = await db
        .select({ sku: schema.productVariants.sku })
        .from(schema.productVariants)
        .where(
          and(
            inArray(schema.productVariants.sku, generatedSkus),
            ne(schema.productVariants.productId, id)
          )
        )
        .limit(1);
      if (collision) {
        return c.json(
          { error: `SKU "${collision.sku}" is already in use by another product.` },
          400
        );
      }
    }

    // Capture existing variants so replaced ones can be cleaned from R2 and
    // FK-referenced ones can be soft-deleted instead of hard-deleted.
    const existingVariants = await db
      .select({ id: schema.productVariants.id, image: schema.productVariants.image })
      .from(schema.productVariants)
      .where(eq(schema.productVariants.productId, id));

    // Find which existing variants are referenced by order_items (FK enforced
    // by D1). These must be soft-deleted (isActive=false, sku=null) instead of
    // hard-deleted to avoid FOREIGN KEY constraint failures.
    const existingVariantIds = existingVariants.map((v) => v.id);
    let referencedIds = new Set<string>();
    if (existingVariantIds.length > 0) {
      const refs = await db
        .selectDistinct({ variantId: schema.orderItems.variantId })
        .from(schema.orderItems)
        .where(
          and(
            inArray(schema.orderItems.variantId, existingVariantIds as string[]),
          )
        );
      referencedIds = new Set(
        refs.map((r) => r.variantId).filter((id): id is string => !!id)
      );
    }

    const toHardDelete = existingVariantIds.filter((vid) => !referencedIds.has(vid));
    const toSoftDelete = existingVariantIds.filter((vid) => referencedIds.has(vid));

    // Atomic replace: soft-delete FK-referenced variants, hard-delete safe
    // ones, insert all combinations, mirror product.stock — all inside a
    // single Postgres transaction so a mid-way failure can never leave a
    // half-generated set.
    const totalStock = newVariants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
    await db.transaction(async (tx) => {
      if (toHardDelete.length > 0) {
        await tx
          .delete(schema.productVariants)
          .where(inArray(schema.productVariants.id, toHardDelete));
      }
      if (toSoftDelete.length > 0) {
        await tx
          .update(schema.productVariants)
          .set({ isActive: false, sku: null, image: null, updatedAt: now })
          .where(inArray(schema.productVariants.id, toSoftDelete));
      }
      // Insert all new variant combinations in chunks (kept for param-limit safety).
      const VARIANTS_PARAM_LIMIT = 100;
      const variantCols = newVariants[0] ? Object.keys(newVariants[0]).length : 0;
      const CHUNK = Math.max(1, Math.floor(VARIANTS_PARAM_LIMIT / Math.max(variantCols, 1)));
      for (let i = 0; i < newVariants.length; i += CHUNK) {
        await tx.insert(schema.productVariants).values(newVariants.slice(i, i + CHUNK));
      }
      await tx
        .update(schema.products)
        .set({ stock: totalStock, updatedAt: now })
        .where(eq(schema.products.id, id));
    });

    // Best-effort cleanup of the replaced variant images (both hard-deleted
    // and soft-deleted variants had their images cleared).
    const orphaned = existingVariants
      .filter((v) => toHardDelete.includes(v.id) || toSoftDelete.includes(v.id))
      .map((v) => v.image)
      .filter((img): img is string => !!img && img.startsWith('/api/images/'));
    if (orphaned.length > 0) {
      c.executionCtx.waitUntil(
        Promise.all(
          orphaned.map((img) => getStorage().delete(img.replace('/api/images/', '')))
        ).catch((err) => console.error('[storage] Failed to delete replaced variant images:', err))
      );
    }

    const created = await db
      .select()
      .from(schema.productVariants)
      .where(eq(schema.productVariants.productId, id))
      .orderBy(schema.productVariants.createdAt);

    return c.json({ success: true, data: created }, 201);
  }
);

export { adminApp };
