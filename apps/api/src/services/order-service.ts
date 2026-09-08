import { and, desc, eq, inArray, like, sql } from 'drizzle-orm';

import type { Database } from '@/db';
import {
  coupons,
  inventoryStock,
  orderItems,
  orders,
  products,
  productVariants,
  addresses,
  settings,
  users,
} from '@/db/schema';
import * as schema from '@/db/schema';

import type { Storage } from '@/lib/storage';

import { indexBy } from '@/lib/collections';
import { checkBlocklist, computeRiskScore } from '@/lib/fraud-check';
import { newId } from '@/lib/ids';
// Use browser build — server build pulls Node `fs`/`canvas` which fails in Workers
// @ts-ignore — no types for subpath
import QRCode from 'qrcode/lib/browser.js';

import { type ServiceResult, err, ok } from './base';
import type { OrderStatus } from '@/lib/order-status';

/**
 * The transaction client passed to `db.transaction()`. We derive it from the
 * driver's transaction signature so it tracks the exact postgres-js type.
 */
type TxClient = Parameters<NonNullable<Parameters<NonNullable<Database['transaction']>>[0]>>[0];

/** Thrown when a guarded stock deduction cannot be satisfied inside a transaction. */
class InsufficientStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientStockError';
  }
}

/** Order line item resolved during order creation. */
type OrderLineItem = {
  productId: string;
  variantId: string | null;
  inventoryId: string | null;
  name: string;
  image: string;
  price: number;
  cost: number | null;
  quantity: number;
  stockAvailable: number;
};

/**
 * Build guarded stock-deduction statements and pre-check queries. Each update
 * only matches while stock is available (WHERE ... >= qty), so concurrent
 * orders can never drive a counter negative.
 *
 * Returns two arrays:
 * - `checks`: queries that return 1 row if stock is available, used for the
 *   friendly pre-check before deducting.
 * - `ops`: the actual deduction statements (with RETURNING) to execute.
 */
function buildStockDeductions(
  db: Database | TxClient,
  lineItems: OrderLineItem[],
  now: string
): { ops: unknown[]; checks: unknown[]; checkMeta: { lineIndex: number; kind: string }[] } {
  const ops: unknown[] = [];
  const checks: unknown[] = [];
  const checkMeta: { lineIndex: number; kind: string }[] = [];

  for (let idx = 0; idx < lineItems.length; idx++) {
    const li = lineItems[idx]!;
    // Pre-check: verify stock is available (friendly error before deducting).
    checks.push(
      db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, li.productId), sql`${products.stock} >= ${li.quantity}`))
        .limit(1)
    );
    checkMeta.push({ lineIndex: idx, kind: 'product' });

    // Product total — only decrement while enough stock remains.
    ops.push(
      db
        .update(products)
        .set({ stock: sql`${products.stock} - ${li.quantity}` })
        .where(and(eq(products.id, li.productId), sql`${products.stock} >= ${li.quantity}`))
        .returning({ id: products.id })
    );

    // Mirror the deduction on the fulfilling inventory (guarded the same way).
    if (li.inventoryId) {
      checks.push(
        db
          .select({ id: inventoryStock.id })
          .from(inventoryStock)
          .where(
            and(
              eq(inventoryStock.inventoryId, li.inventoryId),
              eq(inventoryStock.productId, li.productId),
              sql`${inventoryStock.quantity} >= ${li.quantity}`
            )
          )
          .limit(1)
      );
      checkMeta.push({ lineIndex: idx, kind: 'inventory' });

      ops.push(
        db
          .update(inventoryStock)
          .set({ quantity: sql`${inventoryStock.quantity} - ${li.quantity}`, updatedAt: now })
          .where(
            and(
              eq(inventoryStock.inventoryId, li.inventoryId),
              eq(inventoryStock.productId, li.productId),
              sql`${inventoryStock.quantity} >= ${li.quantity}`
            )
          )
          .returning({ id: inventoryStock.id })
      );
    }

    // Variant lines additionally decrement their own variant pool.
    if (li.variantId) {
      checks.push(
        db
          .select({ id: productVariants.id })
          .from(productVariants)
          .where(
            and(
              eq(productVariants.id, li.variantId),
              sql`${productVariants.stock} >= ${li.quantity}`
            )
          )
          .limit(1)
      );
      checkMeta.push({ lineIndex: idx, kind: 'variant' });

      ops.push(
        db
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} - ${li.quantity}` })
          .where(
            and(
              eq(productVariants.id, li.variantId),
              sql`${productVariants.stock} >= ${li.quantity}`
            )
          )
          .returning({ id: productVariants.id })
      );
    }
  }
  return { ops, checks, checkMeta };
}

/** Order item input */
type OrderItemInput = {
  productId: string;
  variantId?: string;
  quantity: number;
};

/** Create order input */
type CreateOrderInput = {
  /** Nullable for guest (anonymous) checkouts */
  userId: string | null;
  items: OrderItemInput[];
  shippingAddressId?: string;
  /** Guest contact info (guest checkouts only) */
  guest?: { name: string; email?: string; phone: string };
  /** Guest shipping snapshot (guest checkouts only) */
  shipping?: { street: string; city: string; district?: string; postalCode?: string };
  shippingMethodId?: string;
  paymentMethod: 'bkash' | 'nagad' | 'sslcommerz' | 'cod';
  paymentTransactionId?: string;
  couponCode?: string;
  notes?: string;
  clientIp?: string | null;
  /** Voucher/os context — passed from route handler */
  bucket?: Storage;
  appUrl?: string;
};

/** Shipping method shape stored in the `shippingMethods` setting (JSON). */
type ShippingMethodConfig = {
  id: string;
  name: string;
  nameBn?: string;
  enabled?: boolean;
  cost: number;
  freeAbove?: number;
  estimatedDays?: string;
  estimatedDaysBn?: string;
};

/** Parse the shipping methods JSON setting; returns [] when unset/invalid. */
function parseShippingMethods(raw: string | null | undefined): ShippingMethodConfig[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ShippingMethodConfig[]) : [];
  } catch {
    return [];
  }
}

/** Shipping cost (flat rate for now) */
const SHIPPING_COST = 80; // BDT
/** Tax rate (VAT) */
const TAX_RATE = 0.05; // 5%
/** Free shipping threshold (orders at/above this subtotal ship free) */
const FREE_SHIPPING_THRESHOLD = 5000; // BDT

/**
 * Order Service — handles order creation with stock validation,
 * price calculation, coupon application, and stock deduction.
 */
export class OrderService {
  constructor(private db: Database) {}

  /**
   * Create a new order with full validation:
   * 1. Verify all products exist and are active
   * 2. Check stock availability
   * 3. Calculate totals (subtotal, discount, tax, shipping)
   * 4. Apply coupon if provided
   * 5. Deduct stock
   * 6. Create order + line items
   */
  async create(input: CreateOrderInput): Promise<
    ServiceResult<{
      orderId: string;
      orderNumber: string;
      total: number;
      invoiceAccessToken: string;
      voucherNumber: string;
      voucherQrKey: string;
    }>
  > {
    const now = new Date().toISOString();

    // 0. Fraud protection — blocklist is always enforced
    const contactPhone = input.guest?.phone ?? null;
    let shippingAddr = null;
    if (input.shippingAddressId) {
      const addressWhere = input.userId
        ? and(eq(addresses.id, input.shippingAddressId), eq(addresses.userId, input.userId))
        : eq(addresses.id, input.shippingAddressId);
      [shippingAddr] = await this.db.select().from(addresses).where(addressWhere).limit(1);
      // Ownership guard: an authenticated user must never attach another
      // user's address (prevents IDOR and a 500 from the FK on insert).
      if (input.userId && !shippingAddr) {
        return err('Shipping address not found.');
      }
    }
    const blocked = await checkBlocklist(this.db, {
      phone: contactPhone ?? shippingAddr?.phone,
      ip: input.clientIp,
    });
    if (blocked) {
      return err('This order cannot be placed. Please contact support.', 403);
    }

    // 1-2. Fetch products, variants and inventory allocations in parallel.
    const productIds = input.items.map((i) => i.productId);
    const variantIds = input.items.filter((i) => i.variantId).map((i) => i.variantId!);
    const [fetchedProducts, fetchedVariants, invRows] = await Promise.all([
      this.db.select().from(products).where(inArray(products.id, productIds)),
      variantIds.length > 0
        ? this.db.select().from(productVariants).where(inArray(productVariants.id, variantIds))
        : Promise.resolve([] as (typeof productVariants.$inferSelect)[]),
      this.db.select().from(inventoryStock).where(inArray(inventoryStock.productId, productIds)),
    ]);

    const productMap = indexBy(fetchedProducts, (p) => p.id);

    // Validate all products exist and are active
    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return err(`Product not found: ${item.productId}`);
      }
      if (!product.isActive) {
        return err(`Product is no longer available: ${product.name}`);
      }
    }

    const variantMap = indexBy(fetchedVariants, (v) => v.id);

    // 3. Resolve which inventory fulfills each product: the one holding the most
    // stock. Products without allocations get inventoryId = null ("Unassigned").
    const bestInventory = new Map<string, { inventoryId: string; quantity: number }>();
    for (const row of invRows) {
      const cur = bestInventory.get(row.productId);
      if (!cur || row.quantity > cur.quantity) {
        bestInventory.set(row.productId, { inventoryId: row.inventoryId, quantity: row.quantity });
      }
    }

    let subtotal = 0;
    const orderLineItems: OrderLineItem[] = [];

    for (const item of input.items) {
      const product = productMap.get(item.productId)!;
      let price = product.price;
      let stockAvailable = product.stock;
      let name = product.name;
      let image = product.image;

      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant) {
          return err(`Variant not found: ${item.variantId}`);
        }
        if (!variant.isActive) {
          return err(`Variant is no longer available`);
        }
        price = variant.price;
        stockAvailable = variant.stock;
        name = `${product.name} - ${variant.name}`;
        image = variant.image ?? product.image;
      }

      if (stockAvailable < item.quantity) {
        return err(
          `Insufficient stock for ${product.name}. Available: ${stockAvailable}, Requested: ${item.quantity}`
        );
      }

      subtotal += price * item.quantity;
      orderLineItems.push({
        productId: item.productId,
        variantId: item.variantId ?? null,
        inventoryId: bestInventory.get(item.productId)?.inventoryId ?? null,
        name,
        image,
        price,
        cost: (item.variantId ? variantMap.get(item.variantId)?.cost : null) ?? product.cost ?? null,
        quantity: item.quantity,
        stockAvailable,
      });
    }

    // 4. Apply coupon
    let discount = 0;
    if (input.couponCode) {
      const couponResult = await this.validateCoupon(input.couponCode, subtotal);
      if (!couponResult.ok) {
        return err(couponResult.error);
      }
      discount = couponResult.data.discount;
    }

    // 5. Load checkout config (shipping methods + tax) and fraud toggle in parallel.
    const afterDiscount = subtotal - discount;
    const [[fraudSetting], [orderUser], [shippingSetting], [taxSetting]] = await Promise.all([
      this.db.select().from(settings).where(eq(settings.key, 'fraudInternalEnabled')).limit(1),
      input.userId
        ? this.db
            .select({ createdAt: users.createdAt })
            .from(users)
            .where(eq(users.id, input.userId))
            .limit(1)
        : Promise.resolve([] as { createdAt: string }[]),
      this.db.select().from(settings).where(eq(settings.key, 'shippingMethods')).limit(1),
      this.db.select().from(settings).where(eq(settings.key, 'taxRate')).limit(1),
    ]);

    // 5b. Shipping + tax from admin checkout config (fall back to defaults when unset).
    const orderShippingMethods = parseShippingMethods(shippingSetting?.value);
    const enabledShipping = orderShippingMethods.filter((s) => s.enabled !== false);
    const selectedShippingMethod = enabledShipping.find((s) => s.id === input.shippingMethodId);
    if (input.shippingMethodId && !selectedShippingMethod) {
      return err('Selected shipping method is not available', 400);
    }
    const effectiveShippingMethod = selectedShippingMethod ?? enabledShipping[0] ?? null;
    const shippingCost = effectiveShippingMethod
      ? subtotal >= (effectiveShippingMethod.freeAbove ?? FREE_SHIPPING_THRESHOLD)
        ? 0
        : effectiveShippingMethod.cost
      : subtotal >= FREE_SHIPPING_THRESHOLD
        ? 0
        : SHIPPING_COST;
    const parsedTaxRate = parseFloat(taxSetting?.value ?? '') / 100;
    const taxRate = Number.isFinite(parsedTaxRate) && parsedTaxRate >= 0 ? parsedTaxRate : TAX_RATE;
    const tax = Math.round(afterDiscount * taxRate);
    const total = afterDiscount + tax + shippingCost;

    // 6. Generate human-readable sequential order number: TT-YYYY-NNNN (e.g., TT-2026-0006)
    // Year prefix makes the ID instantly understandable; NNNN is zero-padded per-year sequence.
    // Race-safe: up to 5 attempts; on UNIQUE violation (concurrent same-year insert), retry with incremented seq.
    const orderId = newId();
    const orderYear = new Date(now).getFullYear();
    const orderPrefix = `TT-${orderYear}-`;
    const getNextSeq = async (hint: number): Promise<number> => {
      const [maxRow] = await this.db
        .select({ orderNumber: orders.orderNumber })
        .from(orders)
        .where(like(orders.orderNumber, `${orderPrefix}%`))
        .orderBy(desc(orders.orderNumber))
        .limit(1);
      let seq = hint;
      if (maxRow?.orderNumber) {
        const parts = maxRow.orderNumber.split('-');
        const last = parseInt(parts[2] ?? '0', 10);
        if (!Number.isNaN(last)) seq = Math.max(hint, last + 1);
      }
      return seq;
    };
    let nextSeq = await getNextSeq(1);
    let orderNumber = `${orderPrefix}${String(nextSeq).padStart(4, '0')}`;
    let voucherNumber = `TT-V-${orderYear}-${String(nextSeq).padStart(4, '0')}`;
    const voucherQrKey = `vouchers/${orderId}.svg`;
    // 6a. Cryptographically secure 256-bit invoice access token (32 bytes → 64 hex chars).
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const invoiceAccessToken = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, '0')).join('');

    // 6c. Internal risk scoring (admin-toggleable; advisory only — never blocks)
    let riskScore: number | null = null;
    let riskFlags: string | null = null;
    if (fraudSetting?.value !== 'false') {
      const risk = await computeRiskScore(this.db, {
        userId: input.userId,
        phone: contactPhone ?? shippingAddr?.phone ?? null,
        total,
        paymentMethod: input.paymentMethod,
        userCreatedAt: orderUser?.createdAt ?? now,
      });
      riskScore = risk.score;
      riskFlags = risk.flags.length > 0 ? JSON.stringify(risk.flags) : null;
    }

    // 7. Reserve stock AND persist the order in ONE transaction. Each deduction
    //    is guarded (WHERE stock >= qty) so concurrent orders can never oversell,
    //    and every statement runs inside a single D1 transaction: if ANY line
    //    hits a shortfall (0 rows returned) or the persist fails, the whole
    //    transaction rolls back — nothing is ever committed half-way.
    const itemRows = orderLineItems.map((li) => ({
      id: newId(),
      orderId,
      productId: li.productId,
      variantId: li.variantId,
      inventoryId: li.inventoryId,
      name: li.name,
      image: li.image,
      price: li.price,
      cost: li.cost,
      quantity: li.quantity,
      createdAt: now,
    }));

    const isGuest = input.shippingAddressId === null || input.shippingAddressId === undefined;

    // Reserve stock AND persist the order in ONE native transaction. Each
    // deduction is guarded (WHERE stock >= qty) so concurrent orders can never
    // oversell, and the whole block runs inside a single Postgres transaction:
    // if ANY line hits a shortfall or the persist fails, the transaction rolls
    // back — nothing is ever committed half-way.
    const buildOrderRow = (ordNum: string, vNum: string) => ({
      id: orderId,
      userId: input.userId,
      orderNumber: ordNum,
      status: 'pending' as const,
      subtotal,
      discount,
      shippingCost,
      tax,
      total,
      paymentMethod: input.paymentMethod,
      paymentStatus: 'pending' as const,
      paymentTransactionId: input.paymentTransactionId ?? null,
      shippingAddressId: input.shippingAddressId ?? null,
      notes: input.notes ?? null,
      couponCode: input.couponCode ?? null,
      guestName: isGuest ? (input.guest?.name ?? null) : null,
      guestEmail: isGuest ? (input.guest?.email ?? null) : null,
      guestPhone: isGuest ? (input.guest?.phone ?? null) : null,
      shippingSnapshot: isGuest && input.shipping ? JSON.stringify(input.shipping) : null,
      invoiceAccessToken,
      voucherNumber: vNum,
      voucherQrKey,
      riskScore,
      riskFlags,
      createdAt: now,
      updatedAt: now,
    });

    // Retry on UNIQUE violation for orderNumber/voucherNumber (concurrent
    // same-year race) — up to 5 attempts. Native Postgres transaction.
    let attempt = 0;
    let currentOrderNumber = orderNumber;
    let currentVoucherNumber = voucherNumber;
    while (true) {
      try {
        await this.db.transaction(async (tx) => {
          // Friendly pre-check: verify every line item has sufficient stock.
          const { ops: deductOps, checks: stockChecks, checkMeta } = buildStockDeductions(
            tx,
            orderLineItems,
            now
          );
          for (let i = 0; i < stockChecks.length; i++) {
            const result = await (stockChecks[i] as Promise<unknown[]>);
            if (!Array.isArray(result) || result.length === 0) {
              const meta = checkMeta[i]!;
              const li = orderLineItems[meta.lineIndex]!;
              throw new InsufficientStockError(
                `Insufficient stock for ${li.name}. Available: ${li.stockAvailable}, Requested: ${li.quantity}`
              );
            }
          }

          // Run guarded stock deductions; a shortfall surfaces as an empty result.
          for (let i = 0; i < deductOps.length; i++) {
            const op = deductOps[i]!;
            const result = await (op as Promise<unknown[]>);
            if (Array.isArray(result) && result.length === 0) {
              const meta = checkMeta[i]!;
              const li = orderLineItems[meta.lineIndex]!;
              throw new InsufficientStockError(
                `Insufficient stock for ${li.name}. Available: ${li.stockAvailable}, Requested: ${li.quantity}`
              );
            }
          }

          // Persist order + line items + coupon increment in the same transaction.
          await tx.insert(orders).values(buildOrderRow(currentOrderNumber, currentVoucherNumber));
          if (itemRows.length > 0) await tx.insert(orderItems).values(itemRows);
          if (input.couponCode) {
            await tx
              .update(coupons)
              .set({ usageCount: sql`${coupons.usageCount} + 1` })
              .where(eq(coupons.code, input.couponCode));
          }
        });
        orderNumber = currentOrderNumber;
        voucherNumber = currentVoucherNumber;
        break;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const isUniqueViolation =
          (e as { code?: string })?.code === '23505' ||
          (msg.includes('duplicate key') && msg.includes('order_number'));
        if (e instanceof InsufficientStockError) return err(e.message, 400);
        if (!isUniqueViolation || attempt >= 5) throw e;
        attempt++;
        nextSeq = await getNextSeq(nextSeq + 1);
        currentOrderNumber = `${orderPrefix}${String(nextSeq).padStart(4, '0')}`;
        currentVoucherNumber = `TT-V-${orderYear}-${String(nextSeq).padStart(4, '0')}`;
      }
    }

    // 8. Generate QR SVG for voucher → storage (immediate, not lazy). Use APP_URL to build invoice link.
    // Failure to upload QR must not fail the order — log and continue; admin can regenerate.
    if (input.bucket && input.appUrl) {
      try {
        const invoiceUrl = `${input.appUrl.replace(/\/$/, '')}/invoices/${encodeURIComponent(orderNumber)}?token=${encodeURIComponent(invoiceAccessToken)}`;
        const svg: string = await new Promise<string>((resolve, reject) => {
          // @ts-ignore — browser build uses callback API
          QRCode.toString(invoiceUrl, { type: 'svg', width: 400, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#FFFFFF' } }, (err: Error | null, res: string) => (err ? reject(err) : resolve(res)));
        });
        const bytes = new TextEncoder().encode(svg);
        await input.bucket.put(voucherQrKey, bytes, 'image/svg+xml');
      } catch (e) {
        console.error('[VOUCHER] QR upload failed for', voucherNumber, e);
      }
    }

    return ok({ orderId, orderNumber, total, invoiceAccessToken, voucherNumber, voucherQrKey });
  }

  /**
   * Validate a coupon code and calculate discount.
   */
  async validateCoupon(
    code: string,
    orderAmount: number
  ): Promise<ServiceResult<{ discount: number; couponCode: string }>> {
    const result = await this.db
      .select()
      .from(coupons)
      .where(eq(coupons.code, code.toUpperCase()))
      .limit(1);

    const coupon = result[0];
    if (!coupon) {
      return err('Invalid coupon code');
    }

    if (!coupon.isActive) {
      return err('Coupon is no longer active');
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return err('Coupon has expired');
    }

    if (coupon.startsAt && new Date(coupon.startsAt) > new Date()) {
      return err('Coupon is not yet active');
    }

    if (orderAmount < coupon.minOrderAmount) {
      return err(`Minimum order amount is ৳${coupon.minOrderAmount}`);
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return err('Coupon usage limit reached');
    }

    // Calculate discount
    let discount: number;
    if (coupon.type === 'percentage') {
      discount = Math.round((orderAmount * coupon.value) / 100);
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      discount = coupon.value;
    }

    return ok({ discount, couponCode: coupon.code });
  }

  /**
   * List orders for a user with optional status filter.
   */
  async listByUser(
    userId: string,
    filters: { page: number; limit: number; status?: string }
  ): Promise<
    ServiceResult<{
      items: (typeof orders.$inferSelect & { items: (typeof orderItems.$inferSelect)[] })[];
      total: number;
    }>
  > {
    const offset = (filters.page - 1) * filters.limit;

    const conditions = [eq(orders.userId, userId)];
    if (filters.status) {
      conditions.push(
        eq(orders.status, filters.status as (typeof orders.status.enumValues)[number])
      );
    }

    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(orders)
        .where(and(...conditions))
        .orderBy(desc(orders.createdAt))
        .limit(filters.limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(and(...conditions)),
    ]);

    // Fetch line items for each order (first 3 items for preview images)
    const orderIds = items.map((o) => o.id);
    const allItems =
      orderIds.length > 0
        ? await this.db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
        : [];

    const itemsByOrder = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    return ok({
      items: items.map((o) => ({ ...o, items: itemsByOrder.get(o.id) ?? [] })),
      total: Number(countResult[0]?.count ?? 0),
    });
  }

  /**
   * Get order details with line items.
   */
  async getById(orderId: string, userId: string) {
    const orderResult = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .limit(1);

    const order = orderResult[0];
    if (!order) {
      return err('Order not found', 404);
    }

    const items = await this.db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        variantId: orderItems.variantId,
        inventoryId: orderItems.inventoryId,
        name: orderItems.name,
        image: orderItems.image,
        price: orderItems.price,
        cost: orderItems.cost,
        quantity: orderItems.quantity,
        createdAt: orderItems.createdAt,
        slug: schema.products.slug,
      })
      .from(orderItems)
      .leftJoin(schema.products, eq(orderItems.productId, schema.products.id))
      .where(eq(orderItems.orderId, orderId));

    return ok({ ...order, items });
  }

  /**
   * Cancel an order (only if pending or confirmed).
   */
  async cancel(orderId: string, userId: string): Promise<ServiceResult<{ message: string }>> {
    const orderResult = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .limit(1);

    const order = orderResult[0];
    if (!order) {
      return err('Order not found', 404);
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return err('Order cannot be cancelled at this stage', 400);
    }

    const items = await this.db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

    const flipped = await this.restoreAndFlip(
      order,
      items,
      ['pending', 'confirmed'],
      'cancelled',
      new Date().toISOString()
    );
    if (!flipped) {
      return err('Order was already cancelled; refresh and try again.', 409);
    }

    return ok({ message: 'Order cancelled successfully' });
  }

  /**
   * Cancel/refund an order from the admin dashboard. Restores every stock
   * reservation (product total + fulfilling inventory + variant pool) and rolls
   * back coupon usage, atomically in a single batch, guarded by the order's
   * current status so concurrent cancels can never double-restore.
   *
   * `allowedFrom` is the set of statuses the transition map permits as a source
   * (e.g. ['pending','confirmed','processing'] for cancelled).
   */
  async adminCancel(
    orderId: string,
    allowedFrom: OrderStatus[],
    toStatus: 'cancelled' | 'refunded'
  ): Promise<ServiceResult<{ order: typeof orders.$inferSelect }>> {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return err('Order not found', 404);

    const items = await this.db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

    const flipped = await this.restoreAndFlip(order, items, allowedFrom, toStatus);
    if (!flipped) {
      return err('Order status changed since it was loaded; refresh and try again.', 409);
    }

    return ok({ order: { ...order, status: toStatus } });
  }

  /**
   * Reverse a cancel/refund — re-deduct stock and re-apply coupon, then flip
   * the order status back to an active state. Used when an admin reverts a
   * cancelled/refunded order back to pending/confirmed/etc.
   *
   * `allowedFrom` is the set of statuses the transition map permits as a source
   * (e.g. ['cancelled'] or ['refunded']).
   */
  async reverseCancel(
    orderId: string,
    allowedFrom: OrderStatus[],
    toStatus: OrderStatus
  ): Promise<ServiceResult<{ order: typeof orders.$inferSelect }>> {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return err('Order not found', 404);

    const items = await this.db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

    const flipped = await this.deductAndFlip(order, items, allowedFrom, toStatus);
    if (!flipped) {
      return err('Order status changed since it was loaded; refresh and try again.', 409);
    }

    return ok({ order: { ...order, status: toStatus } });
  }

  /**
   * Atomically restore stock/coupon and flip the order status in ONE batch. Each
   * restore statement is guarded by `EXISTS(SELECT 1 FROM orders WHERE id = ? AND
   * status IN allowedFrom)` so a batch whose guard no longer matches (a concurrent
   * cancel won the race) touches nothing. The final statement flips the status
   * with the same guard; whether it matched tells the caller if this call won.
   * Mirrors the guarded-decrement pattern in `buildStockDeductions`.
   */
  private async restoreAndFlip(
    order: typeof orders.$inferSelect | undefined,
    items: (typeof orderItems.$inferSelect)[],
    allowedFrom: OrderStatus[],
    toStatus: OrderStatus,
    nowIso = new Date().toISOString()
  ): Promise<boolean> {
    if (!order) return false;
    // NOTE: status lists MUST be spliced via inArray(). Interpolating a
    // pre-joined string (e.g. `'pending', 'confirmed'`) into a sql`` template
    // binds it as ONE literal parameter — `IN (?)` with value
    // "'pending', 'confirmed'" — which never matches a real status, silently
    // breaking every cancel/refund and stock restoration.
    const fromGuard = inArray(orders.status, allowedFrom);
    const existsGuard = sql`EXISTS (SELECT 1 FROM ${orders} WHERE ${orders.id} = ${order.id} AND ${inArray(orders.status, allowedFrom)})`;

    return this.db.transaction(async (tx) => {
      for (const item of items) {
        // Restore the product total + the inventory it was deducted from.
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} + ${item.quantity}` })
          .where(and(eq(products.id, item.productId), existsGuard));
        if (item.inventoryId) {
          await tx
            .update(inventoryStock)
            .set({
              quantity: sql`${inventoryStock.quantity} + ${item.quantity}`,
              updatedAt: nowIso,
            })
            .where(
              and(
                eq(inventoryStock.inventoryId, item.inventoryId),
                eq(inventoryStock.productId, item.productId),
                existsGuard
              )
            );
        }
        // Restore the variant pool for variant lines.
        if (item.variantId) {
          await tx
            .update(productVariants)
            .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
            .where(and(eq(productVariants.id, item.variantId), existsGuard));
        }
      }

      // Roll back coupon usage (floored at 0 so manual edits can't go negative).
      if (order.couponCode) {
        await tx
          .update(coupons)
          .set({
            usageCount: sql`CASE WHEN ${coupons.usageCount} > 0 THEN ${coupons.usageCount} - 1 ELSE 0 END`,
          })
          .where(and(eq(coupons.code, order.couponCode), existsGuard));
      }

      // Flip the order status with the same guard — the winner is the only caller
      // whose status UPDATE matches a row.
      const flipped = await tx
        .update(orders)
        .set({ status: toStatus, updatedAt: nowIso })
        .where(and(eq(orders.id, order.id), fromGuard))
        .returning({ id: orders.id });
      return flipped.length > 0;
    });
  }

  /**
   * Inverse of restoreAndFlip — re-deduct stock and re-apply coupon usage,
   * then flip the order status. Used when reversing a cancelled/refunded order
   * back to an active status. Each deduction is guarded by EXISTS so concurrent
   * reversals cannot double-deduct.
   */
  private async deductAndFlip(
    order: typeof orders.$inferSelect | undefined,
    items: (typeof orderItems.$inferSelect)[],
    allowedFrom: OrderStatus[],
    toStatus: OrderStatus,
    nowIso = new Date().toISOString()
  ): Promise<boolean> {
    if (!order) return false;
    const fromGuard = inArray(orders.status, allowedFrom);
    const existsGuard = sql`EXISTS (SELECT 1 FROM ${orders} WHERE ${orders.id} = ${order.id} AND ${inArray(orders.status, allowedFrom)})`;

    return this.db.transaction(async (tx) => {
      for (const item of items) {
        // Re-deduct product stock.
        await tx
          .update(products)
          .set({ stock: sql`CASE WHEN ${products.stock} >= ${item.quantity} THEN ${products.stock} - ${item.quantity} ELSE 0 END` })
          .where(and(eq(products.id, item.productId), existsGuard));
        if (item.inventoryId) {
          await tx
            .update(inventoryStock)
            .set({
              quantity: sql`CASE WHEN ${inventoryStock.quantity} >= ${item.quantity} THEN ${inventoryStock.quantity} - ${item.quantity} ELSE 0 END`,
              updatedAt: nowIso,
            })
            .where(
              and(
                eq(inventoryStock.inventoryId, item.inventoryId),
                eq(inventoryStock.productId, item.productId),
                existsGuard
              )
            );
        }
        if (item.variantId) {
          await tx
            .update(productVariants)
            .set({ stock: sql`CASE WHEN ${productVariants.stock} >= ${item.quantity} THEN ${productVariants.stock} - ${item.quantity} ELSE 0 END` })
            .where(and(eq(productVariants.id, item.variantId), existsGuard));
        }
      }

      // Re-apply coupon usage.
      if (order.couponCode) {
        await tx
          .update(coupons)
          .set({ usageCount: sql`${coupons.usageCount} + 1` })
          .where(and(eq(coupons.code, order.couponCode), existsGuard));
      }

      // Flip the order status with guard.
      const flipped = await tx
        .update(orders)
        .set({ status: toStatus, updatedAt: nowIso })
        .where(and(eq(orders.id, order.id), fromGuard))
        .returning({ id: orders.id });
      return flipped.length > 0;
    });
  }
}
