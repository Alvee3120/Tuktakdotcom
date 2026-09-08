-- Migration 0023: Performance indexes + settings cache
-- Adds missing indexes for frequently queried columns and settings cache

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS `order_payment_method_idx` ON `order` (`payment_method`);
CREATE INDEX IF NOT EXISTS `user_role_idx` ON `user` (`role`);
CREATE INDEX IF NOT EXISTS `contact_message_created_idx` ON `contact_message` (`created_at`);
CREATE INDEX IF NOT EXISTS `review_product_idx` ON `review` (`product_id`);
CREATE INDEX IF NOT EXISTS `review_approved_idx` ON `review` (`is_approved`);
CREATE INDEX IF NOT EXISTS `newsletter_subscriber_created_idx` ON `newsletter_subscriber` (`created_at`);
CREATE INDEX IF NOT EXISTS `coupon_code_idx` ON `coupon` (`code`);
CREATE INDEX IF NOT EXISTS `coupon_active_idx` ON `coupon` (`is_active`);
CREATE INDEX IF NOT EXISTS `blog_post_published_idx` ON `blog_post` (`is_published`);
CREATE INDEX IF NOT EXISTS `blog_post_slug_idx` ON `blog_post` (`slug`);
CREATE INDEX IF NOT EXISTS `hero_slide_active_idx` ON `hero_slide` (`is_active`);
CREATE INDEX IF NOT EXISTS `hero_slide_sort_idx` ON `hero_slide` (`sort_order`);
CREATE INDEX IF NOT EXISTS `brand_active_idx` ON `brand` (`is_active`);
CREATE INDEX IF NOT EXISTS `category_active_idx` ON `category` (`is_active`);
CREATE INDEX IF NOT EXISTS `product_variant_product_idx` ON `product_variant` (`product_id`);
CREATE INDEX IF NOT EXISTS `product_variant_sku_idx` ON `product_variant` (`sku`);
CREATE INDEX IF NOT EXISTS `inventory_stock_product_idx` ON `inventory_stock` (`product_id`);
CREATE INDEX IF NOT EXISTS `inventory_stock_inventory_idx` ON `inventory_stock` (`inventory_id`);
