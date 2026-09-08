-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Tuktak.com — Complete Database Schema (Consolidated)      ║
-- ║  Database: Cloudflare D1 (SQLite)                          ║
-- ║  Generated from migrations 0000–0008                       ║
-- ║                                                            ║
-- ║  ⚠ HISTORICAL REFERENCE ONLY — DO NOT USE FOR FRESH DBs.   ║
-- ║  It stops at migration 0008; real DDL now lives in         ║
-- ║  drizzle/migrations/ (apply via `wrangler d1 migrations    ║
-- ║  apply`, which follows the journal up to 0023). This file   ║
-- ║  is kept for quick column-name lookups while reviewing      ║
-- ║  seed scripts and old code.                                 ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- SECTION 1: Authentication Tables (Better Auth)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `user` (
  `id`              text PRIMARY KEY NOT NULL,
  `name`            text NOT NULL,
  `email`           text NOT NULL,
  `email_verified`  integer DEFAULT false NOT NULL,
  `image`           text,
  `phone`           text,
  `role`            text DEFAULT 'customer' NOT NULL,  -- admin | moderator | customer
  `banned`          integer DEFAULT false NOT NULL,
  `ban_reason`      text,
  `created_at`      text NOT NULL,
  `updated_at`      text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `user_email_unique` ON `user` (`email`);

CREATE TABLE IF NOT EXISTS `session` (
  `id`                      text PRIMARY KEY NOT NULL,
  `user_id`                 text NOT NULL,
  `token`                   text NOT NULL,
  `expires_at`              text NOT NULL,
  `ip_address`              text,
  `user_agent`              text,
  `active_organization_id`  text,
  `created_at`              text NOT NULL,
  `updated_at`              text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS `session_token_unique` ON `session` (`token`);

CREATE TABLE IF NOT EXISTS `account` (
  `id`                        text PRIMARY KEY NOT NULL,
  `user_id`                   text NOT NULL,
  `account_id`                text NOT NULL,
  `provider_id`               text NOT NULL,
  `access_token`              text,
  `refresh_token`             text,
  `access_token_expires_at`   text,
  `refresh_token_expires_at`  text,
  `scope`                     text,
  `id_token`                  text,
  `password`                  text,
  `created_at`                text NOT NULL,
  `updated_at`                text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `verification` (
  `id`          text PRIMARY KEY NOT NULL,
  `identifier`  text NOT NULL,
  `value`       text NOT NULL,
  `expires_at`  text NOT NULL,
  `created_at`  text NOT NULL,
  `updated_at`  text NOT NULL
);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 2: Catalog Tables (Categories, Brands, Products)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `category` (
  `id`          text PRIMARY KEY NOT NULL,
  `name`        text NOT NULL,
  `slug`        text NOT NULL,
  `description` text,
  `image`       text,
  `parent_id`   text,
  `sort_order`  integer DEFAULT 0 NOT NULL,
  `is_active`   integer DEFAULT true NOT NULL,
  `created_at`  text NOT NULL,
  `updated_at`  text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `category_slug_unique` ON `category` (`slug`);

CREATE TABLE IF NOT EXISTS `brand` (
  `id`          text PRIMARY KEY NOT NULL,
  `name`        text NOT NULL,
  `slug`        text NOT NULL,
  `logo`        text,
  `is_active`   integer DEFAULT true NOT NULL,
  `created_at`  text NOT NULL,
  `updated_at`  text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `brand_slug_unique` ON `brand` (`slug`);

CREATE TABLE IF NOT EXISTS `product` (
  `id`                    text PRIMARY KEY NOT NULL,
  `name`                  text NOT NULL,
  `name_bn`              text,
  `slug`                  text NOT NULL,
  `description`           text,
  `description_bn`       text,
  `short_description`     text,
  `short_description_bn` text,
  `price`                 integer NOT NULL,
  `compare_at_price`      integer,
  `cost`                  integer,
  `sku`                   text,
  `stock`                 integer DEFAULT 0 NOT NULL,
  `low_stock_threshold`   integer DEFAULT 5 NOT NULL,
  `category_id`           text,
  `brand_id`              text,
  `image`                 text NOT NULL,
  `images`                text,  -- JSON array of image URLs
  `is_active`             integer DEFAULT true NOT NULL,
  `is_featured`           integer DEFAULT false NOT NULL,
  `weight`                integer,  -- grams
  `rating`                integer DEFAULT 0 NOT NULL,  -- avg * 100 (e.g. 450 = 4.5)
  `review_count`          integer DEFAULT 0 NOT NULL,
  `meta_title`            text,
  `meta_description`      text,
  `created_at`            text NOT NULL,
  `updated_at`            text NOT NULL,
  FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE no action,
  FOREIGN KEY (`brand_id`) REFERENCES `brand`(`id`) ON DELETE no action
);
CREATE UNIQUE INDEX IF NOT EXISTS `product_slug_unique` ON `product` (`slug`);
CREATE UNIQUE INDEX IF NOT EXISTS `product_sku_unique` ON `product` (`sku`);

CREATE TABLE IF NOT EXISTS `product_variant` (
  `id`                text PRIMARY KEY NOT NULL,
  `product_id`        text NOT NULL,
  `name`              text NOT NULL,
  `sku`               text,
  `price`             integer NOT NULL,
  `compare_at_price`  integer,
  `stock`             integer DEFAULT 0 NOT NULL,
  `low_stock_threshold` integer DEFAULT 5 NOT NULL,
  `image`             text,
  `attributes`        text,  -- JSON: { color, storage, size }
  `is_active`         integer DEFAULT true NOT NULL,
  `created_at`        text NOT NULL,
  `updated_at`        text NOT NULL,
  FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS `product_variant_sku_unique` ON `product_variant` (`sku`);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 3: Order & Commerce Tables
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `address` (
  `id`          text PRIMARY KEY NOT NULL,
  `user_id`     text NOT NULL,
  `label`       text DEFAULT 'Home' NOT NULL,
  `name`        text NOT NULL,
  `phone`       text NOT NULL,
  `street`      text NOT NULL,
  `city`        text NOT NULL,
  `district`    text,
  `postal_code` text,
  `is_default`  integer DEFAULT false NOT NULL,
  `created_at`  text NOT NULL,
  `updated_at`  text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `order` (
  `id`                      text PRIMARY KEY NOT NULL,
  `user_id`                 text,
  `order_number`            text NOT NULL,
  `status`                  text DEFAULT 'pending' NOT NULL,  -- pending|confirmed|processing|shipped|delivered|cancelled|refunded
  `subtotal`                integer NOT NULL,
  `discount`                integer DEFAULT 0 NOT NULL,
  `shipping_cost`           integer DEFAULT 0 NOT NULL,
  `tax`                     integer DEFAULT 0 NOT NULL,
  `total`                   integer NOT NULL,
  `payment_method`          text,  -- bkash|nagad|sslcommerz|cod
  `payment_status`          text DEFAULT 'pending' NOT NULL,  -- pending|paid|failed|refunded
  `payment_transaction_id`  text,
  `shipping_address_id`     text,
  `notes`                   text,
  `coupon_code`             text,
  `risk_score`              integer,
  `risk_flags`              text,
  `guest_name`              text,
  `guest_email`             text,
  `guest_phone`             text,
  `shipping_snapshot`       text,
  `created_at`              text NOT NULL,
  `updated_at`              text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade,
  FOREIGN KEY (`shipping_address_id`) REFERENCES `address`(`id`) ON DELETE no action
);
CREATE UNIQUE INDEX IF NOT EXISTS `order_order_number_unique` ON `order` (`order_number`);
CREATE INDEX IF NOT EXISTS `order_guest_phone_idx` ON `order` (`guest_phone`);

CREATE TABLE IF NOT EXISTS `order_item` (
  `id`          text PRIMARY KEY NOT NULL,
  `order_id`    text NOT NULL,
  `product_id`  text NOT NULL,
  `variant_id`  text,
  `name`        text NOT NULL,
  `image`       text NOT NULL,
  `price`       integer NOT NULL,
  `quantity`    integer NOT NULL,
  `created_at`  text NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON DELETE cascade,
  FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE no action,
  FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `coupon` (
  `id`                  text PRIMARY KEY NOT NULL,
  `code`                text NOT NULL,
  `description`         text,
  `type`                text NOT NULL,  -- percentage | fixed
  `value`               integer NOT NULL,
  `min_order_amount`    integer DEFAULT 0 NOT NULL,
  `max_discount_amount` integer,
  `usage_limit`         integer,
  `usage_count`         integer DEFAULT 0 NOT NULL,
  `is_active`           integer DEFAULT true NOT NULL,
  `starts_at`           text,
  `expires_at`          text,
  `created_at`          text NOT NULL,
  `updated_at`          text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `coupon_code_unique` ON `coupon` (`code`);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 4: Reviews & Wishlist
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `review` (
  `id`                    text PRIMARY KEY NOT NULL,
  `product_id`            text NOT NULL,
  `user_id`              text NOT NULL,
  `order_id`              text,
  `rating`                integer NOT NULL,  -- 1-5
  `title`                 text,
  `body`                  text,
  `is_approved`           integer DEFAULT false NOT NULL,
  `is_verified_purchase`  integer DEFAULT false NOT NULL,
  `created_at`            text NOT NULL,
  `updated_at`            text NOT NULL,
  FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade,
  FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `wishlist` (
  `id`          text PRIMARY KEY NOT NULL,
  `user_id`     text NOT NULL,
  `product_id`  text NOT NULL,
  `created_at`  text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade,
  FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE cascade
);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 5: CMS & Marketing Tables
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `hero_slide` (
  `id`                  text PRIMARY KEY NOT NULL,
  `title`               text NOT NULL,
  `subtitle`            text,
  `description`         text,
  `image`               text NOT NULL,
  `cta_text`            text,
  `cta_link`            text,
  `cta_secondary_text`  text,
  `cta_secondary_link`  text,
  `overlay_color`       text DEFAULT 'from-black/60 to-transparent',
  `text_align`          text DEFAULT 'left',  -- left | center | right
  `text_color`          text DEFAULT '#ffffff',
  `badge`               text,
  `badge_variant`       text DEFAULT 'default',  -- default|secondary|destructive|outline
  `sort_order`          integer DEFAULT 0 NOT NULL,
  `is_active`           integer DEFAULT true NOT NULL,
  `created_at`          text NOT NULL,
  `updated_at`          text NOT NULL
);

CREATE TABLE IF NOT EXISTS `blog_post` (
  `id`            text PRIMARY KEY NOT NULL,
  `title`         text NOT NULL,
  `slug`          text NOT NULL,
  `excerpt`       text,
  `content`       text NOT NULL,
  `image`         text,
  `author`        text DEFAULT 'Tuktak' NOT NULL,
  `tags`          text,
  `published_at`  text,
  `is_published`  integer DEFAULT false NOT NULL,
  `created_at`    text NOT NULL,
  `updated_at`    text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `blog_post_slug_unique` ON `blog_post` (`slug`);

CREATE TABLE IF NOT EXISTS `contact_message` (
  `id`          text PRIMARY KEY NOT NULL,
  `name`        text NOT NULL,
  `email`       text NOT NULL,
  `subject`     text,
  `message`     text NOT NULL,
  `is_read`     integer DEFAULT false NOT NULL,
  `replied_at`  text,
  `created_at`  text NOT NULL,
  `updated_at`  text NOT NULL
);

CREATE TABLE IF NOT EXISTS `newsletter_subscriber` (
  `id`          text PRIMARY KEY NOT NULL,
  `email`       text NOT NULL,
  `is_active`   integer DEFAULT true NOT NULL,
  `created_at`  text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `newsletter_subscriber_email_unique` ON `newsletter_subscriber` (`email`);

CREATE TABLE IF NOT EXISTS `setting` (
  `key`         text PRIMARY KEY NOT NULL,
  `value`       text NOT NULL,
  `updated_at`  text NOT NULL
);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 6: Multi-Inventory (migration 0005)
-- ═══════════════════════════════════════════════════════════════

-- NOTE: `product` also has a nullable `cost` (integer) column and
-- `order_item` has nullable `inventory_id` (text) + `cost` (integer)
-- columns; `order` has nullable `risk_score` (integer) + `risk_flags`
-- (text JSON) columns. See migrations 0005–0006 for the ALTER TABLEs.

CREATE TABLE IF NOT EXISTS `inventory` (
  `id`          text PRIMARY KEY NOT NULL,
  `name`        text NOT NULL,
  `location`    text,
  `description` text,
  `is_active`   integer DEFAULT true NOT NULL,
  `created_at`  text NOT NULL,
  `updated_at`  text NOT NULL
);

CREATE TABLE IF NOT EXISTS `inventory_stock` (
  `id`           text PRIMARY KEY NOT NULL,
  `inventory_id` text NOT NULL,
  `product_id`   text NOT NULL,
  `quantity`     integer DEFAULT 0 NOT NULL,
  `created_at`   text NOT NULL,
  `updated_at`   text NOT NULL,
  FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`id`) ON DELETE cascade,
  FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS `inv_stock_unique` ON `inventory_stock` (`inventory_id`,`product_id`);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 7: Fraud Protection (migration 0006)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `blocklist` (
  `id`         text PRIMARY KEY NOT NULL,
  `type`       text NOT NULL,  -- phone | ip
  `value`      text NOT NULL,
  `reason`     text,
  `created_at` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `blocklist_unique` ON `blocklist` (`type`,`value`);

CREATE TABLE IF NOT EXISTS `courier_check_cache` (
  `phone`      text PRIMARY KEY NOT NULL,
  `data`       text NOT NULL,
  `checked_at` text NOT NULL
);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 8: Accounting (migration 0007)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `expense` (
  `id`         text PRIMARY KEY NOT NULL,
  `category`   text NOT NULL,
  `amount`     integer NOT NULL,
  `note`       text,
  `date`       text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
CREATE INDEX IF NOT EXISTS `expense_date_idx` ON `expense` (`date`);

CREATE TABLE IF NOT EXISTS `supplier` (
  `id`         text PRIMARY KEY NOT NULL,
  `name`       text NOT NULL,
  `phone`      text,
  `address`    text,
  `note`       text,
  `is_active`  integer DEFAULT true NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `purchase` (
  `id`           text PRIMARY KEY NOT NULL,
  `supplier_id`  text NOT NULL,
  `description`  text,
  `total_amount` integer NOT NULL,
  `paid_amount`  integer DEFAULT 0 NOT NULL,
  `date`         text NOT NULL,
  `created_at`   text NOT NULL,
  `updated_at`   text NOT NULL,
  FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON DELETE cascade
);

-- ═══════════════════════════════════════════════════════════
-- SECTION: Performance Indexes (migration 0008)
-- Hot query paths: order lists/filters, dashboard stats, product
-- filters, review lookups — index scans instead of full-table scans.
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS `address_user_idx` ON `address` (`user_id`);
CREATE INDEX IF NOT EXISTS `inv_stock_product_idx` ON `inventory_stock` (`product_id`);
CREATE INDEX IF NOT EXISTS `order_item_order_idx` ON `order_item` (`order_id`);
CREATE INDEX IF NOT EXISTS `order_item_product_idx` ON `order_item` (`product_id`);
CREATE INDEX IF NOT EXISTS `order_user_idx` ON `order` (`user_id`);
CREATE INDEX IF NOT EXISTS `order_status_idx` ON `order` (`status`);
CREATE INDEX IF NOT EXISTS `order_created_idx` ON `order` (`created_at`);
CREATE INDEX IF NOT EXISTS `order_payment_status_idx` ON `order` (`payment_status`);
CREATE INDEX IF NOT EXISTS `order_risk_idx` ON `order` (`risk_score`);
CREATE INDEX IF NOT EXISTS `variant_product_idx` ON `product_variant` (`product_id`);
CREATE INDEX IF NOT EXISTS `product_category_idx` ON `product` (`category_id`);
CREATE INDEX IF NOT EXISTS `product_brand_idx` ON `product` (`brand_id`);
CREATE INDEX IF NOT EXISTS `product_active_idx` ON `product` (`is_active`);
CREATE INDEX IF NOT EXISTS `product_featured_idx` ON `product` (`is_featured`);
CREATE INDEX IF NOT EXISTS `product_created_idx` ON `product` (`created_at`);
CREATE INDEX IF NOT EXISTS `purchase_supplier_idx` ON `purchase` (`supplier_id`);
CREATE INDEX IF NOT EXISTS `review_product_idx` ON `review` (`product_id`);
CREATE INDEX IF NOT EXISTS `review_product_approved_idx` ON `review` (`product_id`,`is_approved`);
CREATE INDEX IF NOT EXISTS `session_user_id_idx` ON `session` (`user_id`);
CREATE INDEX IF NOT EXISTS `wishlist_user_product_idx` ON `wishlist` (`user_id`,`product_id`);

-- ═══════════════════════════════════════════════════════════════
-- VARIANT TYPES (Structured variant groups per product)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `variant_type` (
  `id`          text PRIMARY KEY NOT NULL,
  `product_id`  text NOT NULL,
  `name`        text NOT NULL,         -- e.g. "Color", "Size", "Storage"
  `type`        text DEFAULT 'custom' NOT NULL,  -- color|size|storage|material|custom
  `sort_order`  integer DEFAULT 0 NOT NULL,
  `created_at`  text NOT NULL,
  `updated_at`  text NOT NULL,
  FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `variant_type_product_idx` ON `variant_type` (`product_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `variant_type_product_name_idx` ON `variant_type` (`product_id`, `name`);

-- Variant Options: individual options within a variant type group
CREATE TABLE IF NOT EXISTS `variant_option` (
  `id`                text PRIMARY KEY NOT NULL,
  `variant_type_id`   text NOT NULL,
  `name`              text NOT NULL,         -- e.g. "Red", "XL", "256GB"
  `value`             text,                  -- e.g. "#FF0000" for colors
  `sort_order`        integer DEFAULT 0 NOT NULL,
  `created_at`        text NOT NULL,
  `updated_at`        text NOT NULL,
  FOREIGN KEY (`variant_type_id`) REFERENCES `variant_type`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `variant_option_type_idx` ON `variant_option` (`variant_type_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `variant_option_type_name_idx` ON `variant_option` (`variant_type_id`, `name`);
