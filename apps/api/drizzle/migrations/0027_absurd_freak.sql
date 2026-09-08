-- invoice_access_token already exists on remote (added in previous partial apply), skip ALTER
SELECT 1;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `order_status_created_idx` ON `order` (`status`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `order_invoice_token_unique` ON `order` (`invoice_access_token`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `blog_post_published_idx` ON `blog_post` (`is_published`,`published_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `contact_message_created_idx` ON `contact_message` (`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `newsletter_subscriber_created_idx` ON `newsletter_subscriber` (`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_created_idx` ON `user` (`created_at`);