-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Tuktak.com — Demo Data Seed (Full Reset + Demo Data)      ║
-- ║  Run (local): wrangler d1 execute tuktak-db --local --file=...   ║
-- ║  Run (prod):  wrangler d1 execute tuktak-db --remote --file=...  ║
-- ║                                                            ║
-- ║  WARNING: This TRUNCATES every table, including all user   ║
-- ║  accounts, existing settings and dynamic content, then      ║
-- ║  re-seeds a fresh demo catalog. Only for empty/POC DBs.     ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- STEP 1: CLEAN EXISTING DATA (FK-safe deletion order)
-- ═══════════════════════════════════════════════════════════════

DELETE FROM `wishlist`;
DELETE FROM `review`;
DELETE FROM `order_item`;
DELETE FROM `order`;
DELETE FROM `product_variant`;
DELETE FROM `product`;
DELETE FROM `brand`;
DELETE FROM `category`;
DELETE FROM `coupon`;
DELETE FROM `hero_slide`;
DELETE FROM `blog_post`;
DELETE FROM `contact_message`;
DELETE FROM `newsletter_subscriber`;
DELETE FROM `setting`;
DELETE FROM `address`;
DELETE FROM `session`;
DELETE FROM `account`;
DELETE FROM `verification`;
DELETE FROM `user`;

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: DEMO USERS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `user` (`id`, `name`, `email`, `email_verified`, `image`, `phone`, `role`, `banned`, `created_at`, `updated_at`) VALUES
  ('user-admin-001', 'Admin User', 'admin@tuktak.com', 1, NULL, '+8801700000001', 'admin', 0, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('user-mod-001', 'Moderator User', 'moderator@tuktak.com', 1, NULL, '+8801700000002', 'moderator', 0, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('user-customer-001', 'John Doe', 'john@example.com', 1, NULL, '+8801711111111', 'customer', 0, '2025-01-05T00:00:00Z', '2025-01-05T00:00:00Z'),
  ('user-customer-002', 'Jane Smith', 'jane@example.com', 1, NULL, '+8801722222222', 'customer', 0, '2025-01-08T00:00:00Z', '2025-01-08T00:00:00Z');

-- Password accounts (password = "Demo@12345" hashed with bcrypt - placeholder for Better Auth)
INSERT INTO `account` (`id`, `user_id`, `account_id`, `provider_id`, `password`, `created_at`, `updated_at`) VALUES
  ('acc-admin-001', 'user-admin-001', 'user-admin-001', 'credential', '$2b$10$placeholder_hash_admin', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('acc-mod-001', 'user-mod-001', 'user-mod-001', 'credential', '$2b$10$placeholder_hash_mod', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('acc-customer-001', 'user-customer-001', 'user-customer-001', 'credential', '$2b$10$placeholder_hash_c1', '2025-01-05T00:00:00Z', '2025-01-05T00:00:00Z'),
  ('acc-customer-002', 'user-customer-002', 'user-customer-002', 'credential', '$2b$10$placeholder_hash_c2', '2025-01-08T00:00:00Z', '2025-01-08T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: CATEGORIES
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `category` (`id`, `name`, `slug`, `description`, `image`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
  ('cat-001', 'Smartphones',       'smartphones',       'Latest smartphones from top brands',                   'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop', 1,  1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('cat-002', 'Laptops',           'laptops',           'High-performance laptops for work and gaming',         'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop', 2,  1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('cat-003', 'Headphones',        'headphones',        'Premium headphones and earbuds',                       'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop', 3,  1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('cat-004', 'Smartwatches',      'smartwatches',      'Fitness trackers and smartwatches',                    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop', 4,  1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('cat-005', 'Tablets',           'tablets',           'Tablets for entertainment and productivity',           'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop', 5,  1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('cat-006', 'Cameras',           'cameras',           'DSLR, mirrorless, and action cameras',                 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop', 6,  1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('cat-007', 'Speakers',          'speakers',          'Bluetooth and smart speakers',                         'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop', 7,  1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('cat-008', 'Gaming',            'gaming',            'Gaming accessories and consoles',                      'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&h=400&fit=crop', 8,  1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('cat-009', 'Accessories',       'accessories',       'Phone cases, chargers, cables and more',               'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=400&h=400&fit=crop', 9,  1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('cat-010', 'Power Banks',       'power-banks',       'Portable chargers and power banks',                    'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=400&fit=crop', 10, 1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('cat-011', 'Smart Home',        'smart-home',        'Smart home devices and IoT gadgets',                   'https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=400&h=400&fit=crop', 11, 1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 4: BRANDS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `brand` (`id`, `name`, `slug`, `logo`, `is_active`, `created_at`, `updated_at`) VALUES
  ('brand-001', 'Samsung',    'samsung',    'https://placehold.co/200x80/1428a0/ffffff?text=Samsung',    1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('brand-002', 'Apple',      'apple',      'https://placehold.co/200x80/000000/ffffff?text=Apple',      1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('brand-003', 'Xiaomi',     'xiaomi',     'https://placehold.co/200x80/ff6900/ffffff?text=Xiaomi',     1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('brand-004', 'Sony',       'sony',       'https://placehold.co/200x80/000000/ffffff?text=Sony',       1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('brand-005', 'OnePlus',    'oneplus',    'https://placehold.co/200x80/e50000/ffffff?text=OnePlus',    1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('brand-006', 'JBL',        'jbl',        'https://placehold.co/200x80/ff6600/ffffff?text=JBL',        1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('brand-007', 'Anker',      'anker',      'https://placehold.co/200x80/0066cc/ffffff?text=Anker',      1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('brand-008', 'Realme',     'realme',     'https://placehold.co/200x80/f5c518/000000?text=Realme',     1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('brand-009', 'Google',     'google',     'https://placehold.co/200x80/4285f4/ffffff?text=Google',     1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('brand-010', 'Nothing',    'nothing',    'https://placehold.co/200x80/000000/ffffff?text=Nothing',    1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 5: PRODUCTS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `product` (`id`, `name`, `name_bn`, `slug`, `description`, `description_bn`, `short_description`, `short_description_bn`, `price`, `compare_at_price`, `cost`, `sku`, `stock`, `low_stock_threshold`, `category_id`, `brand_id`, `image`, `images`, `is_active`, `is_featured`, `weight`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
  ('prod-001', 'Samsung Galaxy S24 Ultra', 'স্যামসাং গ্যালাক্সি S24 আল্ট্রা', 'samsung-galaxy-s24-ultra',
    'The ultimate Galaxy experience with S Pen, 200MP camera, and Titanium frame.',
    'S Pen, 200MP ক্যামেরা এবং টাইটানিয়াম ফ্রেম সহ চূড়ান্ত গ্যালাক্সি অভিজ্ঞতা।',
    'Flagship smartphone with S Pen & 200MP camera',
    'S Pen এবং 200MP ক্যামেরা সহ ফ্ল্যাগশিপ স্মার্টফোন',
    129999, 149999, 95000, 'SAM-S24U-256', 25, 5, 'cat-001', 'brand-001',
    'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&h=600&fit=crop',
    '["https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&h=800&fit=crop","https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=800&h=800&fit=crop"]',
    1, 1, 232, 450, 128, '2025-01-10T00:00:00Z', '2025-01-10T00:00:00Z'),

  ('prod-002', 'iPhone 15 Pro Max', 'আইফোন ১৫ প্রো ম্যাক্স', 'iphone-15-pro-max',
    'Forged in titanium. Features A17 Pro chip and the most powerful iPhone camera system ever.',
    'টাইটানিয়ামে তৈরি। A17 Pro চিপ এবং সবচেয়ে শক্তিশালী আইফোন ক্যামেরা সিস্টেম।',
    'Apple flagship with A17 Pro chip & titanium design',
    'A17 Pro চিপ ও টাইটানিয়াম ডিজাইন সহ অ্যাপল ফ্ল্যাগশিপ',
    159999, 174999, 120000, 'APL-15PM-256', 18, 5, 'cat-001', 'brand-002',
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&h=600&fit=crop',
    '["https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=800&fit=crop","https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=800&h=800&fit=crop"]',
    1, 1, 221, 470, 95, '2025-01-10T00:00:00Z', '2025-01-10T00:00:00Z'),

  ('prod-003', 'Xiaomi 14 Pro', 'শাওমি ১৪ প্রো', 'xiaomi-14-pro',
    'Leica optics meets Snapdragon 8 Gen 3. Ultra-fast charging and professional-grade photography.',
    'লাইকা অপটিক্স এবং স্ন্যাপড্রাগন 8 Gen 3 এর মিলন।',
    'Leica camera phone with Snapdragon 8 Gen 3',
    'লাইকা ক্যামেরা ফোন স্ন্যাপড্রাগন 8 Gen 3 সহ',
    79999, 89999, 55000, 'XMI-14P-256', 40, 5, 'cat-001', 'brand-003',
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&h=600&fit=crop',
    '["https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&h=800&fit=crop","https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800&h=800&fit=crop"]',
    1, 1, 223, 430, 67, '2025-01-12T00:00:00Z', '2025-01-12T00:00:00Z'),

  ('prod-004', 'MacBook Air M3', 'ম্যাকবুক এয়ার M3', 'macbook-air-m3',
    'Impossibly thin. Incredibly powerful. M3 chip with up to 18 hours of battery life.',
    'অবিশ্বাস্যভাবে পাতলা। অবিশ্বাস্যভাবে শক্তিশালী। M3 চিপ সহ নতুন ম্যাকবুক এয়ার।',
    'M3 chip, 18hr battery, Liquid Retina display',
    'M3 চিপ, ১৮ ঘন্টা ব্যাটারি, লিকুইড রেটিনা ডিসপ্লে',
    149999, 164999, 110000, 'APL-MBA-M3-256', 15, 3, 'cat-002', 'brand-002',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=600&fit=crop',
    '["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=800&fit=crop","https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&h=800&fit=crop"]',
    1, 1, 1240, 480, 54, '2025-01-15T00:00:00Z', '2025-01-15T00:00:00Z'),

  ('prod-005', 'Samsung Galaxy Book4 Pro', 'স্যামসাং গ্যালাক্সি বুক৪ প্রো', 'samsung-galaxy-book4-pro',
    'Ultra-slim laptop with Intel Core Ultra processor and Dynamic AMOLED 2X display.',
    'Intel Core Ultra প্রসেসর সহ অতি-পাতলা ল্যাপটপ।',
    'Intel Core Ultra, AMOLED display, Galaxy AI',
    'Intel Core Ultra, AMOLED ডিসপ্লে, গ্যালাক্সি AI',
    134999, 149999, 98000, 'SAM-GB4P-512', 12, 3, 'cat-002', 'brand-001',
    'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=600&h=600&fit=crop',
    '["https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=800&h=800&fit=crop","https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&h=800&fit=crop"]',
    1, 0, 1370, 420, 31, '2025-01-18T00:00:00Z', '2025-01-18T00:00:00Z'),

  ('prod-006', 'Sony WH-1000XM5', 'সনি WH-1000XM5', 'sony-wh-1000xm5',
    'Industry-leading noise cancellation. 30-hour battery life and crystal clear calling.',
    'শিল্পের সেরা নয়েজ ক্যান্সেলেশন। ৩০ ঘন্টা ব্যাটারি লাইফ।',
    'Best-in-class ANC with 30hr battery',
    'সেরা ANC ৩০ ঘন্টা ব্যাটারি সহ',
    34999, 39999, 22000, 'SNY-XM5-BLK', 50, 10, 'cat-003', 'brand-004',
    'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&h=600&fit=crop',
    '["https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&h=800&fit=crop","https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&h=800&fit=crop"]',
    1, 1, 250, 460, 203, '2025-01-20T00:00:00Z', '2025-01-20T00:00:00Z'),

  ('prod-007', 'Apple AirPods Pro 2', 'অ্যাপল এয়ারপডস প্রো ২', 'apple-airpods-pro-2',
    'Rebuilt from the sound up. Adaptive Audio and 2x more Active Noise Cancellation.',
    'শব্দ থেকে পুনর্নির্মিত। অ্যাডাপটিভ অডিও এবং ২ গুণ বেশি নয়েজ ক্যান্সেলেশন।',
    'Adaptive Audio with USB-C MagSafe case',
    'USB-C MagSafe কেস সহ অ্যাডাপটিভ অডিও',
    27999, 32999, 18000, 'APL-APP2-USBC', 35, 10, 'cat-003', 'brand-002',
    'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600&h=600&fit=crop',
    '["https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&h=800&fit=crop","https://images.unsplash.com/photo-1588423771073-b8903fde1c68?w=800&h=800&fit=crop"]',
    1, 1, 51, 440, 156, '2025-01-22T00:00:00Z', '2025-01-22T00:00:00Z'),

  ('prod-008', 'Apple Watch Ultra 2', 'অ্যাপল ওয়াচ আল্ট্রা ২', 'apple-watch-ultra-2',
    'The most rugged Apple Watch. 49mm titanium case, precision GPS, 36 hours battery.',
    'সবচেয়ে শক্তিশালী অ্যাপল ওয়াচ। ৪৯mm টাইটানিয়াম, ৩৬ ঘন্টা ব্যাটারি।',
    '49mm titanium with 36hr battery & precision GPS',
    '৪৯mm টাইটানিয়াম ৩৬ ঘন্টা ব্যাটারি ও GPS সহ',
    89999, 99999, 62000, 'APL-WU2-49', 20, 5, 'cat-004', 'brand-002',
    'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=600&h=600&fit=crop',
    '["https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&h=800&fit=crop","https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=800&h=800&fit=crop"]',
    1, 1, 61, 460, 89, '2025-02-01T00:00:00Z', '2025-02-01T00:00:00Z'),

  ('prod-009', 'JBL Charge 5', 'জেবিএল চার্জ ৫', 'jbl-charge-5',
    'Portable Bluetooth speaker with JBL Pro Sound, 20 hours playtime, IP67 waterproof.',
    'শক্তিশালী JBL Pro Sound সহ পোর্টেবল ব্লুটুথ স্পিকার। ২০ ঘন্টা প্লেটাইম।',
    'IP67 waterproof speaker with 20hr playtime',
    'IP67 ওয়াটারপ্রুফ স্পিকার ২০ ঘন্টা প্লেটাইম সহ',
    14999, 17999, 9500, 'JBL-CHG5-BLK', 60, 10, 'cat-007', 'brand-006',
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&h=600&fit=crop',
    '["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&h=800&fit=crop","https://images.unsplash.com/photo-1589003077984-894e133dabab?w=800&h=800&fit=crop"]',
    1, 0, 960, 440, 312, '2025-02-05T00:00:00Z', '2025-02-05T00:00:00Z'),

  ('prod-010', 'Anker PowerCore 26800mAh', 'অ্যাঙ্কার পাওয়ারকোর ২৬৮০০', 'anker-powercore-26800',
    'Ultra-high capacity 26800mAh portable charger. Charges iPhone 15 over 6 times.',
    'অতি-উচ্চ ক্ষমতা ২৬৮০০mAh পোর্টেবল চার্জার। আইফোন ৬ বার চার্জ করে।',
    '26800mAh with dual USB & fast charging',
    '২৬৮০০mAh ডুয়াল USB ও ফাস্ট চার্জিং সহ',
    4999, 6999, 3200, 'ANK-PC-26800', 80, 15, 'cat-010', 'brand-007',
    'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&h=600&fit=crop',
    '["https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&h=800&fit=crop","https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&h=800&fit=crop"]',
    1, 0, 495, 430, 567, '2025-02-08T00:00:00Z', '2025-02-08T00:00:00Z'),

  ('prod-011', 'iPad Air M2', 'আইপ্যাড এয়ার M2', 'ipad-air-m2',
    'Supercharged by M2. Powerful enough for all your creative work. 11-inch Liquid Retina.',
    'M2 দ্বারা সুপারচার্জড। ১১ ইঞ্চি লিকুইড রেটিনা ডিসপ্লে।',
    '11" Liquid Retina, M2 chip, Apple Pencil Pro',
    '১১" লিকুইড রেটিনা, M2 চিপ, অ্যাপল পেনসিল প্রো',
    84999, 94999, 62000, 'APL-IPA-M2-128', 22, 5, 'cat-005', 'brand-002',
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&h=600&fit=crop',
    '["https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&h=800&fit=crop","https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&h=800&fit=crop"]',
    1, 1, 462, 450, 72, '2025-02-10T00:00:00Z', '2025-02-10T00:00:00Z'),

  ('prod-012', 'Sony DualSense Controller', 'সনি ডুয়ালসেন্স কন্ট্রোলার', 'sony-dualsense-controller',
    'Haptic feedback, adaptive triggers, and built-in microphone. Designed for PS5.',
    'হ্যাপটিক ফিডব্যাক, অ্যাডাপটিভ ট্রিগার এবং বিল্ট-ইন মাইক্রোফোন।',
    'PS5 controller with haptic feedback & adaptive triggers',
    'হ্যাপটিক ফিডব্যাক ও অ্যাডাপটিভ ট্রিগার সহ PS5 কন্ট্রোলার',
    6999, 7999, 4500, 'SNY-DS-WHT', 45, 10, 'cat-008', 'brand-004',
    'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600&h=600&fit=crop',
    '["https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&h=800&fit=crop","https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=800&h=800&fit=crop"]',
    1, 0, 280, 450, 189, '2025-02-12T00:00:00Z', '2025-02-12T00:00:00Z'),

  ('prod-013', 'Sony Alpha A7 IV', 'সনি আলফা A7 IV', 'sony-alpha-a7-iv',
    'Full-frame 33MP sensor, real-time Eye AF, 4K 60p video. The perfect hybrid camera.',
    'ফুল-ফ্রেম 33MP সেন্সর, রিয়েল-টাইম Eye AF, 4K 60p ভিডিও।',
    '33MP full-frame mirrorless with 4K 60p video',
    '৩৩MP ফুল-ফ্রেম মিররলেস 4K 60p ভিডিও সহ',
    249999, 279999, 185000, 'SNY-A7IV-BODY', 8, 2, 'cat-006', 'brand-004',
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=600&fit=crop',
    '["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=800&fit=crop","https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&h=800&fit=crop"]',
    1, 1, 658, 470, 42, '2025-02-15T00:00:00Z', '2025-02-15T00:00:00Z'),

  ('prod-014', 'Nothing Phone (2a)', 'নাথিং ফোন (2a)', 'nothing-phone-2a',
    'Unique Glyph Interface with customizable LED. MediaTek Dimensity 7200 Pro, 50MP camera.',
    'কাস্টমাইজযোগ্য LED প্যাটার্ন সহ ইউনিক গ্লিফ ইন্টারফেস।',
    'Glyph LED design, Dimensity 7200 Pro, 50MP camera',
    'গ্লিফ LED ডিজাইন, Dimensity 7200 Pro, 50MP ক্যামেরা',
    32999, 37999, 22000, 'NTH-PH2A-128', 30, 5, 'cat-001', 'brand-010',
    'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=600&h=600&fit=crop',
    '["https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=800&h=800&fit=crop","https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop"]',
    1, 0, 190, 410, 48, '2025-02-18T00:00:00Z', '2025-02-18T00:00:00Z'),

  ('prod-015', 'Google Nest Hub Max', 'গুগল নেস্ট হাব ম্যাক্স', 'google-nest-hub-max',
    '10-inch HD smart home hub with Google Assistant, Nest Cam built-in, stereo speakers.',
    '১০ ইঞ্চি HD ডিসপ্লে স্মার্ট হোম হাব গুগল অ্যাসিস্ট্যান্ট সহ।',
    '10" smart display with built-in Nest Cam',
    '১০" স্মার্ট ডিসপ্লে বিল্ট-ইন Nest Cam সহ',
    24999, 29999, 17000, 'GGL-NHM-CHR', 15, 5, 'cat-011', 'brand-009',
    'https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=600&h=600&fit=crop',
    '["https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=800&h=800&fit=crop","https://images.unsplash.com/photo-1543512214-318c7553f230?w=800&h=800&fit=crop"]',
    1, 0, 1320, 420, 37, '2025-02-20T00:00:00Z', '2025-02-20T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 6: PRODUCT VARIANTS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `product_variant` (`id`, `product_id`, `name`, `sku`, `price`, `compare_at_price`, `stock`, `image`, `attributes`, `is_active`, `created_at`, `updated_at`) VALUES
  ('var-001', 'prod-001', '256GB Titanium Black',  'SAM-S24U-256-BLK', 129999, 149999, 10, 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop', '{"color":"Titanium Black","storage":"256GB"}',  1, '2025-01-10T00:00:00Z', '2025-01-10T00:00:00Z'),
  ('var-002', 'prod-001', '512GB Titanium Violet', 'SAM-S24U-512-VLT', 149999, 169999, 8,  'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&h=400&fit=crop', '{"color":"Titanium Violet","storage":"512GB"}', 1, '2025-01-10T00:00:00Z', '2025-01-10T00:00:00Z'),
  ('var-003', 'prod-001', '1TB Titanium Gray',     'SAM-S24U-1TB-GRY', 179999, 199999, 5,  'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=400&h=400&fit=crop', '{"color":"Titanium Gray","storage":"1TB"}',     1, '2025-01-10T00:00:00Z', '2025-01-10T00:00:00Z'),
  ('var-004', 'prod-002', '256GB Natural Titanium', 'APL-15PM-256-NAT', 159999, 174999, 8,  'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop', '{"color":"Natural Titanium","storage":"256GB"}', 1, '2025-01-10T00:00:00Z', '2025-01-10T00:00:00Z'),
  ('var-005', 'prod-002', '512GB Blue Titanium',    'APL-15PM-512-BLU', 179999, 194999, 6,  'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=400&h=400&fit=crop', '{"color":"Blue Titanium","storage":"512GB"}',    1, '2025-01-10T00:00:00Z', '2025-01-10T00:00:00Z'),
  ('var-006', 'prod-004', '8GB/256GB Midnight',    'APL-MBA-M3-256-MN', 149999, 164999, 7,  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop', '{"color":"Midnight","ram":"8GB","storage":"256GB"}',  1, '2025-01-15T00:00:00Z', '2025-01-15T00:00:00Z'),
  ('var-007', 'prod-004', '16GB/512GB Starlight',  'APL-MBA-M3-512-SL', 179999, 194999, 5,  'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&h=400&fit=crop', '{"color":"Starlight","ram":"16GB","storage":"512GB"}', 1, '2025-01-15T00:00:00Z', '2025-01-15T00:00:00Z'),
  ('var-008', 'prod-006', 'Black',          'SNY-XM5-BLK-V', 34999, 39999, 25, 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&h=400&fit=crop', '{"color":"Black"}',         1, '2025-01-20T00:00:00Z', '2025-01-20T00:00:00Z'),
  ('var-009', 'prod-006', 'Silver',         'SNY-XM5-SLV-V', 34999, 39999, 20, 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&h=400&fit=crop', '{"color":"Silver"}',        1, '2025-01-20T00:00:00Z', '2025-01-20T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 7: ADDRESSES (for orders)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `address` (`id`, `user_id`, `label`, `name`, `phone`, `street`, `city`, `district`, `postal_code`, `is_default`, `created_at`, `updated_at`) VALUES
  ('addr-001', 'user-customer-001', 'Home',   'John Doe',   '+8801711111111', 'House 15, Road 3, Gulshan 1', 'Dhaka', 'Dhaka', '1212', 1, '2025-01-05T00:00:00Z', '2025-01-05T00:00:00Z'),
  ('addr-002', 'user-customer-001', 'Office', 'John Doe',   '+8801711111111', 'Suite 12, Motijheel Tower', 'Dhaka', 'Dhaka', '1000', 0, '2025-01-10T00:00:00Z', '2025-01-10T00:00:00Z'),
  ('addr-003', 'user-customer-002', 'Home',   'Jane Smith', '+8801722222222', 'Flat 4B, Green Valley, Dhanmondi', 'Dhaka', 'Dhaka', '1205', 1, '2025-01-08T00:00:00Z', '2025-01-08T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 8: DEMO ORDERS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `order` (`id`, `user_id`, `order_number`, `status`, `subtotal`, `discount`, `shipping_cost`, `tax`, `total`, `payment_method`, `payment_status`, `shipping_address_id`, `notes`, `coupon_code`, `created_at`, `updated_at`) VALUES
  ('order-001', 'user-customer-001', 'TT-2025-0001', 'delivered', 129999, 0, 99, 0, 130098, 'bkash', 'paid', 'addr-001', NULL, NULL, '2025-01-20T10:30:00Z', '2025-01-25T14:00:00Z'),
  ('order-002', 'user-customer-002', 'TT-2025-0002', 'delivered', 34999, 3500, 99, 0, 31598, 'nagad', 'paid', 'addr-003', 'Please deliver before 5pm', 'WELCOME10', '2025-01-22T15:00:00Z', '2025-01-27T11:00:00Z'),
  ('order-003', 'user-customer-001', 'TT-2025-0003', 'shipped', 159999, 0, 0, 0, 159999, 'sslcommerz', 'paid', 'addr-002', NULL, NULL, '2025-02-01T09:00:00Z', '2025-02-04T16:00:00Z'),
  ('order-004', 'user-customer-001', 'TT-2025-0004', 'processing', 89999, 0, 99, 0, 90098, 'bkash', 'paid', 'addr-001', NULL, NULL, '2025-02-05T12:00:00Z', '2025-02-06T08:00:00Z'),
  ('order-005', 'user-customer-002', 'TT-2025-0005', 'confirmed', 84999, 500, 0, 0, 84499, 'cod', 'pending', 'addr-003', 'Gift wrap please', 'FLAT500', '2025-02-08T18:00:00Z', '2025-02-09T09:00:00Z'),
  ('order-006', 'user-customer-001', 'TT-2025-0006', 'pending', 249999, 0, 99, 0, 250098, 'sslcommerz', 'pending', 'addr-002', NULL, NULL, '2025-02-10T11:00:00Z', '2025-02-10T11:00:00Z'),
  ('order-007', 'user-customer-002', 'TT-2025-0007', 'cancelled', 14999, 0, 99, 0, 15098, 'bkash', 'refunded', 'addr-003', 'Customer changed mind', NULL, '2025-02-12T08:30:00Z', '2025-02-13T10:00:00Z'),
  ('order-008', 'user-customer-002', 'TT-2025-0008', 'delivered', 149999, 22500, 0, 0, 127499, 'nagad', 'paid', 'addr-003', NULL, 'EARLYBIRD15', '2025-02-14T14:00:00Z', '2025-02-20T16:00:00Z'),
  ('order-009', 'user-customer-001', 'TT-2025-0009', 'shipped', 27999, 0, 99, 0, 28098, 'cod', 'pending', 'addr-001', NULL, NULL, '2025-02-18T16:30:00Z', '2025-02-20T09:00:00Z'),
  ('order-010', 'user-customer-001', 'TT-2025-0010', 'processing', 79999, 0, 0, 0, 79999, 'bkash', 'paid', 'addr-001', 'Urgent delivery', NULL, '2025-02-22T10:00:00Z', '2025-02-23T08:00:00Z'),
  ('order-011', 'user-customer-002', 'TT-2025-0011', 'pending', 6999, 0, 99, 0, 7098, 'cod', 'pending', 'addr-003', NULL, NULL, '2025-02-24T09:00:00Z', '2025-02-24T09:00:00Z'),
  ('order-012', 'user-customer-002', 'TT-2025-0012', 'delivered', 4999, 0, 99, 0, 5098, 'bkash', 'paid', 'addr-003', NULL, NULL, '2025-02-25T13:00:00Z', '2025-03-01T15:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 9: ORDER ITEMS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `order_item` (`id`, `order_id`, `product_id`, `variant_id`, `name`, `image`, `price`, `quantity`, `created_at`) VALUES
  ('oi-001', 'order-001', 'prod-001', 'var-001', 'Samsung Galaxy S24 Ultra 256GB Titanium Black', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop', 129999, 1, '2025-01-20T10:30:00Z'),
  ('oi-002', 'order-002', 'prod-006', 'var-008', 'Sony WH-1000XM5 Black', 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&h=400&fit=crop', 34999, 1, '2025-01-22T15:00:00Z'),
  ('oi-003', 'order-003', 'prod-002', 'var-004', 'iPhone 15 Pro Max 256GB Natural Titanium', 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop', 159999, 1, '2025-02-01T09:00:00Z'),
  ('oi-004', 'order-004', 'prod-008', NULL, 'Apple Watch Ultra 2', 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400&h=400&fit=crop', 89999, 1, '2025-02-05T12:00:00Z'),
  ('oi-005', 'order-005', 'prod-011', NULL, 'iPad Air M2', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop', 84999, 1, '2025-02-08T18:00:00Z'),
  ('oi-006', 'order-006', 'prod-013', NULL, 'Sony Alpha A7 IV', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop', 249999, 1, '2025-02-10T11:00:00Z'),
  ('oi-007', 'order-007', 'prod-009', NULL, 'JBL Charge 5', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop', 14999, 1, '2025-02-12T08:30:00Z'),
  ('oi-008', 'order-008', 'prod-004', 'var-007', 'MacBook Air M3 16GB/512GB Starlight', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop', 149999, 1, '2025-02-14T14:00:00Z'),
  ('oi-009', 'order-009', 'prod-007', NULL, 'Apple AirPods Pro 2', 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400&h=400&fit=crop', 27999, 1, '2025-02-18T16:30:00Z'),
  ('oi-010', 'order-010', 'prod-003', NULL, 'Xiaomi 14 Pro', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=400&fit=crop', 79999, 1, '2025-02-22T10:00:00Z'),
  ('oi-011', 'order-011', 'prod-012', NULL, 'Sony DualSense Controller', 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=400&fit=crop', 6999, 1, '2025-02-24T09:00:00Z'),
  ('oi-012', 'order-012', 'prod-010', NULL, 'Anker PowerCore 26800mAh', 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=400&fit=crop', 4999, 1, '2025-02-25T13:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 10: REVIEWS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `review` (`id`, `product_id`, `user_id`, `order_id`, `rating`, `title`, `body`, `is_approved`, `is_verified_purchase`, `created_at`, `updated_at`) VALUES
  ('rev-001', 'prod-001', 'user-customer-001', 'order-001', 5, 'Best phone ever!', 'The S24 Ultra is absolutely incredible. The S Pen and camera are game changers.', 1, 1, '2025-01-26T10:00:00Z', '2025-01-26T10:00:00Z'),
  ('rev-002', 'prod-006', 'user-customer-002', 'order-002', 4, 'Great ANC headphones', 'Sound quality is excellent. Noise cancellation works perfectly on flights.', 1, 1, '2025-01-28T14:00:00Z', '2025-01-28T14:00:00Z'),
  ('rev-003', 'prod-004', 'user-customer-002', 'order-008', 5, 'Perfect laptop', 'M3 chip is blazing fast. Battery easily lasts all day. Love it!', 1, 1, '2025-02-21T09:00:00Z', '2025-02-21T09:00:00Z'),
  ('rev-004', 'prod-010', 'user-customer-002', 'order-012', 4, 'Reliable power bank', 'Great capacity and charges fast. A bit heavy but worth it for trips.', 1, 1, '2025-03-02T11:00:00Z', '2025-03-02T11:00:00Z'),
  ('rev-005', 'prod-003', 'user-customer-001', NULL, 3, 'Good but not great', 'Camera is amazing with Leica optics, but MIUI has some bugs.', 0, 0, '2025-02-20T16:00:00Z', '2025-02-20T16:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 11: COUPONS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `coupon` (`id`, `code`, `description`, `type`, `value`, `min_order_amount`, `max_discount_amount`, `usage_limit`, `usage_count`, `is_active`, `starts_at`, `expires_at`, `created_at`, `updated_at`) VALUES
  ('coupon-001', 'WELCOME10',   'Welcome discount - 10% off first order',  'percentage', 10, 1000,  5000,   NULL, 2,  1, '2025-01-01T00:00:00Z', '2026-12-31T23:59:59Z', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('coupon-002', 'FLAT500',     'Flat 500 off on orders above 5000',       'fixed',      500, 5000, NULL,   100,  14, 1, '2025-01-01T00:00:00Z', '2026-06-30T23:59:59Z', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('coupon-003', 'SUMMER20',    'Summer sale - 20% off electronics',       'percentage', 20, 2000,  10000,  50,   5,  1, '2025-04-01T00:00:00Z', '2025-09-30T23:59:59Z', '2025-03-25T00:00:00Z', '2025-03-25T00:00:00Z'),
  ('coupon-004', 'EARLYBIRD15', 'Early bird 15% off for loyal customers',  'percentage', 15, 3000,  8000,   200,  35, 1, '2025-01-01T00:00:00Z', '2026-12-31T23:59:59Z', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 12: HERO SLIDES
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `hero_slide` (`id`, `title`, `subtitle`, `description`, `image`, `cta_text`, `cta_link`, `cta_secondary_text`, `cta_secondary_link`, `overlay_color`, `text_align`, `text_color`, `badge`, `badge_variant`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
  ('slide-001', 'Galaxy S24 Ultra', 'The AI Phone is Here', 'Experience next-gen AI features with the most powerful Galaxy ever', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=1920&h=800&fit=crop', 'Shop Now', '/en/products/samsung-galaxy-s24-ultra', 'Learn More', '/en/categories/smartphones', 'from-black/70 to-transparent', 'left', '#ffffff', 'NEW ARRIVAL', 'default', 1, 1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('slide-002', 'MacBook Air M3', 'Impossibly Thin. Incredibly Powerful.', 'The worlds thinnest laptop with breakthrough performance', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1920&h=800&fit=crop', 'Explore', '/en/products/macbook-air-m3', 'All Laptops', '/en/categories/laptops', 'from-black/60 to-transparent', 'center', '#ffffff', 'FEATURED', 'secondary', 2, 1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('slide-003', 'Sony WH-1000XM5', 'Silence the World', 'Industry-leading noise cancellation. 30 hours of pure music.', 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=1920&h=800&fit=crop', 'Buy Now', '/en/products/sony-wh-1000xm5', NULL, NULL, 'from-black/50 to-transparent', 'right', '#ffffff', 'BEST SELLER', 'destructive', 3, 1, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
  ('slide-004', 'Summer Sale 2025', 'Up to 20% Off', 'Use code SUMMER20 at checkout on all electronics', 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1920&h=800&fit=crop', 'Shop Sale', '/en/categories/smartphones', 'View All Deals', '/en/categories/accessories', 'from-purple-900/70 to-transparent', 'center', '#ffffff', 'LIMITED TIME', 'outline', 4, 1, '2025-03-01T00:00:00Z', '2025-03-01T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 13: BLOG POSTS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `blog_post` (`id`, `title`, `slug`, `excerpt`, `content`, `image`, `author`, `tags`, `published_at`, `is_published`, `created_at`, `updated_at`) VALUES
  ('blog-001', 'Top 5 Smartphones of 2025', 'top-5-smartphones-2025',
    'Our expert picks for the best smartphones you can buy right now.',
    '# Top 5 Smartphones of 2025\n\nThe smartphone market in 2025 is more exciting than ever.\n\n## 1. Samsung Galaxy S24 Ultra\nThe ultimate Android flagship.\n\n## 2. iPhone 15 Pro Max\nApple''s titanium masterpiece.\n\n## 3. Xiaomi 14 Pro\nIncredible Leica cameras.\n\n## 4. Nothing Phone (2a)\nUnique design.\n\n## 5. OnePlus 12\nFlagship killer returns.',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=400&fit=crop',
    'Tuktak', 'smartphones,review,2025', '2025-02-01T00:00:00Z', 1, '2025-02-01T00:00:00Z', '2025-02-01T00:00:00Z'),
  ('blog-002', 'Best Noise-Cancelling Headphones Guide', 'best-noise-cancelling-headphones-guide',
    'Find the perfect ANC headphones for your lifestyle and budget.',
    '# Best Noise-Cancelling Headphones Guide\n\nWhether you are commuting or traveling, good ANC headphones are essential.\n\n## Sony WH-1000XM5\nThe gold standard.\n\n## Apple AirPods Pro 2\nBest for Apple users.\n\n## What to Look For\n- Battery life\n- Comfort\n- Sound quality',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=400&fit=crop',
    'Tuktak', 'headphones,guide,audio', '2025-02-10T00:00:00Z', 1, '2025-02-10T00:00:00Z', '2025-02-10T00:00:00Z'),
  ('blog-003', 'MacBook Air M3: Is It Worth the Upgrade?', 'macbook-air-m3-worth-upgrade',
    'We review Apple''s latest ultrabook to see if it lives up to the hype.',
    '# MacBook Air M3: Is It Worth the Upgrade?\n\n## Performance\n35% faster CPU vs M1.\n\n## Battery Life\nUp to 18 hours.\n\n## Who Should Upgrade?\n- M1 users: Yes\n- M2 users: Maybe\n- Windows users: Absolutely',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=400&fit=crop',
    'Tuktak', 'laptops,review,apple', '2025-02-15T00:00:00Z', 1, '2025-02-15T00:00:00Z', '2025-02-15T00:00:00Z'),
  ('blog-004', 'Smart Home Essentials for Beginners', 'smart-home-essentials-beginners',
    'Start your smart home journey with these must-have devices.',
    '# Smart Home Essentials for Beginners\n\n## 1. Smart Display\nGoogle Nest Hub as central control.\n\n## 2. Smart Lights\nPhilips Hue or IKEA Tradfri.\n\n## 3. Smart Plugs\nMake any device smart.\n\n## Tips\n- Start with one room\n- Stick to one ecosystem',
    'https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=800&h=400&fit=crop',
    'Tuktak', 'smart-home,guide,beginners', '2025-02-20T00:00:00Z', 1, '2025-02-20T00:00:00Z', '2025-02-20T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 14: CONTACT MESSAGES
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `contact_message` (`id`, `name`, `email`, `subject`, `message`, `is_read`, `replied_at`, `created_at`, `updated_at`) VALUES
  ('msg-001', 'John Doe',   'john@example.com',   'Delivery inquiry',      'Hi, I placed an order 3 days ago (TT-2025-0001). When can I expect delivery to Gulshan?', 1, '2025-02-03T10:00:00Z', '2025-02-02T09:00:00Z', '2025-02-03T10:00:00Z'),
  ('msg-002', 'Jane Smith', 'jane@example.com',  'Return policy question', 'What is your return policy for electronics? I want to buy a laptop but need to know.', 1, NULL, '2025-02-10T14:30:00Z', '2025-02-10T14:30:00Z'),
  ('msg-003', 'Jane Smith', 'jane@example.com', 'Bulk order inquiry',     'I need 20 units of JBL Charge 5 for a corporate event. Bulk discount available?', 0, NULL, '2025-02-22T16:00:00Z', '2025-02-22T16:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 15: NEWSLETTER SUBSCRIBERS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `newsletter_subscriber` (`id`, `email`, `is_active`, `created_at`) VALUES
  ('nl-001', 'subscriber1@gmail.com',   1, '2025-01-20T00:00:00Z'),
  ('nl-002', 'techfan@yahoo.com',       1, '2025-02-01T00:00:00Z'),
  ('nl-003', 'deals_lover@mail.com',    1, '2025-02-10T00:00:00Z'),
  ('nl-004', 'gadget_geek@outlook.com', 1, '2025-02-15T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 16: SETTINGS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `setting` (`key`, `value`, `updated_at`) VALUES
  ('store_name',        'Tuktak.com',                            '2025-01-01T00:00:00Z'),
  ('store_tagline',     'Your Trusted Tech Store in Bangladesh', '2025-01-01T00:00:00Z'),
  ('store_email',       'support@tuktak.com',                    '2025-01-01T00:00:00Z'),
  ('store_phone',       '+880-1700-000000',                      '2025-01-01T00:00:00Z'),
  ('store_address',     'House 42, Road 11, Banani, Dhaka 1213', '2025-01-01T00:00:00Z'),
  ('currency',          'BDT',                                   '2025-01-01T00:00:00Z'),
  ('currency_symbol',   '৳',                                     '2025-01-01T00:00:00Z'),
  ('shipping_fee',      '99',                                    '2025-01-01T00:00:00Z'),
  ('free_shipping_min', '5000',                                  '2025-01-01T00:00:00Z'),
  ('tax_rate',          '0',                                     '2025-01-01T00:00:00Z'),
  ('is_whatsapp_enabled',   '1',                                 '2025-01-01T00:00:00Z'),
  ('whatsapp_mode',         'DIRECT_NUMBER',                     '2025-01-01T00:00:00Z'),
  ('whatsapp_phone_number', '8801700000000',                     '2025-01-01T00:00:00Z'),
  ('whatsapp_phone_number_id', '',                               '2025-01-01T00:00:00Z'),
  ('whatsapp_access_token', '',                                  '2025-01-01T00:00:00Z'),
  ('is_messenger_enabled',  '1',                                 '2025-01-01T00:00:00Z'),
  ('messenger_page_id',     '',                                  '2025-01-01T00:00:00Z'),
  ('messenger_access_token', '',                                 '2025-01-01T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- STEP 17: WISHLIST
-- ═══════════════════════════════════════════════════════════════

INSERT INTO `wishlist` (`id`, `user_id`, `product_id`, `created_at`) VALUES
  ('wl-001', 'user-customer-001', 'prod-002', '2025-01-15T00:00:00Z'),
  ('wl-002', 'user-customer-001', 'prod-004', '2025-01-18T00:00:00Z'),
  ('wl-003', 'user-customer-002', 'prod-008', '2025-01-20T00:00:00Z'),
  ('wl-004', 'user-customer-001', 'prod-013', '2025-02-01T00:00:00Z'),
  ('wl-005', 'user-customer-002', 'prod-001', '2025-02-05T00:00:00Z');

-- ═══════════════════════════════════════════════════════════════
-- DONE! Run POST /api/seed-users to set up auth passwords.
-- ═══════════════════════════════════════════════════════════════
