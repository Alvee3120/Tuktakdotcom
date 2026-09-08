-- Migration 0019: FK cascades + new indexes
-- Apply FK cascade rules and performance indexes

PRAGMA foreign_keys=OFF;

-- Recreate category with FK cascade on parent_id
CREATE TABLE `__new_category` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `slug` text NOT NULL,
  `description` text,
  `image` text,
  `parent_id` text,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `is_active` integer DEFAULT true NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`parent_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null
);
INSERT INTO `__new_category`("id", "name", "slug", "description", "image", "parent_id", "sort_order", "is_active", "created_at", "updated_at") SELECT "id", "name", "slug", "description", "image", "parent_id", "sort_order", "is_active", "created_at", "updated_at" FROM `category`;
DROP TABLE `category`;
ALTER TABLE `__new_category` RENAME TO `category`;
CREATE UNIQUE INDEX `category_slug_unique` ON `category` (`slug`);

-- Recreate product with FK cascades on category_id and brand_id
CREATE TABLE `__new_product` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `name_bn` text,
  `slug` text NOT NULL,
  `description` text,
  `description_bn` text,
  `short_description` text,
  `short_description_bn` text,
  `price` integer NOT NULL,
  `compare_at_price` integer,
  `cost` integer,
  `sku` text,
  `stock` integer DEFAULT 0 NOT NULL,
  `low_stock_threshold` integer DEFAULT 5 NOT NULL,
  `category_id` text,
  `brand_id` text,
  `image` text NOT NULL,
  `images` text,
  `is_active` integer DEFAULT true NOT NULL,
  `is_featured` integer DEFAULT false NOT NULL,
  `weight` integer,
  `rating` integer DEFAULT 0 NOT NULL,
  `review_count` integer DEFAULT 0 NOT NULL,
  `meta_title` text,
  `meta_description` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`brand_id`) REFERENCES `brand`(`id`) ON UPDATE no action ON DELETE set null
);
INSERT INTO `__new_product`("id", "name", "name_bn", "slug", "description", "description_bn", "short_description", "short_description_bn", "price", "compare_at_price", "cost", "sku", "stock", "low_stock_threshold", "category_id", "brand_id", "image", "images", "is_active", "is_featured", "weight", "rating", "review_count", "meta_title", "meta_description", "created_at", "updated_at") SELECT "id", "name", "name_bn", "slug", "description", "description_bn", "short_description", "short_description_bn", "price", "compare_at_price", "cost", "sku", "stock", "low_stock_threshold", "category_id", "brand_id", "image", "images", "is_active", "is_featured", "weight", "rating", "review_count", "meta_title", "meta_description", "created_at", "updated_at" FROM `product`;
DROP TABLE `product`;
ALTER TABLE `__new_product` RENAME TO `product`;
CREATE UNIQUE INDEX `product_slug_unique` ON `product` (`slug`);
CREATE UNIQUE INDEX `product_sku_unique` ON `product` (`sku`);
CREATE INDEX `product_category_idx` ON `product` (`category_id`);
CREATE INDEX `product_brand_idx` ON `product` (`brand_id`);
CREATE INDEX `product_active_idx` ON `product` (`is_active`);
CREATE INDEX `product_featured_idx` ON `product` (`is_featured`);
CREATE INDEX `product_created_idx` ON `product` (`created_at`);

-- Recreate order with FK cascade on shipping_address_id + composite index
CREATE TABLE `__new_order` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `order_number` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `subtotal` integer NOT NULL,
  `discount` integer DEFAULT 0 NOT NULL,
  `shipping_cost` integer DEFAULT 0 NOT NULL,
  `tax` integer DEFAULT 0 NOT NULL,
  `total` integer NOT NULL,
  `payment_method` text,
  `payment_status` text DEFAULT 'pending' NOT NULL,
  `payment_transaction_id` text,
  `shipping_address_id` text,
  `notes` text,
  `coupon_code` text,
  `risk_score` integer,
  `risk_flags` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`shipping_address_id`) REFERENCES `address`(`id`) ON UPDATE no action ON DELETE set null
);
INSERT INTO `__new_order`("id", "user_id", "order_number", "status", "subtotal", "discount", "shipping_cost", "tax", "total", "payment_method", "payment_status", "payment_transaction_id", "shipping_address_id", "notes", "coupon_code", "risk_score", "risk_flags", "created_at", "updated_at") SELECT "id", "user_id", "order_number", "status", "subtotal", "discount", "shipping_cost", "tax", "total", "payment_method", "payment_status", "payment_transaction_id", "shipping_address_id", "notes", "coupon_code", "risk_score", "risk_flags", "created_at", "updated_at" FROM `order`;
DROP TABLE `order`;
ALTER TABLE `__new_order` RENAME TO `order`;
CREATE UNIQUE INDEX `order_order_number_unique` ON `order` (`order_number`);
CREATE INDEX `order_user_idx` ON `order` (`user_id`);
CREATE INDEX `order_status_idx` ON `order` (`status`);
CREATE INDEX `order_created_idx` ON `order` (`created_at`);
CREATE INDEX `order_payment_status_idx` ON `order` (`payment_status`);
CREATE INDEX `order_risk_idx` ON `order` (`risk_score`);
CREATE INDEX `order_user_status_idx` ON `order` (`user_id`,`status`);

-- hero_slide.product_id already exists from 0017, skip adding it

-- New indexes for performance
CREATE INDEX `order_item_order_product_idx` ON `order_item` (`order_id`,`product_id`);
CREATE INDEX `review_user_idx` ON `review` (`user_id`);

PRAGMA foreign_keys=ON;
