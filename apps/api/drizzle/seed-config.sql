-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Tuktak.com — Feature Config & Dump Data Seed                 ║
-- ║  Covers: Multi-Inventory, Fraud, Accounting, Home Config      ║
-- ║  Run: wrangler d1 execute tuktak-db --local --file=drizzle/seed-config.sql
-- ║  Safe to re-run: clears only the new-feature tables first.    ║
-- ║  Requires demo products (prod-001..prod-015) to be seeded.    ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- STEP 1: CLEAN NEW-FEATURE TABLES (FK-safe order)
-- ═══════════════════════════════════════════════════════════════
DELETE FROM `inventory_stock`;
DELETE FROM `inventory`;
DELETE FROM `purchase`;
DELETE FROM `supplier`;
DELETE FROM `expense`;
DELETE FROM `blocklist`;
DELETE FROM `courier_check_cache`;

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: INVENTORIES (godowns / warehouses)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO `inventory` (`id`, `name`, `location`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
  ('inv-001', 'Dhaka Main Warehouse', 'Tejgaon, Dhaka',    'Primary fulfilment center for the capital region', 1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('inv-002', 'Chittagong Hub',       'Agrabad, Chittagong','Regional stock hub for southern Bangladesh',       1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: PER-INVENTORY STOCK (sums match each product's total stock)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO `inventory_stock` (`id`, `inventory_id`, `product_id`, `quantity`, `created_at`, `updated_at`) VALUES
  ('is-001', 'inv-001', 'prod-001', 15, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('is-002', 'inv-002', 'prod-001', 10, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('is-003', 'inv-001', 'prod-002', 12, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('is-004', 'inv-002', 'prod-002',  6, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('is-005', 'inv-001', 'prod-003', 25, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('is-006', 'inv-002', 'prod-003', 15, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('is-007', 'inv-001', 'prod-004', 10, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('is-008', 'inv-002', 'prod-004',  5, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('is-009', 'inv-001', 'prod-006', 30, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('is-010', 'inv-002', 'prod-006', 20, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('is-011', 'inv-001', 'prod-007', 20, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('is-012', 'inv-002', 'prod-007', 15, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('is-013', 'inv-001', 'prod-009', 40, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('is-014', 'inv-002', 'prod-009', 20, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('is-015', 'inv-001', 'prod-010', 50, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('is-016', 'inv-002', 'prod-010', 30, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z');

-- Keep product.stock consistent with the sum of its inventory allocations
UPDATE `product`
SET `stock` = (SELECT COALESCE(SUM(`quantity`), 0) FROM `inventory_stock` WHERE `inventory_stock`.`product_id` = `product`.`id`)
WHERE `id` IN (SELECT DISTINCT `product_id` FROM `inventory_stock`);

-- ═══════════════════════════════════════════════════════════════
-- STEP 4: SUPPLIERS + PURCHASES (dues)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO `supplier` (`id`, `name`, `phone`, `address`, `note`, `is_active`, `created_at`, `updated_at`) VALUES
  ('sup-001', 'Star Tech Distribution', '+8801710000011', 'Elephant Road, Dhaka', 'Primary phone & laptop supplier', 1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('sup-002', 'Global Gadget Imports',  '+8801710000022', 'Agrabad, Chittagong',  'Audio & accessories importer',    1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z');

INSERT INTO `purchase` (`id`, `supplier_id`, `description`, `total_amount`, `paid_amount`, `date`, `created_at`, `updated_at`) VALUES
  ('pur-001', 'sup-001', '10x Samsung Galaxy S24 Ultra',   950000, 950000, '2025-01-05', '2025-01-05T00:00:00Z', '2025-01-05T00:00:00Z'),
  ('pur-002', 'sup-001', '5x MacBook Air M3 restock',       550000, 300000, '2025-02-02', '2025-02-02T00:00:00Z', '2025-02-02T00:00:00Z'),
  ('pur-003', 'sup-002', '30x Sony WH-1000XM5 + accessories',660000,      0, '2025-02-18', '2025-02-18T00:00:00Z', '2025-02-18T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 5: EXPENSES (operating costs for the P&L)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO `expense` (`id`, `category`, `amount`, `note`, `date`, `created_at`, `updated_at`) VALUES
  ('exp-001', 'Rent',        40000,  'Office & warehouse rent',            '2025-01-01', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('exp-002', 'Salary',      120000, 'Staff salaries',                     '2025-01-05', '2025-01-05T00:00:00Z', '2025-01-05T00:00:00Z'),
  ('exp-003', 'Advertising', 25000,  'Facebook & Google ads',              '2025-01-15', '2025-01-15T00:00:00Z', '2025-01-15T00:00:00Z'),
  ('exp-004', 'Packaging',   8000,   'Boxes, bubble wrap, tape',           '2025-02-03', '2025-02-03T00:00:00Z', '2025-02-03T00:00:00Z'),
  ('exp-005', 'Courier',     15000,  'Courier partner charges',            '2025-02-10', '2025-02-10T00:00:00Z', '2025-02-10T00:00:00Z'),
  ('exp-006', 'Advertising', 30000,  'Eid campaign boost',                 '2025-02-15', '2025-02-15T00:00:00Z', '2025-02-15T00:00:00Z'),
  ('exp-007', 'Utilities',   6000,   'Electricity & internet',             '2025-02-20', '2025-02-20T00:00:00Z', '2025-02-20T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 6: BLOCKLIST (fake-order protection)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO `blocklist` (`id`, `type`, `value`, `reason`, `created_at`) VALUES
  ('bl-001', 'phone', '8801999999999', 'Repeated fake COD orders',   '2025-02-01T00:00:00Z'),
  ('bl-002', 'phone', '8801888888888', 'Flagged by courier history', '2025-02-15T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 7: BACKFILL ORDER COST SNAPSHOTS + INVENTORY ATTRIBUTION
-- (so P&L COGS and the inventory profit report have data)
-- ═══════════════════════════════════════════════════════════════
UPDATE `order_item`
SET `cost` = (SELECT `cost` FROM `product` WHERE `product`.`id` = `order_item`.`product_id`)
WHERE `cost` IS NULL;

UPDATE `order_item` SET `inventory_id` = 'inv-001' WHERE `inventory_id` IS NULL;

-- Flag existing orders as risky (demo for the Fraud Protection page).
-- ID-independent so it works on any seeded order set.
UPDATE `order` SET `risk_score` = 65, `risk_flags` = '["velocity","high_value_cod"]'
WHERE `id` = (SELECT `id` FROM `order` ORDER BY `total` DESC LIMIT 1);
UPDATE `order` SET `risk_score` = 40, `risk_flags` = '["new_account"]'
WHERE `id` = (SELECT `id` FROM `order` WHERE `total` < (SELECT MAX(`total`) FROM `order`) ORDER BY `created_at` DESC LIMIT 1);

-- ═══════════════════════════════════════════════════════════════
-- STEP 8: STOREFRONT & FEATURE SETTINGS (upsert — keeps existing rows)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO `setting` (`key`, `value`, `updated_at`) VALUES
  ('homeConfig', '{"productCardStyle":"compact","sections":{"categoryCircles":{"enabled":true},"flashDeal":{"enabled":true,"title":"Flash Deal","endsAt":"2026-12-31T18:00:00.000Z","productIds":["prod-001","prod-003","prod-006","prod-007","prod-009","prod-010"]},"trending":{"enabled":true,"title":""},"newArrivals":{"enabled":true,"title":""},"showcase":{"enabled":true,"title":"Featured Picks","featureImage":"","productIds":["prod-002","prod-004","prod-008","prod-011"]},"bestsellers":{"enabled":true,"title":""},"promoBanners":{"enabled":true},"brandCarousel":{"enabled":true},"featureBar":{"enabled":true,"items":[]}}}', '2025-03-01T00:00:00Z'),
  ('trackingEnabled',      'true',                                     '2025-03-01T00:00:00Z'),
  ('fraudInternalEnabled', 'true',                                     '2025-03-01T00:00:00Z'),
  ('fraudCourierEnabled',  'false',                                    '2025-03-01T00:00:00Z'),
  ('courierApiUrl',        'https://bdcourier.com/api/courier-check',  '2025-03-01T00:00:00Z')
ON CONFLICT(`key`) DO UPDATE SET `value` = excluded.`value`, `updated_at` = excluded.`updated_at`;

-- ═══════════════════════════════════════════════════════════════
-- DONE — inventory, fraud, accounting and home config are seeded.
-- ═══════════════════════════════════════════════════════════════
