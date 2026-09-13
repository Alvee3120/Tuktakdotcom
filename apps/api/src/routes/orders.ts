import { zValidator } from '@hono/zod-validator';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { and, eq } from 'drizzle-orm';

import { createDb, type Database } from '@/db';
import { addresses } from '@/db/schema';
import * as schema from '@/db/schema';
import { sendPurchaseEvent } from '@/lib/meta-capi';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { requireAuth, type AuthVariables } from '@/middleware/auth';
import { getStorage } from '@/lib/storage';
import { OrderService } from '@/services/order-service';
import type { Env } from '@/types/env';
import { idParamSchema } from '@/validators/catalog';
import {
  cancelOrderSchema,
  createGuestOrderSchema,
  createOrderSchema,
  orderListSchema,
  validateCouponSchema,
} from '@/validators/order';

/** Order routes — authenticated order management + public guest checkout */
export const orderRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/** Read a single cookie value from the request's Cookie header */
function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Post-order side-effects shared by registered + guest checkouts. */
type PostOrderTasks = {
  orderId: string;
  orderNumber: string;
  total: number;
  contentIds: string[];
  numItems: number;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  city: string | null;
  postalCode: string | null;
  userId: string | null;
  paymentMethod: string | null;
  deliveryAddress?: string;
  invoiceAccessToken?: string;
};

function schedulePostOrderTasks(
  c: Context<{ Bindings: Env; Variables: AuthVariables }>,
  db: Database,
  data: PostOrderTasks
) {
  // Runs after the response is sent (zero checkout latency); event_id = orderId
  // matches the browser Pixel eventID so Meta deduplicates the pair.
  const cookieHeader = c.req.header('Cookie');
  c.executionCtx.waitUntil(
    (async () => {
      await sendPurchaseEvent(db, {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        value: data.total,
        contentIds: data.contentIds,
        numItems: data.numItems,
        email: data.email,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        city: data.city,
        postalCode: data.postalCode,
        userId: data.userId,
        clientIp: c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? null,
        userAgent: c.req.header('User-Agent') ?? null,
        fbp: readCookie(cookieHeader, '_fbp'),
        fbc: readCookie(cookieHeader, '_fbc'),
        eventSourceUrl: c.req.header('Referer') ?? null,
      });

      // Send order confirmation email (only when a contact email exists)
      if (data.email) {
        try {
          const items = await db
            .select({
              name: schema.orderItems.name,
              quantity: schema.orderItems.quantity,
              price: schema.orderItems.price,
            })
            .from(schema.orderItems)
            .where(eq(schema.orderItems.orderId, data.orderId));

          const customerName =
            data.firstName && data.lastName
              ? `${data.firstName} ${data.lastName}`
              : (data.firstName ?? 'Customer');

          await sendOrderConfirmationEmail(c.env, {
            orderId: data.orderNumber || data.orderId,
            customerEmail: data.email,
            customerName,
            items,
            total: data.total,
            paymentMethod: data.paymentMethod ?? 'N/A',
            deliveryAddress: data.deliveryAddress,
            invoiceAccessToken: data.invoiceAccessToken,
            orderNumber: data.orderNumber,
          });
        } catch (err) {
          console.error('[EMAIL] Failed to send order confirmation email:', err);
        }
      }
    })()
  );
}

/**
 * POST /api/orders/guest
 * Public guest checkout — places an order without an account using contact
 * info + a shipping snapshot supplied by the caller.
 */
orderRoutes.post('/guest', zValidator('json', createGuestOrderSchema), async (c) => {
  const body = c.req.valid('json');
  const db = createDb();
  const service = new OrderService(db);

  const result = await service.create({
    userId: null,
    items: body.items,
    guest: { name: body.name, email: body.email, phone: body.phone },
    shipping: body.shipping,
    shippingMethodId: body.shippingMethodId,
    paymentMethod: body.paymentMethod,
    paymentTransactionId: body.paymentTransactionId,
    couponCode: body.couponCode,
    notes: body.notes,
    clientIp: c.req.header('CF-Connecting-IP') ?? null,
    bucket: getStorage(),
    appUrl: c.env.APP_URL,
  });

  if (!result.ok) {
    return c.json({ error: result.error }, (result.status ?? 400) as ContentfulStatusCode);
  }

  const { orderId, orderNumber, total, invoiceAccessToken } = result.data;
  const [firstName, ...restName] = body.name.trim().split(/\s+/);
  schedulePostOrderTasks(c, db, {
    orderId,
    orderNumber,
    total,
    contentIds: body.items.map((i) => i.productId),
    numItems: body.items.reduce((sum, i) => sum + i.quantity, 0),
    email: body.email ?? null,
    phone: body.phone,
    firstName: firstName || null,
    lastName: restName.length > 0 ? restName.join(' ') : null,
    city: body.shipping.city,
    postalCode: body.shipping.postalCode ?? null,
    userId: null,
    paymentMethod: body.paymentMethod,
    deliveryAddress: `${body.shipping.street || ''}, ${body.shipping.city || ''}`.trim(),
    invoiceAccessToken,
  });

  return c.json({ success: true, data: result.data }, 201);
});

/**
 * POST /api/orders/validate-coupon
 * Validate a coupon code and return discount.
 * Public so guests can apply coupons before placing an order.
 * NOTE: Must be registered BEFORE /:id to avoid route collision.
 */
orderRoutes.post('/validate-coupon', zValidator('json', validateCouponSchema), async (c) => {
  const { code, orderAmount } = c.req.valid('json');
  const db = createDb();
  const service = new OrderService(db);

  const result = await service.validateCoupon(code, orderAmount);

  if (!result.ok) {
    return c.json({ error: result.error }, (result.status ?? 400) as ContentfulStatusCode);
  }

  return c.json({ success: true, data: result.data });
});

/**
 * GET /api/orders
 * List current user's orders with pagination and optional status filter.
 */
orderRoutes.get('/', requireAuth, zValidator('query', orderListSchema), async (c) => {
  const user = c.var.user!;
  const query = c.req.valid('query');
  const db = createDb();
  const service = new OrderService(db);

  const result = await service.listByUser(user.id, {
    page: query.page,
    limit: query.limit,
    status: query.status,
  });

  if (!result.ok) {
    return c.json({ error: result.error }, (result.status ?? 500) as ContentfulStatusCode);
  }

  const totalPages = Math.max(1, Math.ceil(result.data.total / query.limit));
  return c.json({
    success: true,
    data: result.data.items,
    meta: { total: result.data.total, page: query.page, limit: query.limit, totalPages },
  });
});

/**
 * POST /api/orders
 * Create a new order for the authenticated user.
 */
orderRoutes.post('/', requireAuth, zValidator('json', createOrderSchema), async (c) => {
  const user = c.var.user!;
  const body = c.req.valid('json');
  const db = createDb();
  const service = new OrderService(db);

  const result = await service.create({
    userId: user.id,
    items: body.items,
    shippingAddressId: body.shippingAddressId,
    // Inline delivery details (no saved address): still tied to the account via
    // userId, but stored as a snapshot like a guest order.
    guest:
      !body.shippingAddressId && body.name && body.phone
        ? { name: body.name, email: body.email, phone: body.phone }
        : undefined,
    shipping: !body.shippingAddressId ? body.shipping : undefined,
    shippingMethodId: body.shippingMethodId,
    paymentMethod: body.paymentMethod,
    paymentTransactionId: body.paymentTransactionId,
    couponCode: body.couponCode,
    notes: body.notes,
    clientIp: c.req.header('CF-Connecting-IP') ?? null,
    bucket: getStorage(),
    appUrl: c.env.APP_URL,
  });

  if (!result.ok) {
    return c.json({ error: result.error }, (result.status ?? 400) as ContentfulStatusCode);
  }

  const { orderId, orderNumber, total, invoiceAccessToken } = result.data;
  const [addr] = body.shippingAddressId
    ? await db
        .select()
        .from(addresses)
        .where(and(eq(addresses.id, body.shippingAddressId), eq(addresses.userId, user.id)))
        .limit(1)
    : [undefined];
  // Contact details come from the saved address, else the inline form.
  const contactName = addr?.name || body.name || user.name || '';
  const contactPhone = addr?.phone ?? body.phone ?? user.phone;
  const contactEmail = addr ? user.email : (body.email ?? user.email);
  const city = addr?.city ?? body.shipping?.city ?? null;
  const postalCode = addr?.postalCode ?? body.shipping?.postalCode ?? null;
  const [firstName, ...restName] = contactName.trim().split(/\s+/);
  schedulePostOrderTasks(c, db, {
    orderId,
    orderNumber,
    total,
    contentIds: body.items.map((i) => i.productId),
    numItems: body.items.reduce((sum, i) => sum + i.quantity, 0),
    email: contactEmail,
    phone: contactPhone,
    firstName: firstName || null,
    lastName: restName.length > 0 ? restName.join(' ') : null,
    city,
    postalCode,
    userId: user.id,
    paymentMethod: body.paymentMethod,
    deliveryAddress: addr
      ? `${addr.street || ''}, ${addr.city || ''}`.trim()
      : body.shipping
        ? `${body.shipping.street || ''}, ${body.shipping.city || ''}`.trim()
        : undefined,
    invoiceAccessToken,
  });

  return c.json({ success: true, data: result.data }, 201);
});

/**
 * GET /api/orders/:id
 * Get order details with line items.
 */
orderRoutes.get('/:id', requireAuth, zValidator('param', idParamSchema), async (c) => {
  const user = c.var.user!;
  const { id } = c.req.valid('param');
  const db = createDb();
  const service = new OrderService(db);

  const result = await service.getById(id, user.id);

  if (!result.ok) {
    return c.json({ error: result.error }, (result.status ?? 404) as ContentfulStatusCode);
  }

  return c.json({ success: true, data: result.data });
});

/**
 * POST /api/orders/:id/cancel
 * Cancel an order (only pending/confirmed).
 */
orderRoutes.post(
  '/:id/cancel',
  requireAuth,
  zValidator('param', idParamSchema),
  zValidator('json', cancelOrderSchema.optional()),
  async (c) => {
    const user = c.var.user!;
    const { id } = c.req.valid('param');
    const db = createDb();
    const service = new OrderService(db);

    const result = await service.cancel(id, user.id);

    if (!result.ok) {
      return c.json({ error: result.error }, (result.status ?? 400) as ContentfulStatusCode);
    }

    return c.json({ success: true, data: result.data });
  }
);
