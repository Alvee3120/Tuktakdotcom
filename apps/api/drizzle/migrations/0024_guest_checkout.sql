-- Migration 0024: Guest checkout
-- Allow orders without a user account: `order.user_id` becomes nullable and the
-- order carries guest contact + shipping snapshot columns for anonymous
-- checkouts. SQLite cannot relax a column's NOT NULL in place, so the `order`
-- table is rebuilt (same pattern as 0019).

PRAGMA foreign_keys=OFF;

CREATE TABLE `__new_order` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text,
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
  `guest_name` text,
  `guest_email` text,
  `guest_phone` text,
  `shipping_snapshot` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`shipping_address_id`) REFERENCES `address`(`id`) ON UPDATE no action ON DELETE set null
);
INSERT INTO `__new_order`(`id`, `user_id`, `order_number`, `status`, `subtotal`, `discount`, `shipping_cost`, `tax`, `total`, `payment_method`, `payment_status`, `payment_transaction_id`, `shipping_address_id`, `notes`, `coupon_code`, `risk_score`, `risk_flags`, `created_at`, `updated_at`) SELECT `id`, `user_id`, `order_number`, `status`, `subtotal`, `discount`, `shipping_cost`, `tax`, `total`, `payment_method`, `payment_status`, `payment_transaction_id`, `shipping_address_id`, `notes`, `coupon_code`, `risk_score`, `risk_flags`, `created_at`, `updated_at` FROM `order`;
DROP TABLE `order`;
ALTER TABLE `__new_order` RENAME TO `order`;
CREATE UNIQUE INDEX `order_order_number_unique` ON `order` (`order_number`);
CREATE INDEX `order_user_idx` ON `order` (`user_id`);
CREATE INDEX `order_status_idx` ON `order` (`status`);
CREATE INDEX `order_created_idx` ON `order` (`created_at`);
CREATE INDEX `order_payment_status_idx` ON `order` (`payment_status`);
CREATE INDEX `order_risk_idx` ON `order` (`risk_score`);
CREATE INDEX `order_user_status_idx` ON `order` (`user_id`,`status`);
CREATE INDEX `order_guest_phone_idx` ON `order` (`guest_phone`);

PRAGMA foreign_keys=ON;