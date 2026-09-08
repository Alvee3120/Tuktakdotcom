-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Tuktak.com — Demo Orders & Reviews                        ║
-- ║  Run AFTER seed-users.sql and seed-demo.sql                 ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- DEMO ORDERS
-- ═══════════════════════════════════════════════════════════════

INSERT OR IGNORE INTO `order` (`id`, `user_id`, `order_number`, `status`, `subtotal`, `discount`, `shipping_cost`, `tax`, `total`, `payment_method`, `payment_status`, `shipping_address_id`, `coupon_code`, `created_at`, `updated_at`) VALUES
  ('order-001', 'user-customer-001', 'TT-2025-0001', 'delivered',  129999, 12999, 0, 0, 117000, 'bkash', 'paid',    'addr-001', 'WELCOME10', '2025-02-01T10:00:00Z', '2025-02-05T14:00:00Z'),
  ('order-002', 'user-customer-001', 'TT-2025-0002', 'shipped',    34999,  0,     99, 0, 35098,  'nagad', 'paid',    'addr-001', NULL,         '2025-02-15T09:30:00Z', '2025-02-17T11:00:00Z'),
  ('order-003', 'user-customer-002', 'TT-2025-0003', 'confirmed',  84999,  500,   0,  0, 84499,  'cod',   'pending', 'addr-003', 'FLAT500',    '2025-02-20T14:00:00Z', '2025-02-20T15:00:00Z'),
  ('order-004', 'user-customer-002', 'TT-2025-0004', 'pending',    14999,  0,     99, 0, 15098,  NULL,    'pending', 'addr-003', NULL,         '2025-02-22T08:00:00Z', '2025-02-22T08:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- ORDER ITEMS
-- ═══════════════════════════════════════════════════════════════

INSERT OR IGNORE INTO `order_item` (`id`, `order_id`, `product_id`, `variant_id`, `name`, `image`, `price`, `quantity`, `created_at`) VALUES
  ('oi-001', 'order-001', 'prod-001', 'var-001', 'Samsung Galaxy S24 Ultra - 256GB Black', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=200&h=200&fit=crop', 129999, 1, '2025-02-01T10:00:00Z'),
  ('oi-002', 'order-002', 'prod-006', 'var-009', 'Sony WH-1000XM5 - Black',               'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=200&h=200&fit=crop', 34999,  1, '2025-02-15T09:30:00Z'),
  ('oi-003', 'order-003', 'prod-011', NULL,       'iPad Air M2',                           'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200&h=200&fit=crop',    84999,  1, '2025-02-20T14:00:00Z'),
  ('oi-004', 'order-004', 'prod-009', NULL,       'JBL Charge 5',                          'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=200&h=200&fit=crop',  14999,  1, '2025-02-22T08:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- REVIEWS
-- ═══════════════════════════════════════════════════════════════

INSERT OR IGNORE INTO `review` (`id`, `product_id`, `user_id`, `order_id`, `rating`, `title`, `body`, `is_approved`, `is_verified_purchase`, `created_at`, `updated_at`) VALUES
  ('rev-001', 'prod-001', 'user-customer-001', 'order-001', 5, 'Best phone I have ever used!', 'The camera is absolutely insane. S Pen integration is perfect for note-taking. Battery lasts all day. Worth every taka!', 1, 1, '2025-02-06T00:00:00Z', '2025-02-06T00:00:00Z'),
  ('rev-002', 'prod-006', 'user-customer-001', 'order-002', 4, 'Amazing ANC but slightly tight', 'Noise cancellation is the best I have tried. Sound quality is superb. Feels a bit tight after 3+ hours. Still recommended.', 1, 1, '2025-02-18T00:00:00Z', '2025-02-18T00:00:00Z'),
  ('rev-003', 'prod-002', 'user-customer-002', NULL, 5, 'iPhone 15 Pro Max is a masterpiece', 'Titanium design feels premium. A17 Pro chip handles everything. The 5x zoom camera is incredible.', 1, 0, '2025-02-12T00:00:00Z', '2025-02-12T00:00:00Z'),
  ('rev-004', 'prod-004', 'user-customer-002', NULL, 5, 'Perfect laptop for everything', 'M3 chip is incredibly fast. Fanless design means zero noise. 18-hour battery actually lasts that long!', 1, 0, '2025-02-16T00:00:00Z', '2025-02-16T00:00:00Z'),
  ('rev-005', 'prod-009', 'user-customer-001', NULL, 4, 'Great speaker for outdoor use', 'Sound is loud and clear. IP67 rating gives peace of mind. Powerbank feature is handy. Could use more bass.', 1, 0, '2025-02-25T00:00:00Z', '2025-02-25T00:00:00Z');
