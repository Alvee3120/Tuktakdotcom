-- Add DB-level uniqueness guards so concurrent requests cannot create
-- duplicate wishlist entries or duplicate reviews.
--> statement-breakpoint
DROP INDEX IF EXISTS `wishlist_user_product_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `wishlist_user_product_idx` ON `wishlist` (`user_id`,`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `review_user_product_unique` ON `review` (`user_id`,`product_id`);