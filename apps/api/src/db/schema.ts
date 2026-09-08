/**
 * Drizzle ORM Database Schema for Tuktak.com
 * Tables: Auth (Better Auth required) + Core Business
 *
 * PostgreSQL dialect (self-hosted on Hetzner).
 *
 * NOTES ON COLUMN TYPES:
 * - Booleans are proper Postgres `boolean` columns.
 * - Timestamps are `timestamptz`. Drizzle `timestamp({ mode: 'string' })` lets
 *   existing ISO-string inserts/updates keep working unchanged; Postgres stores
 *   them with timezone.
 * - IDs are text (UUID strings generated via crypto.randomUUID()) — kept as text
 *   to avoid migrating row IDs.
 */
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { ORDER_STATUSES } from '@/lib/order-status';

// ═══════════════════════════════════════════════════
// AUTH TABLES (Required by Better Auth)
// ═══════════════════════════════════════════════════

/** Users table — stores user identity and profile */
export const users = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    phone: text('phone'),
    role: text('role', { enum: ['admin', 'moderator', 'customer'] })
      .notNull()
      .default('customer'),
    permissions: text('permissions'), // JSON array of page keys for moderators
    banned: boolean('banned').notNull().default(false),
    banReason: text('ban_reason'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (t) => [index('user_created_idx').on(t.createdAt)]
);

/** Sessions table — active user sessions */
export const sessions = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    activeOrganizationId: text('active_organization_id'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (t) => [index('session_user_id_idx').on(t.userId)]
);

/** Accounts table — OAuth/social login providers */
export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { mode: 'string' }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { mode: 'string' }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
});

/** Verification table — email/password reset OTPs */
export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
});

// ═══════════════════════════════════════════════════
// CORE BUSINESS TABLES
// ═══════════════════════════════════════════════════

/** Categories — product categories (e.g., Phones, Laptops, Audio) */
export const categories = pgTable(
  'category',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    image: text('image'),
    parentId: text('parent_id'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (t) => [index('category_parent_idx').on(t.parentId)]
);

/** Products — the main product catalog */
export const products = pgTable(
  'product',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    nameBn: text('name_bn'),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    descriptionBn: text('description_bn'),
    shortDescription: text('short_description'),
    shortDescriptionBn: text('short_description_bn'),
    price: integer('price').notNull(),
    compareAtPrice: integer('compare_at_price'),
    cost: integer('cost'),
    sku: text('sku').unique(),
    stock: integer('stock').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    brandId: text('brand_id').references(() => brands.id, { onDelete: 'set null' }),
    image: text('image').notNull(),
    images: text('images'), // JSON array of image URLs
    isActive: boolean('is_active').notNull().default(true),
    isFeatured: boolean('is_featured').notNull().default(false),
    weight: integer('weight'), // grams
    rating: integer('rating').notNull().default(0), // avg rating * 100 (e.g., 450 = 4.5)
    reviewCount: integer('review_count').notNull().default(0),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (t) => [
    index('product_category_idx').on(t.categoryId),
    index('product_brand_idx').on(t.brandId),
    index('product_active_idx').on(t.isActive),
    index('product_featured_idx').on(t.isFeatured),
    index('product_created_idx').on(t.createdAt),
  ]
);

/** Brands — product brands (Samsung, Apple, Xiaomi, etc.) */
export const brands = pgTable('brand', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
});

/** Product Variants — size/color/storage options */
export const productVariants = pgTable(
  'product_variant',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: text('name').notNull(), // e.g., "128GB Black", "256GB White"
    sku: text('sku').unique(),
    price: integer('price').notNull(),
    compareAtPrice: integer('compare_at_price'),
    cost: integer('cost'),
    stock: integer('stock').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    image: text('image'),
    attributes: text('attributes'), // JSON: { color: "black", storage: "128gb" }
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (t) => [index('variant_product_idx').on(t.productId)]
);

/** Addresses — user shipping/billing addresses */
export const addresses = pgTable(
  'address',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: text('label').notNull().default('Home'),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    street: text('street').notNull(),
    city: text('city').notNull(),
    district: text('district'),
    postalCode: text('postal_code'),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (t) => [index('address_user_idx').on(t.userId)]
);

/** Orders — purchase orders (guest checkouts have userId = null) */
export const orders = pgTable(
  'order',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    orderNumber: text('order_number').notNull().unique(),
    status: text('status', {
      enum: [...ORDER_STATUSES],
    })
      .notNull()
      .default('pending'),
    subtotal: integer('subtotal').notNull(),
    discount: integer('discount').notNull().default(0),
    shippingCost: integer('shipping_cost').notNull().default(0),
    tax: integer('tax').notNull().default(0),
    total: integer('total').notNull(),
    paymentMethod: text('payment_method', { enum: ['bkash', 'nagad', 'sslcommerz', 'cod'] }),
    paymentStatus: text('payment_status', { enum: ['pending', 'paid', 'failed', 'refunded'] })
      .notNull()
      .default('pending'),
    paymentTransactionId: text('payment_transaction_id'),
    shippingAddressId: text('shipping_address_id').references(() => addresses.id, {
      onDelete: 'set null',
    }),
    notes: text('notes'),
    couponCode: text('coupon_code'),
    riskScore: integer('risk_score'), // 0-100 fraud risk score (null = not evaluated)
    riskFlags: text('risk_flags'), // JSON array of flag strings, e.g. ["velocity","new_account"]
    guestName: text('guest_name'),
    guestEmail: text('guest_email'),
    guestPhone: text('guest_phone'),
    shippingSnapshot: text('shipping_snapshot'), // JSON { street, city, district?, postalCode? } for guest orders
    invoiceAccessToken: text('invoice_access_token'), // cryptographically secure token for guest invoice access
    voucherNumber: text('voucher_number'), // unique voucher number generated on order creation (unique via order_voucher_number_unique below)
    voucherQrKey: text('voucher_qr_key'), // R2 key for QR PNG (vouchers/<orderId>.png)
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (t) => [
    index('order_user_idx').on(t.userId),
    index('order_status_idx').on(t.status),
    index('order_created_idx').on(t.createdAt),
    index('order_payment_status_idx').on(t.paymentStatus),
    index('order_risk_idx').on(t.riskScore),
    index('order_user_status_idx').on(t.userId, t.status),
    index('order_guest_phone_idx').on(t.guestPhone),
    index('order_status_created_idx').on(t.status, t.createdAt),
    uniqueIndex('order_invoice_token_unique').on(t.invoiceAccessToken),
    uniqueIndex('order_voucher_number_unique').on(t.voucherNumber),
  ]
);

/** Order Items — line items in each order */
export const orderItems = pgTable(
  'order_item',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    variantId: text('variant_id').references(() => productVariants.id),
    inventoryId: text('inventory_id').references(() => inventories.id), // which inventory fulfilled this line
    name: text('name').notNull(),
    image: text('image').notNull(),
    price: integer('price').notNull(),
    cost: integer('cost'), // cost price snapshot at purchase time (for profit reports)
    quantity: integer('quantity').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  },
  (t) => [
    index('order_item_order_idx').on(t.orderId),
    index('order_item_product_idx').on(t.productId),
    index('order_item_order_product_idx').on(t.orderId, t.productId),
  ]
);

/** Inventories — physical stock locations (godowns/warehouses) */
export const inventories = pgTable('inventory', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location'),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
});

/** Per-inventory stock for each product (product.stock stays the total) */
export const inventoryStock = pgTable(
  'inventory_stock',
  {
    id: text('id').primaryKey(),
    inventoryId: text('inventory_id')
      .notNull()
      .references(() => inventories.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (t) => [
    uniqueIndex('inv_stock_unique').on(t.inventoryId, t.productId),
    index('inv_stock_product_idx').on(t.productId),
  ]
);

/** Reviews — product reviews and ratings */
export const reviews = pgTable(
  'review',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orderId: text('order_id').references(() => orders.id),
    rating: integer('rating').notNull(), // 1-5
    title: text('title'),
    body: text('body'),
    isApproved: boolean('is_approved').notNull().default(false),
    isVerifiedPurchase: boolean('is_verified_purchase').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (t) => [
    index('review_product_idx').on(t.productId),
    index('review_product_approved_idx').on(t.productId, t.isApproved),
    index('review_user_idx').on(t.userId),
    // One review per user per product (guards against duplicate submissions).
    uniqueIndex('review_user_product_unique').on(t.userId, t.productId),
  ]
);

/** Coupons — discount codes */
export const coupons = pgTable('coupon', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  description: text('description'),
  type: text('type', { enum: ['percentage', 'fixed'] }).notNull(),
  value: integer('value').notNull(),
  minOrderAmount: integer('min_order_amount').notNull().default(0),
  maxDiscountAmount: integer('max_discount_amount'),
  usageLimit: integer('usage_limit'),
  usageCount: integer('usage_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  startsAt: timestamp('starts_at', { mode: 'string' }),
  expiresAt: timestamp('expires_at', { mode: 'string' }),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
});

/** Hero Slides — homepage carousel/slides */
export const heroSlides = pgTable(
  'hero_slide',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    titleBn: text('title_bn'),
    subtitle: text('subtitle'),
    subtitleBn: text('subtitle_bn'),
    description: text('description'),
    descriptionBn: text('description_bn'),
    image: text('image').notNull(),
    backgroundImage: text('background_image'),
    mobileBackgroundImage: text('mobile_background_image'),
    ctaText: text('cta_text'),
    ctaTextBn: text('cta_text_bn'),
    ctaLink: text('cta_link'),
    ctaSecondaryText: text('cta_secondary_text'),
    ctaSecondaryTextBn: text('cta_secondary_text_bn'),
    ctaSecondaryLink: text('cta_secondary_link'),
    overlayColor: text('overlay_color').default('from-black/60 to-transparent'),
    textAlign: text('text_align', { enum: ['left', 'center', 'right'] }).default('left'),
    textColor: text('text_color').default('#ffffff'),
    badge: text('badge'),
    badgeBn: text('badge_bn'),
    badgeVariant: text('badge_variant', {
      enum: ['default', 'secondary', 'destructive', 'outline'],
    }).default('default'),
    animation: text('animation', {
      enum: [
        'fade',
        'top-to-bottom',
        'bottom-to-top',
        'left-to-right',
        'right-to-left',
        'scale-up',
        'zoom-out',
        'parallax',
      ],
    }).default('fade'),
    animationDuration: integer('animation_duration').default(700),
    titleFontSize: text('title_font_size', { enum: ['sm', 'md', 'lg', 'xl'] }).default('lg'),
    subtitleFontSize: text('subtitle_font_size', { enum: ['sm', 'md', 'lg', 'xl'] }).default('md'),
    productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
    showTrustBadges: boolean('show_trust_badges').default(true),
    showTitle: boolean('show_title').default(true),
    showSubtitle: boolean('show_subtitle').default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (t) => [index('hero_slide_sort_idx').on(t.sortOrder)]
);

/** Contact Messages — from public contact form */
export const contactMessages = pgTable(
  'contact_message',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    subject: text('subject'),
    message: text('message').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    repliedAt: timestamp('replied_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (t) => [index('contact_message_created_idx').on(t.createdAt)]
);

/** Settings — key-value store for admin config */
export const settings = pgTable('setting', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
});

/** Blocklist — blocked phones/IPs for fake-order protection (always enforced) */
export const blocklist = pgTable(
  'blocklist',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: ['phone', 'ip'] }).notNull(),
    value: text('value').notNull(), // normalized: phone digits (880...) / ip string
    reason: text('reason'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  },
  (t) => [uniqueIndex('blocklist_unique').on(t.type, t.value)]
);

/** Courier fraud-check cache — 24h TTL, one aggregator API call per phone per day */
export const courierCheckCache = pgTable('courier_check_cache', {
  phone: text('phone').primaryKey(), // normalized digits (880...)
  data: text('data').notNull(), // normalized JSON report
  checkedAt: timestamp('checked_at', { mode: 'string' }).notNull(),
});

/** Expenses — business costs for the P&L (ads, rent, salary, packaging...) */
export const expenses = pgTable(
  'expense',
  {
    id: text('id').primaryKey(),
    category: text('category').notNull(),
    amount: integer('amount').notNull(), // whole BDT
    note: text('note'),
    date: text('date').notNull(), // YYYY-MM-DD
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (t) => [index('expense_date_idx').on(t.date)]
);

/** Suppliers — who we buy stock from */
export const suppliers = pgTable('supplier', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  address: text('address'),
  note: text('note'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
});

/** Purchases from suppliers — due = totalAmount - paidAmount */
export const purchases = pgTable(
  'purchase',
  {
    id: text('id').primaryKey(),
    supplierId: text('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'cascade' }),
    description: text('description'),
    totalAmount: integer('total_amount').notNull(),
    paidAmount: integer('paid_amount').notNull().default(0),
    date: text('date').notNull(), // YYYY-MM-DD
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (t) => [index('purchase_supplier_idx').on(t.supplierId)]
);

/** Blog Posts */
export const blogPosts = pgTable(
  'blog_post',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    excerpt: text('excerpt'),
    content: text('content').notNull(),
    image: text('image'),
    author: text('author').notNull().default('Tuktak'),
    tags: text('tags'),
    publishedAt: timestamp('published_at', { mode: 'string' }),
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (t) => [index('blog_post_published_idx').on(t.isPublished, t.publishedAt)]
);

/** Newsletter Subscribers */
export const newsletterSubscribers = pgTable(
  'newsletter_subscriber',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  },
  (t) => [index('newsletter_subscriber_created_idx').on(t.createdAt)]
);

/** Variant Types — groups like "Color", "Size", "Storage" per product */
export const variantTypes = pgTable(
  'variant_type',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: text('name').notNull(), // e.g., "Color", "Size", "Storage"
    type: text('type', { enum: ['color', 'size', 'storage', 'material', 'custom'] })
      .notNull()
      .default('custom'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (t) => [
    index('variant_type_product_idx').on(t.productId),
    uniqueIndex('variant_type_product_name_idx').on(t.productId, t.name),
  ]
);

/** Variant Options — individual options within a variant type group */
export const variantOptions = pgTable(
  'variant_option',
  {
    id: text('id').primaryKey(),
    variantTypeId: text('variant_type_id')
      .notNull()
      .references(() => variantTypes.id, { onDelete: 'cascade' }),
    name: text('name').notNull(), // e.g., "Red", "XL", "256GB"
    value: text('value'), // e.g., "#FF0000" for colors, or same as name
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (t) => [
    index('variant_option_type_idx').on(t.variantTypeId),
    uniqueIndex('variant_option_type_name_idx').on(t.variantTypeId, t.name),
  ]
);

/** Wishlist — user product wishlists */
export const wishlist = pgTable(
  'wishlist',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  },
  (t) => [uniqueIndex('wishlist_user_product_idx').on(t.userId, t.productId)]
);

/** Email Logs — tracks sent emails for debugging and history */
export const emailLogs = pgTable(
  'email_logs',
  {
    id: text('id').primaryKey(),
    to: text('to').notNull(),
    subject: text('subject').notNull(),
    template: text('template').notNull(),
    status: text('status', { enum: ['sent', 'failed'] }).notNull(),
    orderId: text('order_id'),
    error: text('error'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  },
  (t) => [
    index('email_logs_order_idx').on(t.orderId),
    index('email_logs_status_idx').on(t.status),
    index('email_logs_created_idx').on(t.createdAt),
  ]
);