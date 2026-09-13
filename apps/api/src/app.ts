import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { eq, inArray, or, sql } from 'drizzle-orm';

import { authMiddleware, type AuthVariables } from '@/middleware/auth';
import { addressRoutes } from '@/routes/addresses';
import { adminApp } from '@/routes/admin';
import { authRoutes } from '@/routes/auth';
import { blogApp } from '@/routes/blogs';
import { brandRoutes } from '@/routes/brands';
import { categoryRoutes } from '@/routes/categories';
import { contactApp } from '@/routes/contact';
import { orderRoutes } from '@/routes/orders';
import { passwordRoutes } from '@/routes/password';
import { productRoutes } from '@/routes/products';
import { reviewRoutes } from '@/routes/reviews';
import { userRoutes } from '@/routes/user';
import { voucherRoutes } from '@/routes/vouchers';
import { wishlistRoutes } from '@/routes/wishlist';
import { createDb, heroSlides } from '@/db';
import {
  addresses,
  blogPosts,
  blocklist,
  brands,
  categories,
  contactMessages,
  coupons,
  expenses,
  inventoryStock,
  inventories,
  newsletterSubscribers,
  orderItems,
  orders,
  productVariants,
  products,
  purchases,
  reviews,
  settings,
  suppliers,
} from '@/db/schema';
import { createAuth } from '@/lib/auth';
import { getNewsTickerConfig } from '@/lib/news-ticker';
import { getAllowedOrigins } from '@/lib/origins';
import { getCachedSetting, getCachedSettings, invalidateSetting } from '@/lib/settings-cache';
import { getStorage } from '@/lib/storage';
import type { Env } from '@/types/env';

// Simple in-memory rate limiter (per-IP, resets on Worker restart)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimit(maxRequests: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const entry = rateLimitStore.get(ip);
    if (entry && now < entry.resetAt) {
      if (entry.count >= maxRequests) {
        return c.json({ error: 'Too many requests. Please try again later.' }, 429);
      }
      entry.count++;
    } else {
      rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    }
    // Cleanup old entries every 100 requests
    if (rateLimitStore.size > 1000) {
      for (const [key, val] of rateLimitStore) {
        if (now > val.resetAt) rateLimitStore.delete(key);
      }
    }
    await next();
  };
}

export function createApp() {
  const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

  // ── Global Middleware ──
  app.use('*', logger());
  app.use('*', prettyJSON());
  app.use('*', secureHeaders());
  app.use(
    '*',
    cors({
      origin: (origin, c) => {
        const allowed = getAllowedOrigins(c.env);
        return origin && allowed.includes(origin) ? origin : allowed[0];
      },
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400,
    })
  );

  // ── Rate Limiting (public endpoints) ──
  app.use('/api/contact/*', rateLimit(10, 60000));

  // Password reset flow — tight throttling to prevent OTP brute-force / abuse.
  app.use('/api/password/forgot', rateLimit(5, 15 * 60 * 1000));
  app.use('/api/password/verify', rateLimit(15, 15 * 60 * 1000));
  app.use('/api/password/reset', rateLimit(15, 15 * 60 * 1000));

  // Better Auth sign-in / sign-up — slow credential-stuffing & account-spam per IP.
  app.use('/api/auth/sign-in/*', rateLimit(20, 60000));
  app.use('/api/auth/sign-up/*', rateLimit(10, 60000));

  // Guest checkout (public) — throttle order spam per IP.
  app.use('/api/orders/guest', rateLimit(10, 60000));
  // Coupon validation (public) — prevent brute-force coupon enumeration.
  app.use('/api/orders/validate-coupon', rateLimit(10, 60000));
  // Public invoice lookups — prevent bulk scraping by order number.
  app.use('/api/invoices/*', rateLimit(30, 60000));
  app.use('/api/vouchers/*', rateLimit(30, 60000));
  // Public order tracking — throttle to prevent enumeration of order data.
  app.use('/api/orders/track/*', rateLimit(20, 60000));

  // ── Health Check ──
  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
  });

  // ── Auth Routes ──
  app.route('/api/auth', authRoutes);

  // ── Password Reset Routes ──
  app.route('/api/password', passwordRoutes);

  // ── Public Routes (no auth) ──
  app.route('/api/blogs', blogApp);

  app.get('/api/hero-slides', async (c) => {
    const db = createDb();
    const slides = await db
      .select()
      .from(heroSlides)
      .where(eq(heroSlides.isActive, true))
      .orderBy(heroSlides.sortOrder);
    // No CDN caching — hero slide changes appear instantly via on-demand revalidation
    c.header('Cache-Control', 'public, max-age=0, stale-while-revalidate=0, must-revalidate');
    return c.json({ success: true, data: slides });
  });

  // Public support-info config for floating chat widgets + product-page buttons.
  // ONLY non-secret keys are exposed; WhatsApp/Messenger access tokens stay
  // server-side (they're only used server-side for Cloud API integration).
  const SUPPORT_CONFIG_KEYS = [
    'is_whatsapp_enabled',
    'whatsapp_phone_number',
    'is_messenger_enabled',
    'messenger_page_id',
  ] as const;
  app.get('/api/support-config', async (c) => {
    const db = createDb();
    const rows = await db
      .select()
      .from(settings)
      .where(inArray(settings.key, [...SUPPORT_CONFIG_KEYS]));
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    const config = {
      whatsapp: {
        enabled: map.is_whatsapp_enabled === 'true',
        phoneNumber: map.whatsapp_phone_number ?? '',
      },
      messenger: {
        enabled: map.is_messenger_enabled === 'true',
        pageId: map.messenger_page_id ?? '',
      },
    };
    // No CDN caching — admin saves reflect on the storefront immediately.
    c.header('Cache-Control', 'public, max-age=0, stale-while-revalidate=0, must-revalidate');
    return c.json({ success: true, data: config });
  });

  // Public social-profile links (admin Settings → Social tab). Only these
  // non-secret profile URLs are exposed; they power the storefront footer.
  const SOCIAL_CONFIG_KEYS = ['facebook', 'instagram', 'youtube', 'whatsapp'] as const;
  app.get('/api/social-config', async (c) => {
    const db = createDb();
    const rows = await db
      .select()
      .from(settings)
      .where(inArray(settings.key, [...SOCIAL_CONFIG_KEYS]));
    const config: Record<string, string> = {};
    for (const row of rows) config[row.key] = row.value;
    // No CDN caching — admin saves reflect on the storefront immediately.
    c.header('Cache-Control', 'public, max-age=0, stale-while-revalidate=0, must-revalidate');
    return c.json({ success: true, data: config });
  });

  // Public tracking config — ONLY whitelisted, non-secret keys are exposed.
  // The CAPI access token stays server-side (see lib/meta-capi.ts).
  app.get('/api/tracking-config', async (c) => {
    const PUBLIC_TRACKING_KEYS = [
      'trackingEnabled',
      'gtmId',
      'ga4Id',
      'metaPixelId',
      'clarityId',
    ] as const;
    const db = createDb();
    const rows = await db
      .select()
      .from(settings)
      .where(inArray(settings.key, [...PUBLIC_TRACKING_KEYS]));
    const config: Record<string, string> = {};
    for (const row of rows) config[row.key] = row.value;
    // No CDN caching — on-demand revalidation via Next.js ISR tag `tracking-config`
    // so admin changes appear on the storefront instantly.
    c.header('Cache-Control', 'public, max-age=0, stale-while-revalidate=0, must-revalidate');
    return c.json({ success: true, data: config });
  });

  // Public home-page config — admin-managed section toggles, flash deal,
  // showcase, card style. Stored as a single JSON string under `homeConfig`.
  // No CDN caching — on-demand revalidation via Next.js ISR tag `home-config`
  // so admin changes appear on the storefront instantly.
  app.get('/api/home-config', async (c) => {
    const db = createDb();
    const value = await getCachedSetting(db, 'homeConfig');
    let config: unknown = {};
    if (value) {
      try {
        config = JSON.parse(value);
      } catch {
        config = {};
      }
    }
    c.header('Cache-Control', 'public, max-age=0, stale-while-revalidate=0, must-revalidate');
    return c.json({ success: true, data: config });
  });

  // Public news-ticker config for the storefront top bar. Short TTL + the
  // `news-ticker` ISR tag (revalidateTag) so an admin save + revalidation
  // propagates to the storefront immediately rather than waiting for full TTL.
  app.get('/api/news-ticker', async (c) => {
    const db = createDb();
    const config = await getNewsTickerConfig(db);
    c.header('Cache-Control', 'public, max-age=120, stale-while-revalidate=240');
    return c.json({ success: true, data: config });
  });

  // Public menu config for the storefront header/navigation. On-demand
  // revalidation via ISR tag `menu-config` so admin changes appear instantly.
  app.get('/api/menu-config', async (c) => {
    const db = createDb();
    const value = await getCachedSetting(db, 'menuConfig');
    let config: unknown = {};
    if (value) {
      try {
        config = JSON.parse(value);
      } catch {
        config = {};
      }
    }
    c.header('Cache-Control', 'public, max-age=0, stale-while-revalidate=0, must-revalidate');
    return c.json({ success: true, data: config });
  });

  // Public checkout config: enabled payment methods + shipping methods + tax rate.
  app.get('/api/checkout-config', async (c) => {
    const db = createDb();
    const cached = await getCachedSettings(db, ['paymentMethods', 'shippingMethods', 'taxRate']);
    let paymentMethods: unknown[] = [];
    let shippingMethods: unknown[] = [];
    let taxRate = '5';
    if (cached.paymentMethods) {
      try {
        paymentMethods = JSON.parse(cached.paymentMethods);
      } catch {
        /* ignore invalid JSON */
      }
    }
    if (cached.shippingMethods) {
      try {
        shippingMethods = JSON.parse(cached.shippingMethods);
      } catch {
        /* ignore invalid JSON */
      }
    }
    if (cached.taxRate) taxRate = cached.taxRate;
    c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    return c.json({ success: true, data: { paymentMethods, shippingMethods, taxRate } });
  });

  app.get('/api/orders/track/:orderId', async (c) => {
    const orderId = c.req.param('orderId');
    if (!orderId) return c.json({ success: false, message: 'Order ID is required' }, 400);
    c.header('Cache-Control', 'no-store, max-age=0');
    const db = createDb();
    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        total: orders.total,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(or(eq(orders.id, orderId), eq(orders.orderNumber, orderId)))
      .limit(1);
    if (!order) return c.json({ success: false, message: 'Order not found' }, 404);
    const items = await db
      .select({
        name: orderItems.name,
        image: orderItems.image,
        quantity: orderItems.quantity,
        price: orderItems.price,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    return c.json({ success: true, data: { ...order, items } });
  });

  // Serve uploaded images from local storage (public, immutable cache).
  // Swap `getStorage()` for an S3-compatible backend in lib/storage.ts if needed.
  app.get('/api/images/*', async (c) => {
    const key = c.req.path.replace(/^\/api\/images\//, '');
    if (!key) return c.json({ error: 'Not Found' }, 404);
    // Reject path traversal attempts — keys must not contain ".." or start with "/"
    if (key.includes('..') || key.startsWith('/') || key.includes('\\')) {
      return c.json({ error: 'Not Found' }, 404);
    }
    const object = await getStorage().get(key);
    if (!object) return c.json({ error: 'Not Found' }, 404);
    return new Response(object.body, {
      headers: {
        'Content-Type': object.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: object.httpEtag,
      },
    });
  });

  // Secure invoice view — requires a cryptographically secure access token.
  // The token is generated at order creation and shared only with the customer
  // (checkout redirect + confirmation email). Without a valid token, PII is never
  // returned — preventing order enumeration and guest PII exposure.
  app.get('/api/invoices/:orderNumber', async (c) => {
    const raw = c.req.param('orderNumber');
    if (!raw) return c.json({ success: false, message: 'Order number is required' }, 400);
    c.header('Cache-Control', 'no-store, max-age=0');
    // Accept the raw order number or the prefixed invoice number (INV-...).
    const orderNumber = raw.startsWith('INV-') ? raw.slice('INV-'.length) : raw;
    // Token is REQUIRED — this is the sole authorization mechanism for invoice access.
    const token = c.req.query('token');
    if (!token) return c.json({ success: false, message: 'Access token is required' }, 403);

    const db = createDb();
    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        subtotal: orders.subtotal,
        discount: orders.discount,
        shippingCost: orders.shippingCost,
        tax: orders.tax,
        total: orders.total,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        paymentTransactionId: orders.paymentTransactionId,
        guestName: orders.guestName,
        guestEmail: orders.guestEmail,
        guestPhone: orders.guestPhone,
        shippingSnapshot: orders.shippingSnapshot,
        invoiceAccessToken: orders.invoiceAccessToken,
        voucherNumber: orders.voucherNumber,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    // Same response for missing order OR invalid token — don't leak which order numbers exist.
    if (!order) return c.json({ success: false, message: 'Invoice not found' }, 404);
    if (order.invoiceAccessToken !== token) {
      return c.json({ success: false, message: 'Invoice not found' }, 404);
    }

    const items = await db
      .select({
        name: orderItems.name,
        image: orderItems.image,
        quantity: orderItems.quantity,
        price: orderItems.price,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    let shipping: unknown = null;
    if (order.shippingSnapshot) {
      try {
        shipping = JSON.parse(order.shippingSnapshot);
      } catch {
        shipping = null;
      }
    }

    return c.json({
      success: true,
      data: {
        invoiceNumber: `INV-${order.orderNumber}`,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          subtotal: order.subtotal,
          discount: order.discount,
          shippingCost: order.shippingCost,
          tax: order.tax,
          total: order.total,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          paymentTransactionId: order.paymentTransactionId,
          voucherNumber: order.voucherNumber,
          createdAt: order.createdAt,
        },
        customer: {
          name: order.guestName ?? null,
          email: order.guestEmail ?? null,
          phone: order.guestPhone ?? null,
        },
        shipping,
        items,
      },
    });
  });

  // ── Public Custom Snippets (header/footer/body scripts) ──
  // Exposed before auth so the Next.js Server Component can fetch them
  // without authentication. On-demand revalued via the `custom-snippets` tag.
  app.get('/api/custom-snippets', async (c) => {
    const db = createDb();
    const value = await getCachedSetting(db, 'customSnippets');
    let snippets: unknown = [];
    if (value) {
      try {
        snippets = JSON.parse(value);
      } catch {
        snippets = [];
      }
    }
    // No CDN caching — admin saves revalidate via `custom-snippets` ISR tag
    c.header('Cache-Control', 'public, max-age=0, stale-while-revalidate=0, must-revalidate');
    return c.json({ success: true, data: snippets });
  });

  // ── Auth Middleware ──
  app.use('/api/*', authMiddleware);

  // ── API Routes ──
  app.route('/api/products', productRoutes);
  app.route('/api/categories', categoryRoutes);
  app.route('/api/brands', brandRoutes);
  app.route('/api/contact', contactApp);
  app.route('/api/reviews', reviewRoutes);
  app.route('/api/addresses', addressRoutes);
  app.route('/api/orders', orderRoutes);
  app.route('/api/vouchers', voucherRoutes);
  app.route('/api/user', userRoutes);
  app.route('/api/wishlist', wishlistRoutes);
  app.route('/api/admin', adminApp);

  // ── Seed Demo Users ──
  app.post('/api/seed-users', async (c) => {
    // Hard disabled in production (same invariant as /api/seed-admin and
    // /api/seed-demo): this endpoint can mint admin/moderator accounts with
    // hardcoded passwords, so it must never exist on a deployed worker.
    if (c.env.NODE_ENV === 'production') {
      return c.json({ error: 'Not available in production' }, 404);
    }
    const seedSecret = c.req.query('secret') || '';
    const expectedSecret = c.env.SEED_SECRET;
    // Failing hard when SEED_SECRET is absent (instead of falling back to a
    // guessable value) prevents an anonymous demo-account backdoor.
    if (!expectedSecret) {
      return c.json({ error: 'SEED_SECRET not configured on the worker.' }, 500);
    }
    if (seedSecret !== expectedSecret) {
      return c.json({ error: 'Forbidden. Provide ?secret= param.' }, 403);
    }
    const demoUsers = [
      {
        name: 'Admin User',
        email: 'admin@tuktak.com',
        password: 'Admin@123',
        role: 'admin' as const,
      },
      {
        name: 'Moderator User',
        email: 'moderator@tuktak.com',
        password: 'Moderator@123',
        role: 'moderator' as const,
      },
      {
        name: 'John Customer',
        email: 'john@example.com',
        password: 'Customer@123',
        role: 'customer' as const,
      },
      {
        name: 'Jane Customer',
        email: 'jane@example.com',
        password: 'Customer@123',
        role: 'customer' as const,
      },
    ];
    const auth = createAuth(c.env);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx: any = await auth.$context;
    const results: { email: string; status: string; reason?: string }[] = [];
    for (const user of demoUsers) {
      try {
        const hash = await ctx.password.hash(user.password);
        const existing = await ctx.internalAdapter.findUserByEmail(user.email);
        let userId: string;
        let created = false;
        if (existing?.user) {
          userId = existing.user.id as string;
          if (existing.user.role !== user.role)
            await ctx.internalAdapter.updateUser(userId, { role: user.role });
        } else {
          const newUser = await ctx.internalAdapter.createUser({
            name: user.name,
            email: user.email,
            emailVerified: true,
            role: user.role,
          });
          userId = newUser.id as string;
          created = true;
        }
        const accounts = await ctx.internalAdapter.findAccounts(userId);
        for (const acc of accounts) {
          if (acc.providerId === 'credential') await ctx.internalAdapter.deleteAccount(acc.id);
        }
        await ctx.internalAdapter.createAccount({
          userId,
          providerId: 'credential',
          accountId: userId,
          password: hash,
        });
        results.push({ email: user.email, status: created ? 'created' : 'updated' });
      } catch (err) {
        results.push({
          email: user.email,
          status: 'error',
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return c.json({ success: true, data: results }, 200);
  });

  // ── Dev-only local admin helper ──
  // The local D1 used by `wrangler dev` starts empty, so the admin account that
  // exists in production isn't there — that's why sign-in fails locally with
  // "Invalid email or password". This route seeds (or updates) an admin in the
  // local database with the credentials passed in the body. Hard disabled in
  // production: returns 404 there, so it can never be used to forge an admin.
  app.post('/api/seed-admin', async (c) => {
    if (c.env.NODE_ENV === 'production') {
      return c.json({ error: 'Not available in production' }, 404);
    }
    const body = await c.req.json().catch(() => ({}));
    const email = String(body.email ?? 'admin@tuktak.com')
      .toLowerCase()
      .trim();
    const password = String(body.password ?? 'Admin@123');
    const name = String(body.name ?? 'Admin User').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.json({ error: 'Invalid email.' }, 400);
    if (password.length < 8)
      return c.json({ error: 'Password must be at least 8 characters.' }, 400);

    const auth = createAuth(c.env);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Better Auth returns an untyped context bag
    const ctx: any = await auth.$context;
    const hash = await ctx.password.hash(password);
    const existing = await ctx.internalAdapter.findUserByEmail(email);
    let userId: string;
    let created = false;
    if (existing?.user) {
      userId = existing.user.id as string;
      if (existing.user.role !== 'admin')
        await ctx.internalAdapter.updateUser(userId, { role: 'admin', emailVerified: true });
    } else {
      const newUser = await ctx.internalAdapter.createUser({
        name,
        email,
        emailVerified: true,
        role: 'admin',
      });
      userId = newUser.id as string;
      created = true;
    }
    const accounts = await ctx.internalAdapter.findAccounts(userId);
    for (const acc of accounts) {
      if (acc.providerId === 'credential') await ctx.internalAdapter.deleteAccount(acc.id);
    }
    await ctx.internalAdapter.createAccount({
      userId,
      providerId: 'credential',
      accountId: userId,
      password: hash,
    });
    return c.json({ success: true, data: { email, role: 'admin', created } }, 200);
  });

  // ── Dev-only demo data for the local frontend ──
  // Local D1 starts empty, so the storefront has nothing to render. This route
  // seeds schema-accurate demo data for every storefront section (catalog,
  // hero slides, blogs, reviews, coupons, orders, config settings). Idempotent
  // and hard-disabled in production (returns 404 there).
  app.post('/api/seed-demo', async (c) => {
    if (c.env.NODE_ENV === 'production') {
      return c.json({ error: 'Not available in production' }, 404);
    }
    const db = createDb();
    const now = new Date().toISOString();
    const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

    const auth = createAuth(c.env);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Better Auth returns an untyped context bag
    const ctx: any = await auth.$context;
    async function ensureUser(u: {
      name: string;
      email: string;
      role: 'admin' | 'moderator' | 'customer';
    }) {
      const existing = await ctx.internalAdapter.findUserByEmail(u.email);
      if (existing?.user) {
        const id = existing.user.id as string;
        if (existing.user.role !== u.role)
          await ctx.internalAdapter.updateUser(id, { role: u.role, emailVerified: true });
        return id;
      }
      const nu = await ctx.internalAdapter.createUser({
        name: u.name,
        email: u.email,
        emailVerified: true,
        role: u.role,
      });
      return nu.id as string;
    }
    const johnId = await ensureUser({
      name: 'John Customer',
      email: 'john@example.com',
      role: 'customer',
    });
    const janeId = await ensureUser({
      name: 'Jane Customer',
      email: 'jane@example.com',
      role: 'customer',
    });

    const counts: Record<string, number> = {
      categories: 0,
      brands: 0,
      products: 0,
      variants: 0,
      heroSlides: 0,
      blogs: 0,
      coupons: 0,
      reviews: 0,
      addresses: 0,
      orders: 0,
      orderItems: 0,
      inventories: 0,
      stockAllocations: 0,
      suppliers: 0,
      purchases: 0,
      expenses: 0,
      blocklist: 0,
      messages: 0,
      subscribers: 0,
      settings: 0,
    };

    const categoryRows = [
      {
        id: 'cat-001',
        name: 'Smartphones',
        slug: 'smartphones',
        description: 'Latest smartphones from top brands',
        image: 'https://picsum.photos/seed/cat-phone/600/400',
        sortOrder: 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-002',
        name: 'Laptops',
        slug: 'laptops',
        description: 'Laptops for work, study, and gaming',
        image: 'https://picsum.photos/seed/cat-laptop/600/400',
        sortOrder: 2,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-003',
        name: 'Audio',
        slug: 'audio',
        description: 'Headphones, earphones, and speakers',
        image: 'https://picsum.photos/seed/cat-audio/600/400',
        sortOrder: 3,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-004',
        name: 'Smartwatches',
        slug: 'smartwatches',
        description: 'Wearable technology',
        image: 'https://picsum.photos/seed/cat-watch/600/400',
        sortOrder: 4,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-005',
        name: 'Accessories',
        slug: 'accessories',
        description: 'Phone cases, chargers, cables',
        image: 'https://picsum.photos/seed/cat-acc/600/400',
        sortOrder: 5,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-006',
        name: 'Gaming',
        slug: 'gaming',
        description: 'Gaming consoles, controllers',
        image: 'https://picsum.photos/seed/cat-game/600/400',
        sortOrder: 6,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-007',
        name: 'Tablets',
        slug: 'tablets',
        description: 'Tablets for productivity',
        image: 'https://picsum.photos/seed/cat-tab/600/400',
        sortOrder: 7,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-101',
        name: 'Android Phones',
        slug: 'android-phones',
        image: 'https://picsum.photos/seed/cat-android/600/400',
        parentId: 'cat-001',
        sortOrder: 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-102',
        name: 'iPhones',
        slug: 'iphones',
        image: 'https://picsum.photos/seed/cat-iphone/600/400',
        parentId: 'cat-001',
        sortOrder: 2,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-201',
        name: 'Windows Laptops',
        slug: 'windows-laptops',
        image: 'https://picsum.photos/seed/cat-win/600/400',
        parentId: 'cat-002',
        sortOrder: 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-202',
        name: 'MacBooks',
        slug: 'macbooks',
        image: 'https://picsum.photos/seed/cat-mac/600/400',
        parentId: 'cat-002',
        sortOrder: 2,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
    for (let i = 0; i < categoryRows.length; i += 5) {
      await db
        .insert(categories)
        .values(categoryRows.slice(i, i + 5))
        .onConflictDoNothing();
    }

    await db
      .insert(brands)
      .values([
        {
          id: 'brd-001',
          name: 'Apple',
          slug: 'apple',
          logo: 'https://picsum.photos/seed/brand-apple/160/80',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'brd-002',
          name: 'Samsung',
          slug: 'samsung',
          logo: 'https://picsum.photos/seed/brand-samsung/160/80',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'brd-003',
          name: 'Xiaomi',
          slug: 'xiaomi',
          logo: 'https://picsum.photos/seed/brand-xiaomi/160/80',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'brd-004',
          name: 'Sony',
          slug: 'sony',
          logo: 'https://picsum.photos/seed/brand-sony/160/80',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'brd-005',
          name: 'Dell',
          slug: 'dell',
          logo: 'https://picsum.photos/seed/brand-dell/160/80',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'brd-006',
          name: 'HP',
          slug: 'hp',
          logo: 'https://picsum.photos/seed/brand-hp/160/80',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'brd-007',
          name: 'Lenovo',
          slug: 'lenovo',
          logo: 'https://picsum.photos/seed/brand-lenovo/160/80',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'brd-008',
          name: 'OnePlus',
          slug: 'oneplus',
          logo: 'https://picsum.photos/seed/brand-oneplus/160/80',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'brd-009',
          name: 'ASUS',
          slug: 'asus',
          logo: 'https://picsum.photos/seed/brand-asus/160/80',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'brd-010',
          name: 'Nothing',
          slug: 'nothing',
          logo: 'https://picsum.photos/seed/brand-nothing/160/80',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    const productRows = [
      {
        id: 'prd-001',
        name: 'iPhone 16 Pro Max 256GB',
        slug: 'iphone-16-pro-max-256gb',
        sku: 'IP16PM-256',
        description:
          'The most powerful iPhone ever. A18 Pro chip, 48MP camera system, titanium design.',
        shortDescription: 'A18 Pro | 48MP Camera | Titanium',
        price: 159900,
        compareAtPrice: 169900,
        cost: 111930,
        stock: 50,
        categoryId: 'cat-102',
        brandId: 'brd-001',
        image: 'https://picsum.photos/seed/iphone16/600/600',
        isActive: true,
        isFeatured: true,
        rating: 480,
        reviewCount: 24,
      },
      {
        id: 'prd-002',
        name: 'Samsung Galaxy S25 Ultra',
        slug: 'samsung-galaxy-s25-ultra',
        sku: 'SGS25U-256',
        description: 'Samsung Galaxy S25 Ultra with Galaxy AI, 200MP camera, S Pen built-in.',
        shortDescription: 'Galaxy AI | 200MP Camera | S Pen',
        price: 149900,
        compareAtPrice: 159900,
        cost: 104930,
        stock: 35,
        categoryId: 'cat-101',
        brandId: 'brd-002',
        image: 'https://picsum.photos/seed/s25ultra/600/600',
        isActive: true,
        isFeatured: true,
        rating: 460,
        reviewCount: 18,
      },
      {
        id: 'prd-003',
        name: 'MacBook Air M4 15-inch',
        slug: 'macbook-air-m4-15',
        sku: 'MBA-M4-15',
        description:
          'Apple MacBook Air with M4 chip, 15.3-inch Liquid Retina display, 18GB memory.',
        shortDescription: 'M4 Chip | 15.3" Display | 18GB RAM',
        price: 169900,
        cost: 118930,
        stock: 20,
        categoryId: 'cat-202',
        brandId: 'brd-001',
        image: 'https://picsum.photos/seed/macbookair/600/600',
        isActive: true,
        isFeatured: true,
        rating: 490,
        reviewCount: 31,
      },
      {
        id: 'prd-004',
        name: 'Sony WH-1000XM6 Wireless',
        slug: 'sony-wh-1000xm6',
        sku: 'SON-WH1000XM6',
        description: 'Industry-leading noise cancellation. 30-hour battery, Hi-Res Audio.',
        shortDescription: 'Noise Cancelling | 30h Battery',
        price: 35000,
        compareAtPrice: 40000,
        cost: 24500,
        stock: 100,
        categoryId: 'cat-003',
        brandId: 'brd-004',
        image: 'https://picsum.photos/seed/sonyxm6/600/600',
        isActive: true,
        isFeatured: true,
        rating: 470,
        reviewCount: 42,
      },
      {
        id: 'prd-005',
        name: 'Xiaomi 14T Pro',
        slug: 'xiaomi-14t-pro',
        sku: 'XM14T-PRO',
        description: 'Xiaomi 14T Pro with Leica optics, Dimensity 9300+, 120W HyperCharge.',
        shortDescription: 'Leica Cameras | 120W Charging',
        price: 69999,
        compareAtPrice: 79999,
        cost: 49000,
        stock: 45,
        categoryId: 'cat-101',
        brandId: 'brd-003',
        image: 'https://picsum.photos/seed/xiaomi14t/600/600',
        isActive: true,
        rating: 440,
        reviewCount: 15,
      },
      {
        id: 'prd-006',
        name: 'Dell XPS 16 Ultra 9',
        slug: 'dell-xps-16',
        sku: 'DELL-XPS16-U9',
        description: 'Dell XPS 16 with Intel Core Ultra 9, 32GB RAM, 1TB SSD, 4K OLED display.',
        shortDescription: 'Ultra 9 | 32GB RAM | 4K OLED',
        price: 249900,
        cost: 174930,
        stock: 10,
        categoryId: 'cat-201',
        brandId: 'brd-005',
        image: 'https://picsum.photos/seed/dellxps/600/600',
        isActive: true,
        rating: 450,
        reviewCount: 8,
      },
      {
        id: 'prd-007',
        name: 'OnePlus 13',
        slug: 'oneplus-13',
        sku: 'OP13-256',
        description: 'OnePlus 13 with Snapdragon 8 Gen 4, Hasselblad camera, 100W charging.',
        shortDescription: 'SD 8 Gen 4 | Hasselblad | 100W',
        price: 89999,
        compareAtPrice: 94999,
        cost: 62999,
        stock: 30,
        categoryId: 'cat-101',
        brandId: 'brd-008',
        image: 'https://picsum.photos/seed/oneplus13/600/600',
        isActive: true,
        isFeatured: true,
        rating: 455,
        reviewCount: 12,
      },
      {
        id: 'prd-008',
        name: 'Apple Watch Ultra 3',
        slug: 'apple-watch-ultra-3',
        sku: 'AWU3-49',
        description: 'Apple Watch Ultra 3 with titanium case, dual-frequency GPS, 36h battery.',
        shortDescription: 'Titanium | GPS | 36h Battery',
        price: 89900,
        cost: 62930,
        stock: 25,
        categoryId: 'cat-004',
        brandId: 'brd-001',
        image: 'https://picsum.photos/seed/awu3/600/600',
        isActive: true,
        rating: 475,
        reviewCount: 9,
      },
      {
        id: 'prd-009',
        name: 'Nothing Phone (3)',
        slug: 'nothing-phone-3',
        sku: 'NP3-256',
        description: 'Nothing Phone (3) with Glyph Interface, 50MP camera, transparent design.',
        shortDescription: 'Glyph Interface | Transparent Design',
        price: 54999,
        compareAtPrice: 59999,
        cost: 38499,
        stock: 60,
        categoryId: 'cat-101',
        brandId: 'brd-010',
        image: 'https://picsum.photos/seed/nothing3/600/600',
        isActive: true,
        isFeatured: true,
        rating: 430,
        reviewCount: 20,
      },
      {
        id: 'prd-010',
        name: 'iPad Pro M4 13-inch',
        slug: 'ipad-pro-m4-13',
        sku: 'IPP13-M4',
        description: 'iPad Pro with M4 chip, Ultra Retina XDR display, 5.1mm design.',
        shortDescription: 'M4 Chip | XDR Display | 5.1mm',
        price: 159900,
        cost: 111930,
        stock: 15,
        categoryId: 'cat-007',
        brandId: 'brd-001',
        image: 'https://picsum.photos/seed/ipadprom4/600/600',
        isActive: true,
        rating: 485,
        reviewCount: 7,
      },
      {
        id: 'prd-011',
        name: 'ASUS ROG Ally X',
        slug: 'asus-rog-ally-x',
        sku: 'ASUS-RAX',
        description: 'ASUS ROG Ally X handheld gaming with Ryzen Z1 Extreme, 7" 120Hz.',
        shortDescription: 'Ryzen Z1E | 7" 120Hz | 80Wh',
        price: 89900,
        compareAtPrice: 94900,
        cost: 62930,
        stock: 22,
        categoryId: 'cat-006',
        brandId: 'brd-009',
        image: 'https://picsum.photos/seed/rogally/600/600',
        isActive: true,
        rating: 460,
        reviewCount: 14,
      },
      {
        id: 'prd-012',
        name: 'Samsung Galaxy Watch 7',
        slug: 'samsung-galaxy-watch-7',
        sku: 'SGW7-PRO',
        description: 'Galaxy Watch 7 Pro with titanium case, BioActive sensor, 4-day battery.',
        shortDescription: 'Titanium | 4-Day Battery',
        price: 49900,
        compareAtPrice: 54900,
        cost: 34930,
        stock: 40,
        categoryId: 'cat-004',
        brandId: 'brd-002',
        image: 'https://picsum.photos/seed/gw7pro/600/600',
        isActive: true,
        rating: 445,
        reviewCount: 11,
      },
    ].map(
      (p, i) =>
        ({
          ...p,
          images: JSON.stringify([p.image, `https://picsum.photos/seed/${p.slug}-2/600/600`]),
          weight: null,
          createdAt: daysAgo(30 - i),
          updatedAt: now,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any
    );
    for (let i = 0; i < productRows.length; i += 3) {
      await db
        .insert(products)
        .values(productRows.slice(i, i + 3))
        .onConflictDoNothing();
    }

    await db
      .insert(productVariants)
      .values([
        {
          id: 'var-001',
          productId: 'prd-001',
          name: '256GB Natural Titanium',
          sku: 'IP16PM-256-NT',
          price: 159900,
          stock: 20,
          lowStockThreshold: 5,
          attributes: JSON.stringify({ color: 'natural titanium', storage: '256gb' }),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'var-002',
          productId: 'prd-001',
          name: '512GB Natural Titanium',
          sku: 'IP16PM-512-NT',
          price: 179900,
          stock: 15,
          lowStockThreshold: 5,
          attributes: JSON.stringify({ color: 'natural titanium', storage: '512gb' }),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'var-003',
          productId: 'prd-002',
          name: '256GB Titanium Gray',
          sku: 'SGS25U-256-TG',
          price: 149900,
          stock: 15,
          lowStockThreshold: 5,
          attributes: JSON.stringify({ color: 'titanium gray', storage: '256gb' }),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'var-004',
          productId: 'prd-004',
          name: 'WH-1000XM6 Black',
          sku: 'SON-WH1000XM6-BK',
          price: 35000,
          stock: 40,
          lowStockThreshold: 5,
          attributes: JSON.stringify({ color: 'black' }),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'var-005',
          productId: 'prd-004',
          name: 'WH-1000XM6 Silver',
          sku: 'SON-WH1000XM6-SV',
          price: 35000,
          stock: 30,
          lowStockThreshold: 5,
          attributes: JSON.stringify({ color: 'silver' }),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(heroSlides)
      .values([
        {
          id: 'hero-001',
          title: 'The Latest Tech, Delivered',
          subtitle: 'Discover premium electronics and gadgets at unbeatable prices',
          image: 'https://picsum.photos/seed/hero-phone/1920/800',
          ctaText: 'Shop Now',
          ctaLink: '/products',
          badge: 'New Arrivals',
          badgeVariant: 'default',
          textAlign: 'left',
          textColor: '#ffffff',
          overlayColor: 'from-black/60 to-transparent',
          animation: 'fade',
          sortOrder: 0,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'hero-002',
          title: 'Summer Sale — Up to 40% Off',
          subtitle: "Limited time offers on top brands. Don't miss out!",
          image: 'https://picsum.photos/seed/hero-sale/1920/800',
          ctaText: 'View Deals',
          ctaLink: '/products?sort=price_desc',
          ctaSecondaryText: 'Learn More',
          ctaSecondaryLink: '/about',
          badge: 'Limited Offer',
          badgeVariant: 'destructive',
          textAlign: 'center',
          textColor: '#ffffff',
          overlayColor: 'from-primary/60 to-transparent',
          animation: 'fade',
          sortOrder: 1,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'hero-003',
          title: 'Premium Audio Experience',
          subtitle: 'Sony, Bose, and more — immerse yourself in sound',
          image: 'https://picsum.photos/seed/hero-audio/1920/800',
          ctaText: 'Shop Audio',
          ctaLink: '/products?category=audio',
          badge: 'Top Rated',
          badgeVariant: 'secondary',
          textAlign: 'right',
          textColor: '#ffffff',
          overlayColor: 'from-black/40 to-transparent',
          animation: 'fade',
          sortOrder: 2,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'hero-004',
          title: "Bangladesh's Trusted Gadget Destination",
          subtitle: 'Fast delivery across Bangladesh with easy returns',
          image: 'https://picsum.photos/seed/hero-bd/1920/800',
          ctaText: 'Explore',
          ctaLink: '/products',
          badge: 'Welcome',
          badgeVariant: 'default',
          textAlign: 'left',
          textColor: '#ffffff',
          overlayColor: 'from-black/60 to-transparent',
          animation: 'fade',
          sortOrder: 3,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(blogPosts)
      .values([
        {
          id: 'blog-001',
          title: 'iPhone 16 Pro Max: Everything You Need to Know',
          slug: 'iphone-16-pro-max-guide',
          excerpt:
            "A comprehensive look at Apple's latest flagship smartphone featuring the A18 Pro chip and 48MP camera system.",
          content:
            'Apple has once again raised the bar with the iPhone 16 Pro Max. Featuring the powerful A18 Pro chip, a stunning titanium design, and a 48MP camera system that rivals professional cameras.\n\nThe new 5x optical zoom lens is a game-changer for photography enthusiasts. Battery life has been improved to last up to 33 hours of video playback.\n\nAvailable in four stunning finishes: Natural Titanium, Desert Titanium, White Titanium, and Black Titanium. Prices start at ৳159,900 for the 256GB model.',
          image: 'https://picsum.photos/seed/blog-iphone/1200/630',
          author: 'Tuktak Tech',
          tags: 'iPhone,Apple,Smartphones,Review',
          isPublished: true,
          publishedAt: daysAgo(20),
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'blog-002',
          title: 'Top 10 Gadgets Under ৳50,000 in Bangladesh',
          slug: 'top-gadgets-under-50000',
          excerpt:
            'Our curated list of the best value-for-money electronics available in Bangladesh under ৳50,000.',
          content:
            "Finding quality electronics on a budget in Bangladesh can be challenging. We've done the research so you don't have to.\n\nFrom noise-cancelling headphones to powerful smartphones, here are our top picks:\n\n1. Sony WH-1000XM6 — ৳35,000\n2. Samsung Galaxy Watch 7 — ৳49,900\n\nEach of these products offers exceptional value for their price point.",
          image: 'https://picsum.photos/seed/blog-gadgets/1200/630',
          author: 'Tuktak Team',
          tags: 'Budget,Gadgets,Bangladesh,Guide',
          isPublished: true,
          publishedAt: daysAgo(14),
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'blog-003',
          title: 'The Ultimate Guide to Wireless Headphones',
          slug: 'wireless-headphones-guide-2025',
          excerpt:
            'Everything you need to know about choosing the perfect wireless headphones for your lifestyle.',
          content:
            'Wireless headphones have become essential for modern life. Key factors to consider:\n\n1. Sound Quality: Look for Hi-Res Audio support\n2. Noise Cancellation: ANC is essential for busy environments\n3. Battery Life: Aim for 30+ hours for over-ear headphones\n\nOur top recommendation: Sony WH-1000XM6 offers the best balance of all these factors.',
          image: 'https://picsum.photos/seed/blog-audio/1200/630',
          author: 'Audio Expert',
          tags: 'Audio,Headphones,Guide,Wireless',
          isPublished: true,
          publishedAt: daysAgo(10),
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'blog-004',
          title: 'MacBook Air M4 vs MacBook Pro M4: Which Should You Buy?',
          slug: 'macbook-air-m4-vs-pro-m4',
          excerpt:
            "Comparing Apple's latest laptops to help you decide which one is right for your needs and budget.",
          content:
            "Apple's M4 chip has brought incredible performance to both the MacBook Air and MacBook Pro.\n\nMacBook Air M4: Starting at ৳169,900, fanless design, ultra-thin, perfect for students and general productivity.\n\nMacBook Pro M4: Starting at ৳249,900, active cooling for sustained performance, ideal for professionals.\n\nVerdict: The Air is perfect for most users. Choose the Pro only if you need sustained performance.",
          image: 'https://picsum.photos/seed/blog-macbook/1200/630',
          author: 'Tech Reviewer',
          tags: 'Apple,MacBook,Laptop,Comparison',
          isPublished: true,
          publishedAt: daysAgo(6),
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(coupons)
      .values([
        {
          id: 'cpn-001',
          code: 'WELCOME10',
          description: '10% off for new customers',
          type: 'percentage',
          value: 10,
          minOrderAmount: 1000,
          maxDiscountAmount: 2000,
          usageLimit: 100,
          usageCount: 1,
          isActive: true,
          startsAt: daysAgo(90),
          expiresAt: new Date(Date.now() + 180 * 86400000).toISOString(),
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'cpn-002',
          code: 'FREESHIP',
          description: 'Free shipping',
          type: 'fixed',
          value: 80,
          minOrderAmount: 0,
          isActive: true,
          startsAt: daysAgo(90),
          expiresAt: new Date(Date.now() + 180 * 86400000).toISOString(),
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'cpn-003',
          code: 'SAVE500',
          description: 'Flat ৳500 off',
          type: 'fixed',
          value: 500,
          minOrderAmount: 10000,
          usageLimit: 50,
          isActive: true,
          startsAt: daysAgo(90),
          expiresAt: new Date(Date.now() + 180 * 86400000).toISOString(),
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'cpn-004',
          code: 'MEGA15',
          description: '15% off electronics',
          type: 'percentage',
          value: 15,
          minOrderAmount: 5000,
          maxDiscountAmount: 3000,
          usageLimit: 200,
          isActive: false,
          startsAt: daysAgo(90),
          expiresAt: daysAgo(5),
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(addresses)
      .values([
        {
          id: 'addr-001',
          userId: johnId,
          label: 'Home',
          name: 'John Customer',
          phone: '+8801712345678',
          street: 'House 12, Road 5, Dhanmondi',
          city: 'Dhaka',
          district: 'Dhaka',
          postalCode: '1205',
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'addr-002',
          userId: johnId,
          label: 'Office',
          name: 'John Customer',
          phone: '+8801712345678',
          street: 'Level 8, Gulshan Avenue',
          city: 'Dhaka',
          district: 'Dhaka',
          postalCode: '1212',
          isDefault: false,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(orders)
      .values([
        {
          id: 'ord-001',
          userId: johnId,
          orderNumber: 'TK-000001',
          status: 'delivered',
          subtotal: 194900,
          discount: 0,
          shippingCost: 0,
          tax: 9745,
          total: 204645,
          paymentMethod: 'bkash',
          paymentStatus: 'paid',
          shippingAddressId: 'addr-001',
          riskScore: 65,
          riskFlags: JSON.stringify(['velocity', 'high_value_cod']),
          createdAt: daysAgo(25),
          updatedAt: now,
        },
        {
          id: 'ord-002',
          userId: johnId,
          orderNumber: 'TK-000002',
          status: 'shipped',
          subtotal: 35000,
          discount: 0,
          shippingCost: 80,
          tax: 1750,
          total: 36830,
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          shippingAddressId: 'addr-001',
          riskScore: 40,
          riskFlags: JSON.stringify(['new_account']),
          createdAt: daysAgo(8),
          updatedAt: now,
        },
        {
          id: 'ord-003',
          userId: johnId,
          orderNumber: 'TK-000003',
          status: 'pending',
          subtotal: 89999,
          discount: 8999,
          shippingCost: 0,
          tax: 4050,
          total: 85050,
          paymentMethod: 'nagad',
          paymentStatus: 'paid',
          shippingAddressId: 'addr-001',
          couponCode: 'WELCOME10',
          createdAt: daysAgo(2),
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(orderItems)
      .values([
        {
          id: 'oi-001',
          orderId: 'ord-001',
          productId: 'prd-001',
          name: 'iPhone 16 Pro Max 256GB',
          image: 'https://picsum.photos/seed/iphone16/600/600',
          price: 159900,
          cost: 111930,
          quantity: 1,
          createdAt: daysAgo(25),
        },
        {
          id: 'oi-002',
          orderId: 'ord-001',
          productId: 'prd-004',
          name: 'Sony WH-1000XM6 Wireless',
          image: 'https://picsum.photos/seed/sonyxm6/600/600',
          price: 35000,
          cost: 24500,
          quantity: 1,
          createdAt: daysAgo(25),
        },
        {
          id: 'oi-003',
          orderId: 'ord-002',
          productId: 'prd-004',
          name: 'Sony WH-1000XM6 Wireless',
          image: 'https://picsum.photos/seed/sonyxm6/600/600',
          price: 35000,
          cost: 24500,
          quantity: 1,
          createdAt: daysAgo(8),
        },
        {
          id: 'oi-004',
          orderId: 'ord-003',
          productId: 'prd-007',
          name: 'OnePlus 13',
          image: 'https://picsum.photos/seed/oneplus13/600/600',
          price: 89999,
          cost: 62999,
          quantity: 1,
          createdAt: daysAgo(2),
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(reviews)
      .values([
        {
          id: 'rev-001',
          productId: 'prd-001',
          userId: johnId,
          rating: 5,
          title: 'Amazing phone!',
          body: 'The iPhone 16 Pro Max is incredibly fast. Camera is outstanding and battery lasts two days.',
          isApproved: true,
          isVerifiedPurchase: true,
          createdAt: daysAgo(20),
          updatedAt: now,
        },
        {
          id: 'rev-002',
          productId: 'prd-004',
          userId: johnId,
          rating: 5,
          title: 'Best noise cancellation',
          body: 'Incredible noise cancellation. Very comfortable for long sessions.',
          isApproved: true,
          isVerifiedPurchase: true,
          createdAt: daysAgo(7),
          updatedAt: now,
        },
        {
          id: 'rev-003',
          productId: 'prd-007',
          userId: janeId,
          rating: 4,
          title: 'Great value',
          body: 'Snapdragon 8 Gen 4 is blazing fast. Camera could be slightly better in low light.',
          isApproved: true,
          isVerifiedPurchase: false,
          createdAt: daysAgo(3),
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(inventories)
      .values([
        {
          id: 'inv-001',
          name: 'Dhaka Main Warehouse',
          location: 'Tejgaon, Dhaka',
          description: 'Primary fulfilment center for the capital region',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'inv-002',
          name: 'Chittagong Hub',
          location: 'Agrabad, Chittagong',
          description: 'Regional stock hub for southern Bangladesh',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    const allocations: { id: string; inventoryId: string; productId: string; quantity: number }[] =
      [];
    const stocks: Record<string, number> = {
      'prd-001': 50,
      'prd-002': 35,
      'prd-003': 20,
      'prd-004': 100,
      'prd-005': 45,
      'prd-006': 10,
      'prd-007': 30,
      'prd-008': 25,
      'prd-009': 60,
      'prd-010': 15,
      'prd-011': 22,
      'prd-012': 40,
    };
    let allocIndex = 0;
    for (const [productId, total] of Object.entries(stocks)) {
      const first = Math.ceil(total / 2);
      allocations.push({
        id: `is-${String(++allocIndex).padStart(3, '0')}`,
        inventoryId: 'inv-001',
        productId,
        quantity: first,
      });
      allocations.push({
        id: `is-${String(++allocIndex).padStart(3, '0')}`,
        inventoryId: 'inv-002',
        productId,
        quantity: total - first,
      });
    }
    const stockRows = allocations.map((a) => ({ ...a, createdAt: now, updatedAt: now }));
    for (let i = 0; i < stockRows.length; i += 10) {
      await db
        .insert(inventoryStock)
        .values(stockRows.slice(i, i + 10))
        .onConflictDoNothing();
    }

    await db
      .insert(suppliers)
      .values([
        {
          id: 'sup-001',
          name: 'Star Tech Distribution',
          phone: '+8801710000011',
          address: 'Elephant Road, Dhaka',
          note: 'Primary phone & laptop supplier',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'sup-002',
          name: 'Global Gadget Imports',
          phone: '+8801710000022',
          address: 'Agrabad, Chittagong',
          note: 'Audio & accessories importer',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(purchases)
      .values([
        {
          id: 'pur-001',
          supplierId: 'sup-001',
          description: '10x Samsung Galaxy S25 Ultra',
          totalAmount: 950000,
          paidAmount: 950000,
          date: '2025-01-05',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'pur-002',
          supplierId: 'sup-001',
          description: '5x MacBook Air M4 restock',
          totalAmount: 550000,
          paidAmount: 300000,
          date: '2025-02-02',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'pur-003',
          supplierId: 'sup-002',
          description: '30x Sony WH-1000XM6 + accessories',
          totalAmount: 660000,
          paidAmount: 0,
          date: '2025-02-18',
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(expenses)
      .values([
        {
          id: 'exp-001',
          category: 'Rent',
          amount: 40000,
          note: 'Office & warehouse rent',
          date: '2025-01-01',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'exp-002',
          category: 'Salary',
          amount: 120000,
          note: 'Staff salaries',
          date: '2025-01-05',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'exp-003',
          category: 'Advertising',
          amount: 25000,
          note: 'Facebook & Google ads',
          date: '2025-01-15',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'exp-004',
          category: 'Packaging',
          amount: 8000,
          note: 'Boxes, bubble wrap, tape',
          date: '2025-02-03',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'exp-005',
          category: 'Courier',
          amount: 15000,
          note: 'Courier partner charges',
          date: '2025-02-10',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'exp-006',
          category: 'Advertising',
          amount: 30000,
          note: 'Eid campaign boost',
          date: '2025-02-15',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'exp-007',
          category: 'Utilities',
          amount: 6000,
          note: 'Electricity & internet',
          date: '2025-02-20',
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(blocklist)
      .values([
        {
          id: 'bl-001',
          type: 'phone',
          value: '8801999999999',
          reason: 'Repeated fake COD orders',
          createdAt: now,
        },
        {
          id: 'bl-002',
          type: 'phone',
          value: '8801888888888',
          reason: 'Flagged by courier history',
          createdAt: now,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(contactMessages)
      .values([
        {
          id: 'msg-001',
          name: 'Rahim Khan',
          email: 'rahim@example.com',
          subject: 'Product Inquiry',
          message:
            'I am interested in the iPhone 16 Pro Max. Do you have the Desert Titanium color in stock?',
          isRead: false,
          createdAt: daysAgo(6),
          updatedAt: now,
        },
        {
          id: 'msg-002',
          name: 'Fatima Begum',
          email: 'fatima@example.com',
          subject: 'Delivery Issue',
          message:
            "My order TK-000002 was supposed to arrive yesterday but it hasn't been delivered yet.",
          isRead: true,
          createdAt: daysAgo(3),
          updatedAt: now,
        },
        {
          id: 'msg-003',
          name: 'Kamal Hossain',
          email: 'kamal@example.com',
          subject: 'Return Request',
          message: 'I received a defective product. Please initiate a return.',
          isRead: true,
          createdAt: daysAgo(1),
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(newsletterSubscribers)
      .values([
        { id: 'sub-001', email: 'rahim@example.com', isActive: true, createdAt: daysAgo(30) },
        { id: 'sub-002', email: 'fatima@example.com', isActive: true, createdAt: daysAgo(15) },
      ])
      .onConflictDoNothing();

    const paymentMethods = [
      {
        id: 'cod',
        name: 'Cash on Delivery',
        nameBn: 'Cash on Delivery',
        enabled: true,
        icon: 'Banknote',
        description: 'Pay when you receive your order',
        descriptionBn: 'Order peye payment korun',
        requiresTransactionId: false,
      },
      {
        id: 'bkash',
        name: 'bKash',
        nameBn: 'bKash',
        enabled: true,
        icon: 'Smartphone',
        description: 'Pay via bKash mobile wallet',
        descriptionBn: 'bKash mobile wallet er maddhome payment korun',
        requiresTransactionId: true,
      },
      {
        id: 'nagad',
        name: 'Nagad',
        nameBn: 'Nagad',
        enabled: true,
        icon: 'Wallet',
        description: 'Pay via Nagad digital wallet',
        descriptionBn: 'Nagad digital wallet er maddhome payment korun',
        requiresTransactionId: true,
      },
      {
        id: 'sslcommerz',
        name: 'SSLCommerz',
        nameBn: 'SSLCommerz',
        enabled: false,
        icon: 'CreditCard',
        description: 'Pay via card, mobile banking, or internet banking',
        descriptionBn: 'Card, mobile banking ba internet banking er maddhome payment korun',
        requiresTransactionId: false,
      },
    ];
    const shippingMethods = [
      {
        id: 'inside-dhaka',
        name: 'Inside Dhaka',
        nameBn: 'Dhakar bhitore',
        enabled: true,
        cost: 70,
        freeAbove: 5000,
        estimatedDays: '1-2 days',
        estimatedDaysBn: '1-2 din',
      },
      {
        id: 'outside-dhaka',
        name: 'Outside Dhaka',
        nameBn: 'Dhakar baire',
        enabled: true,
        cost: 120,
        freeAbove: 5000,
        estimatedDays: '3-5 days',
        estimatedDaysBn: '3-5 din',
      },
    ];
    const brandNames: Record<string, string> = {
      apple: 'Apple',
      samsung: 'Samsung',
      xiaomi: 'Xiaomi',
      sony: 'Sony',
      dell: 'Dell',
      hp: 'HP',
      lenovo: 'Lenovo',
      oneplus: 'OnePlus',
      asus: 'ASUS',
      nothing: 'Nothing',
    };
    const brandItems = Object.entries(brandNames).map(([slug, name], i) => ({
      id: `brd-${String(i + 1).padStart(3, '0')}`,
      name,
      slug,
      logo: `https://picsum.photos/seed/brand-${slug}/160/80`,
      href: `/products?brand=${slug}`,
    }));

    const homeConfig = {
      productCardStyle: 'compact',
      headerStyle: 'floating',
      heroStyle: 'boxed',
      branding: { primaryColor: '', logoLight: '', logoDark: '', favicon: '' },
      sectionOrder: [
        'categoryCircles',
        'flashDeal',
        'tabbedShowcase',
        'categoryTabsShowcase',
        'trending',
        'newArrivals',
        'showcase',
        'bestsellers',
        'promoBanners',
        'brandCarousel',
        'featureBar',
      ],
      sections: {
        categoryCircles: { enabled: true, style: 'circle', visibleCount: 7 },
        flashDeal: {
          enabled: true,
          title: 'Flash Deal',
          titleBn: 'ফ্ল্যাশ ডিল',
          endsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          tabs: [],
          productIds: ['prd-001', 'prd-004', 'prd-007', 'prd-009', 'prd-011'],
          style: 'grid',
          grid: { columns: 5, rows: 1 },
        },
        trending: {
          enabled: true,
          title: 'Trending Now',
          titleBn: 'ট্রেন্ডিং',
          tabs: [],
          showAllTab: false,
          style: 'carousel',
          grid: { columns: 4, rows: 2 },
        },
        newArrivals: {
          enabled: true,
          title: 'New Arrivals',
          titleBn: 'নতুন পণ্য',
          tabs: [],
          showAllTab: false,
          style: 'carousel',
          grid: { columns: 4, rows: 2 },
        },
        showcase: {
          enabled: true,
          title: 'Featured Picks',
          titleBn: 'বাছাই করা পণ্য',
          featureImage: 'https://picsum.photos/seed/showcase/600/800',
          featureTitle: 'Premium Tech',
          featureDesc: 'Hand-picked flagships loved by our customers',
          featureCta: 'Shop Now',
          featureLink: '/products',
          tabs: [],
          productIds: ['prd-002', 'prd-005', 'prd-006', 'prd-010', 'prd-012', 'prd-011'],
          style: 'spotlight',
          grid: { columns: 3, rows: 2 },
        },
        tabbedShowcase: {
          enabled: false,
          title: '',
          tabs: [],
          style: 'grid',
          grid: { columns: 4, rows: 1 },
        },
        categoryTabsShowcase: {
          enabled: false,
          title: '',
          tabs: [],
          showAllTab: false,
          style: 'grid',
          grid: { columns: 4, rows: 1 },
        },
        bestsellers: {
          enabled: true,
          title: 'Best Sellers',
          titleBn: 'সেরা বিক্রেতা',
          tabs: [],
          showAllTab: false,
          style: 'split',
          grid: { columns: 4, rows: 2 },
        },
        promoBanners: {
          enabled: true,
          style: 'twoCol',
          items: [
            {
              id: 'pb-001',
              title: 'iPhone 16 Pro Max',
              titleBn: 'আইফোন ১৬ প্রো ম্যাক্স',
              desc: 'Powered by A18 Pro with 5x optical zoom.',
              image: 'https://picsum.photos/seed/promo-iphone/1200/500',
              href: '/products/iphone-16-pro-max-256gb',
              accentColor: '#0ea5e9',
            },
            {
              id: 'pb-002',
              title: 'Sony Audio Week',
              titleBn: 'সনি অডিও সপ্তাহ',
              desc: 'Up to 20% off on noise-cancelling headphones.',
              image: 'https://picsum.photos/seed/promo-audio/1200/500',
              href: '/products?category=audio',
              accentColor: '#4f46e5',
            },
          ],
        },
        brandCarousel: { enabled: true, style: 'carousel', brands: brandItems },
        featureBar: {
          enabled: true,
          items: [
            {
              title: 'Free Delivery',
              titleBn: 'ফ্রি ডেলিভারি',
              desc: 'On orders over ৳5,000',
              icon: 'Truck',
            },
            {
              title: 'Cash on Delivery',
              titleBn: 'ক্যাশ অন ডেলিভারি',
              desc: 'Pay when you receive',
              icon: 'Wallet',
            },
            {
              title: '7-Day Returns',
              titleBn: '৭ দিনের রিটার্ন',
              desc: 'Easy returns & refunds',
              icon: 'RotateCcw',
            },
            {
              title: '24/7 Support',
              titleBn: '২৪/৭ সাপোর্ট',
              desc: 'Always here to help',
              icon: 'Headset',
            },
          ],
        },
      },
    };

    const menuConfig = {
      mainMenu: [
        { id: 'mi-home', type: 'link', label: 'Home', href: '/' },
        { id: 'mi-products', type: 'link', label: 'Products', href: '/products' },
        { id: 'mi-deals', type: 'link', label: 'Deals', href: '/flash-deals' },
        {
          id: 'mi-cats',
          type: 'dropdown',
          label: 'Shop by Category',
          labelBn: 'ক্যাটাগরি',
          children: [
            { id: 'mi-cat-001', type: 'category', label: 'Smartphones', categoryId: 'cat-001' },
            { id: 'mi-cat-002', type: 'category', label: 'Laptops', categoryId: 'cat-002' },
            { id: 'mi-cat-003', type: 'category', label: 'Audio', categoryId: 'cat-003' },
            { id: 'mi-cat-004', type: 'category', label: 'Smartwatches', categoryId: 'cat-004' },
            { id: 'mi-cat-006', type: 'category', label: 'Gaming', categoryId: 'cat-006' },
            { id: 'mi-cat-007', type: 'category', label: 'Tablets', categoryId: 'cat-007' },
          ],
        },
        {
          id: 'mi-support',
          type: 'dropdown',
          label: 'Support',
          labelBn: 'সাপোর্ট',
          children: [
            { id: 'mi-s-contact', type: 'link', label: 'Contact Us', href: '/contact' },
            { id: 'mi-s-shipping', type: 'link', label: 'Shipping Info', href: '/shipping' },
            { id: 'mi-s-returns', type: 'link', label: 'Returns & Refunds', href: '/refund' },
          ],
        },
      ],
      mobileMenu: [
        { id: 'mb-home', type: 'link', label: 'Home', href: '/' },
        { id: 'mb-products', type: 'link', label: 'Products', href: '/products' },
        { id: 'mb-deals', type: 'link', label: 'Deals', href: '/flash-deals' },
        { id: 'mb-contact', type: 'link', label: 'Contact Us', href: '/contact' },
      ],
      footerMenu: [
        {
          id: 'col-shop',
          title: 'Shop',
          titleBn: 'দোকান',
          items: [
            { id: 'fl-all', type: 'link', label: 'All Products', href: '/products' },
            { id: 'fl-phones', type: 'category', label: 'Phones', categoryId: 'cat-001' },
            { id: 'fl-laptops', type: 'category', label: 'Laptops', categoryId: 'cat-002' },
            { id: 'fl-audio', type: 'category', label: 'Audio', categoryId: 'cat-003' },
          ],
        },
        {
          id: 'col-support',
          title: 'Support',
          titleBn: 'সাপোর্ট',
          items: [
            { id: 'fs-contact', type: 'link', label: 'Contact Us', href: '/contact' },
            { id: 'fs-shipping', type: 'link', label: 'Shipping Info', href: '/shipping' },
            { id: 'fs-returns', type: 'link', label: 'Returns & Refunds', href: '/refund' },
            { id: 'fs-faq', type: 'link', label: 'FAQ', href: '/contact' },
          ],
        },
        {
          id: 'col-company',
          title: 'Company',
          titleBn: 'কোম্পানি',
          items: [
            { id: 'fc-about', type: 'link', label: 'About Us', href: '/about' },
            { id: 'fc-privacy', type: 'link', label: 'Privacy Policy', href: '/privacy' },
            { id: 'fc-terms', type: 'link', label: 'Terms of Service', href: '/terms' },
          ],
        },
      ],
      footerSocial: [
        { platform: 'facebook', url: 'https://facebook.com' },
        { platform: 'youtube', url: 'https://youtube.com' },
        { platform: 'tiktok', url: 'https://tiktok.com' },
        { platform: 'instagram', url: 'https://instagram.com' },
      ],
      footerPayments: [
        { id: 'pay-bkash', name: 'bKash' },
        { id: 'pay-nagad', name: 'Nagad' },
        { id: 'pay-ssl', name: 'SSLCommerz' },
        { id: 'pay-cod', name: 'COD' },
      ],
    };

    const newsTicker = {
      enabled: true,
      text: 'Free shipping on orders over ৳5,000 | Same-day delivery in Dhaka | Cash on delivery available',
      textBn: '৳5,000-এর ওপর ফ্রি শিপিং | ঢাকায় একদিনের ডেলিভারি | ক্যাশ অন ডেলিভারি উপলব্ধ',
      link: '/products',
      linkLabel: 'Shop Now',
      phone: '01400881103',
      announcements: [
        'Welcome to Tuktak',
        'Home delivery all over Bangladesh (3-5 days)',
        'Cash on Delivery',
        '5% off on advance bKash payment',
      ],
      announcementsBn: [
        'টুকটাকে স্বাগতম',
        'সারা বাংলাদেশে হোম ডেলিভারি (৩-৫ দিন)',
        'ক্যাশ অন ডেলিভারি',
        'অগ্রিম বিকাশে ৫% ছাড়',
      ],
    };

    const settingRows = [
      { key: 'homeConfig', value: JSON.stringify(homeConfig) },
      { key: 'menuConfig', value: JSON.stringify(menuConfig) },
      { key: 'newsTicker', value: JSON.stringify(newsTicker) },
      { key: 'paymentMethods', value: JSON.stringify(paymentMethods) },
      { key: 'shippingMethods', value: JSON.stringify(shippingMethods) },
      { key: 'taxRate', value: '5' },
      { key: 'trackingEnabled', value: 'true' },
      { key: 'gtmId', value: '' },
      { key: 'ga4Id', value: '' },
      { key: 'metaPixelId', value: '' },
      { key: 'clarityId', value: '' },
      { key: 'is_whatsapp_enabled', value: 'true' },
      { key: 'whatsapp_phone_number', value: '01400881103' },
      { key: 'is_messenger_enabled', value: 'false' },
      { key: 'messenger_page_id', value: '' },
      { key: 'fraudInternalEnabled', value: 'true' },
      { key: 'fraudCourierEnabled', value: 'false' },
      { key: 'courierApiUrl', value: 'https://bdcourier.com/api/courier-check' },
    ].map((r) => ({ ...r, updatedAt: now }));
    await db
      .insert(settings)
      .values(settingRows)
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: sql`excluded.value`, updatedAt: sql`excluded.updated_at` },
      });
    for (const r of settingRows) invalidateSetting(r.key);

    counts.categories = await db
      .select({ id: categories.id })
      .from(categories)
      .then((r) => r.length);
    counts.brands = await db
      .select({ id: brands.id })
      .from(brands)
      .then((r) => r.length);
    counts.products = await db
      .select({ id: products.id })
      .from(products)
      .then((r) => r.length);
    counts.variants = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .then((r) => r.length);
    counts.heroSlides = await db
      .select({ id: heroSlides.id })
      .from(heroSlides)
      .then((r) => r.length);
    counts.blogs = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .then((r) => r.length);
    counts.coupons = await db
      .select({ id: coupons.id })
      .from(coupons)
      .then((r) => r.length);
    counts.reviews = await db
      .select({ id: reviews.id })
      .from(reviews)
      .then((r) => r.length);
    counts.addresses = await db
      .select({ id: addresses.id })
      .from(addresses)
      .then((r) => r.length);
    counts.orders = await db
      .select({ id: orders.id })
      .from(orders)
      .then((r) => r.length);
    counts.orderItems = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .then((r) => r.length);
    counts.inventories = await db
      .select({ id: inventories.id })
      .from(inventories)
      .then((r) => r.length);
    counts.stockAllocations = await db
      .select({ id: inventoryStock.id })
      .from(inventoryStock)
      .then((r) => r.length);
    counts.suppliers = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .then((r) => r.length);
    counts.purchases = await db
      .select({ id: purchases.id })
      .from(purchases)
      .then((r) => r.length);
    counts.expenses = await db
      .select({ id: expenses.id })
      .from(expenses)
      .then((r) => r.length);
    counts.blocklist = await db
      .select({ id: blocklist.id })
      .from(blocklist)
      .then((r) => r.length);
    counts.messages = await db
      .select({ id: contactMessages.id })
      .from(contactMessages)
      .then((r) => r.length);
    counts.subscribers = await db
      .select({ id: newsletterSubscribers.id })
      .from(newsletterSubscribers)
      .then((r) => r.length);
    counts.settings = await db
      .select({ key: settings.key })
      .from(settings)
      .then((r) => r.length);

    return c.json({ success: true, data: counts }, 200);
  });

  // ── 404 Handler ──
  app.notFound((c) => c.json({ error: 'Not Found', path: c.req.path }, 404));

  // ── Error Handler ──
  app.onError((err, c) => {
    console.error('Unhandled error:', err);
    let message = err instanceof Error ? err.message : String(err);
    // Drizzle wraps real DB errors in DrizzleQueryError with the SQL + params;
    // surface the underlying cause (e.g. "no such column") for faster debugging.
    if (err instanceof Error && err.cause instanceof Error && err.cause.message) {
      message = err.cause.message;
    }
    return c.json(
      { error: c.env?.NODE_ENV === 'production' ? 'Internal Server Error' : message },
      500
    );
  });

  return app;
}
