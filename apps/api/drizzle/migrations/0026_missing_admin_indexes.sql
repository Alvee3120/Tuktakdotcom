-- Migration 0026: Missing admin list indexes
-- Adds indexes for admin user listing and order status+created filtering.
-- (contact_message_created_idx, blog_post_published_idx, and
-- newsletter_subscriber_created_idx were added in 0023_performance_indexes.)

CREATE INDEX IF NOT EXISTS `user_created_idx` ON `user` (`created_at`);
CREATE INDEX IF NOT EXISTS `order_status_created_idx` ON `order` (`status`,`created_at`);
