-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Tuktak.com — Demo Users Seed                              ║
-- ║  Run: wrangler d1 execute tuktak-db --local --file=...     ║
-- ║                                                            ║
-- ║  Passwords (set via /api/seed-users endpoint):             ║
-- ║    Admin:     Admin@123                                    ║
-- ║    Moderator: Moderator@123                                ║
-- ║    Customer:  Customer@123                                 ║
-- ╚══════════════════════════════════════════════════════════════╝

PRAGMA foreign_keys = OFF;

-- Remove existing demo data (explicit child deletes for D1 compatibility)
-- Also clear dependent rows that would block FK deletes (orders, reviews, wishlist, verification)
DELETE FROM `wishlist` WHERE `user_id` IN ('user-admin-001', 'user-mod-001', 'user-customer-001', 'user-customer-002');
DELETE FROM `review` WHERE `user_id` IN ('user-admin-001', 'user-mod-001', 'user-customer-001', 'user-customer-002');
DELETE FROM `order_item` WHERE `order_id` IN (SELECT `id` FROM `order` WHERE `user_id` IN ('user-admin-001', 'user-mod-001', 'user-customer-001', 'user-customer-002'));
DELETE FROM `order` WHERE `user_id` IN ('user-admin-001', 'user-mod-001', 'user-customer-001', 'user-customer-002');
DELETE FROM `verification` WHERE `identifier` LIKE '%user-admin-001%' OR `identifier` LIKE '%user-mod-001%' OR `identifier` LIKE '%user-customer-001%' OR `identifier` LIKE '%user-customer-002%';
DELETE FROM `address` WHERE `user_id` IN ('user-admin-001', 'user-mod-001', 'user-customer-001', 'user-customer-002');
DELETE FROM `account` WHERE `user_id` IN ('user-admin-001', 'user-mod-001', 'user-customer-001', 'user-customer-002');
DELETE FROM `session` WHERE `user_id` IN ('user-admin-001', 'user-mod-001', 'user-customer-001', 'user-customer-002');
DELETE FROM `user` WHERE `id` IN ('user-admin-001', 'user-mod-001', 'user-customer-001', 'user-customer-002');
DELETE FROM `user` WHERE `email` IN ('admin@tuktak.com', 'moderator@tuktak.com', 'john@example.com', 'jane@example.com');

PRAGMA foreign_keys = ON;

-- ═══════════════════════════════════════════════════════════════
-- USERS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `user` (`id`, `name`, `email`, `email_verified`, `image`, `phone`, `role`, `banned`, `created_at`, `updated_at`) VALUES
  ('user-admin-001',     'Admin Tuktak',     'admin@tuktak.com',      1, 'https://ui-avatars.com/api/?name=Admin+Tuktak&background=6366f1&color=fff&size=128',      '+8801700000001', 'admin',     0, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('user-mod-001',       'Moderator One',    'moderator@tuktak.com',  1, 'https://ui-avatars.com/api/?name=Moderator+One&background=8b5cf6&color=fff&size=128',     '+8801700000002', 'moderator', 0, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('user-customer-001',  'John Doe',         'john@example.com',      1, 'https://ui-avatars.com/api/?name=John+Doe&background=10b981&color=fff&size=128',          '+8801711111111', 'customer',  0, '2025-01-15T00:00:00Z', '2025-01-15T00:00:00Z'),
  ('user-customer-002',  'Jane Smith',       'jane@example.com',      1, 'https://ui-avatars.com/api/?name=Jane+Smith&background=f59e0b&color=fff&size=128',        '+8801722222222', 'customer',  0, '2025-02-01T00:00:00Z', '2025-02-01T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- ACCOUNTS (credential provider — passwords set by /api/seed-users)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `account` (`id`, `user_id`, `account_id`, `provider_id`, `created_at`, `updated_at`) VALUES
  ('acc-admin-001',    'user-admin-001',    'user-admin-001',    'credential', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('acc-mod-001',      'user-mod-001',      'user-mod-001',      'credential', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('acc-customer-001', 'user-customer-001', 'user-customer-001', 'credential', '2025-01-15T00:00:00Z', '2025-01-15T00:00:00Z'),
  ('acc-customer-002', 'user-customer-002', 'user-customer-002', 'credential', '2025-02-01T00:00:00Z', '2025-02-01T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- ADDRESSES (for customer demo orders)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `address` (`id`, `user_id`, `label`, `name`, `phone`, `street`, `city`, `district`, `postal_code`, `is_default`, `created_at`, `updated_at`) VALUES
  ('addr-001', 'user-customer-001', 'Home',   'John Doe',   '+8801711111111', '123 Gulshan Avenue',    'Dhaka', 'Dhaka',      '1212', 1, '2025-01-15T00:00:00Z', '2025-01-15T00:00:00Z'),
  ('addr-002', 'user-customer-001', 'Office', 'John Doe',   '+8801711111111', '456 Banani Road 11',    'Dhaka', 'Dhaka',      '1213', 0, '2025-01-15T00:00:00Z', '2025-01-15T00:00:00Z'),
  ('addr-003', 'user-customer-002', 'Home',   'Jane Smith', '+8801722222222', '789 Dhanmondi Road 27', 'Dhaka', 'Dhaka',      '1209', 1, '2025-02-01T00:00:00Z', '2025-02-01T00:00:00Z');
