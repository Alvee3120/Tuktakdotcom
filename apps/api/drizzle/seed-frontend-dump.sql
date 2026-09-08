-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Tuktak.com — Local Frontend Dump (Safe, Non-Destructive)      ║
-- ║  Ensures the storefront looks fully populated even on a fresh  ║
-- ║  local D1. Does NOT touch user/account/session (auth stays     ║
-- ║  intact). Safe to re-run: all inserts are OR IGNORE.          ║
-- ║                                                            ║
-- ║  Covers: categories, brands, products, variants, hero slides,  ║
-- ║  coupons, blogs, settings, homeConfig, inventories.            ║
-- ║                                                            ║
-- ║  Run: wrangler d1 execute tuktak-db --local --file=drizzle/seed-frontend-dump.sql
-- ╚══════════════════════════════════════════════════════════════╝

PRAGMA foreign_keys = OFF;

-- ── Categories (top-level + sub, OR IGNORE keeps existing edits) ──
INSERT OR IGNORE INTO "category" ("id", "name", "name_bn", "slug", "description", "image", "parent_id", "sort_order", "is_active", "created_at", "updated_at") VALUES
  ('cat-001', 'Smartphones', 'স্মার্টফোন', 'smartphones', 'Latest smartphones from top brands', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop', NULL, 1, 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('cat-002', 'Laptops', 'ল্যাপটপ', 'laptops', 'High-performance laptops for work and gaming', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop', NULL, 2, 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('cat-003', 'Headphones', 'হেডফোন', 'headphones', 'Premium headphones and earbuds', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop', NULL, 3, 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('cat-004', 'Smartwatches', 'স্মার্টওয়াচ', 'smartwatches', 'Fitness trackers and smartwatches', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop', NULL, 4, 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('cat-005', 'Tablets', 'ট্যাবলেট', 'tablets', 'Tablets for entertainment and productivity', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop', NULL, 5, 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('cat-006', 'Cameras', 'ক্যামেরা', 'cameras', 'DSLR, mirrorless, and action cameras', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop', NULL, 6, 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('cat-007', 'Speakers', 'স্পিকার', 'speakers', 'Bluetooth and smart speakers', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop', NULL, 7, 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('cat-008', 'Gaming', 'গেমিং', 'gaming', 'Gaming accessories and consoles', 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&h=400&fit=crop', NULL, 8, 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('cat-009', 'Accessories', 'এক্সেসরিজ', 'accessories', 'Phone cases, chargers, cables and more', 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=400&h=400&fit=crop', NULL, 9, 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('cat-010', 'Power Banks', 'পাওয়ার ব্যাংক', 'power-banks', 'Portable chargers and power banks', 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=400&fit=crop', NULL, 10, 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('cat-011', 'Smart Home', 'স্মার্ট হোম', 'smart-home', 'Smart home devices and IoT gadgets', 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=400&h=400&fit=crop', NULL, 11, 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z');

-- ── Brands ──
INSERT OR IGNORE INTO "brand" ("id", "name", "slug", "logo", "is_active", "created_at", "updated_at") VALUES
  ('brand-001', 'Samsung', 'samsung', 'https://placehold.co/200x80/1428a0/ffffff?text=Samsung', 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('brand-002', 'Apple', 'apple', 'https://placehold.co/200x80/000000/ffffff?text=Apple', 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('brand-003', 'Xiaomi', 'xiaomi', 'https://placehold.co/200x80/ff6900/ffffff?text=Xiaomi', 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('brand-004', 'Sony', 'sony', 'https://placehold.co/200x80/000000/ffffff?text=Sony', 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('brand-005', 'OnePlus', 'oneplus', 'https://placehold.co/200x80/e50000/ffffff?text=OnePlus', 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('brand-006', 'JBL', 'jbl', 'https://placehold.co/200x80/ff6600/ffffff?text=JBL', 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('brand-007', 'Anker', 'anker', 'https://placehold.co/200x80/0066cc/ffffff?text=Anker', 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('brand-008', 'Dell', 'dell', 'https://placehold.co/200x80/0066cc/ffffff?text=Dell', 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('brand-009', 'HP', 'hp', 'https://placehold.co/200x80/0096D6/ffffff?text=HP', 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('brand-010', 'Lenovo', 'lenovo', 'https://placehold.co/200x80/E2231A/ffffff?text=Lenovo', 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z');

-- ── Hero Slides (4 slides, OR IGNORE preserves admin edits) ──
INSERT OR IGNORE INTO "hero_slide" ("id", "title", "title_bn", "subtitle", "subtitle_bn", "image", "background_image", "cta_text", "cta_text_bn", "cta_link", "cta_secondary_text", "cta_secondary_text_bn", "cta_secondary_link", "overlay_color", "text_align", "text_color", "badge", "badge_bn", "badge_variant", "animation", "animation_duration", "title_font_size", "subtitle_font_size", "show_trust_badges", "show_title", "show_subtitle", "sort_order", "is_active", "created_at", "updated_at") VALUES
  ('hero-001', 'The Latest Tech, Delivered', 'সর্বশেষ প্রযুক্তি, আপনার দোরগোড়ায়', 'Discover premium electronics and gadgets at unbeatable prices', 'অপরাজিত মূল্যে প্রিমিয়াম ইলেকট্রনিক্স ও গ্যাজেট আবিষ্কার করুন', 'https://picsum.photos/seed/hero-phone/1920/800', NULL, 'Shop Now', 'এখনই কিনুন', '/products', NULL, NULL, NULL, 'from-black/60 to-transparent', 'left', '#ffffff', 'New Arrivals', 'নতুন আগমন', 'default', 'fade', 700, 'lg', 'md', 1, 1, 1, 0, 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('hero-002', 'Summer Sale — Up to 40% Off', 'গ্রীষ্মকালীন সেল — ৪০% পর্যন্ত ছাড়', 'Limited time offers on top brands. Don''t miss out!', 'শীর্ষ ব্র্যান্ডে সীমিত সময়ের অফার। মিস করবেন না!', 'https://picsum.photos/seed/hero-sale/1920/800', NULL, 'View Deals', 'ডিল দেখুন', '/products?sort=price_desc', 'Learn More', 'আরো জানুন', '/about', 'from-primary/60 to-transparent', 'center', '#ffffff', 'Limited Offer', 'সীমিত অফার', 'destructive', 'fade', 700, 'lg', 'md', 1, 1, 1, 1, 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('hero-003', 'Premium Audio Experience', 'প্রিমিয়াম অডিও অভিজ্ঞতা', 'Sony, Bose, and more — immerse yourself in sound', 'Sony, Bose, এবং আরও — শব্দে ডুবে যান', 'https://picsum.photos/seed/hero-audio/1920/800', NULL, 'Shop Audio', 'অডিও কিনুন', '/products?category=headphones', NULL, NULL, NULL, 'from-black/40 to-transparent', 'right', '#ffffff', 'Top Rated', 'শীর্ষ রেটেড', 'secondary', 'fade', 700, 'lg', 'md', 1, 1, 1, 2, 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('hero-004', 'Gaming Gear Pro', 'গেমিং গিয়ার প্রো', 'Level up with next-gen consoles and accessories', 'নেক্সট-জেন কনসোল ও এক্সেসরিজ দিয়ে লেভেল আপ করুন', 'https://picsum.photos/seed/hero-game/1920/800', NULL, 'Explore Gaming', 'গেমিং দেখুন', '/products?category=gaming', NULL, NULL, NULL, 'from-black/60 to-transparent', 'left', '#ffffff', 'Level Up', 'লেভেল আপ', 'default', 'bottom-to-top', 700, 'lg', 'md', 1, 1, 1, 3, 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z');

-- ── Coupons (visible in checkout) ──
INSERT OR IGNORE INTO "coupon" ("id", "code", "type", "value", "min_order_amount", "max_discount_amount", "usage_limit", "usage_count", "is_active", "starts_at", "expires_at", "created_at", "updated_at") VALUES
  ('coupon-001', 'WELCOME10', 'percentage', 10, 1000, 500, 100, 0, 1, '2025-01-01T00:00:00.000Z', '2026-12-31T00:00:00.000Z', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('coupon-002', 'SAVE500', 'fixed', 500, 5000, NULL, 50, 0, 1, '2025-01-01T00:00:00.000Z', '2026-12-31T00:00:00.000Z', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z');

-- ── Blog Posts (show on /blog) ──
INSERT OR IGNORE INTO "blog_post" ("id", "title", "slug", "excerpt", "content", "image", "author", "tags", "is_published", "published_at", "created_at", "updated_at") VALUES
  ('blog-001', 'iPhone 16 Pro Max: Everything You Need to Know', 'iphone-16-pro-max-guide', 'A comprehensive look at Apple''s latest flagship.', 'Apple has once again raised the bar with the iPhone 16 Pro Max...', 'https://picsum.photos/seed/blog-iphone/1200/630', 'Tuktak Tech', 'iPhone,Apple,Smartphones', 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('blog-002', 'Top 10 Gadgets Under ৳50,000 in Bangladesh', 'top-gadgets-under-50000', 'Best value-for-money electronics under ৳50,000.', 'Finding quality electronics on a budget in Bangladesh...', 'https://picsum.photos/seed/blog-gadgets/1200/630', 'Tuktak Team', 'Budget,Gadgets,Bangladesh', 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z');

-- ── Settings: homeConfig + storefront defaults (upsert preserves admin customizations if already present) ──
INSERT INTO "setting" ("key", "value", "updated_at") VALUES
  ('homeConfig', '{"productCardStyle":"default","headerStyle":"floating","heroStyle":"boxed","branding":{"primaryColor":"","logoLight":"","logoDark":"","favicon":""},"sectionOrder":["categoryCircles","flashDeal","tabbedShowcase","categoryTabsShowcase","trending","newArrivals","showcase","bestsellers","promoBanners","brandCarousel","featureBar"],"sections":{"categoryCircles":{"enabled":true,"style":"circle","visibleCount":6},"flashDeal":{"enabled":true,"title":"Flash Deal","endsAt":"2026-12-31T18:00:00.000Z","tabs":[],"productIds":["prod-001","prod-002","prod-003"],"style":"grid","grid":{"columns":6,"rows":1}},"trending":{"enabled":true,"title":"Trending Products","tabs":[],"showAllTab":false,"style":"carousel","grid":{"columns":4,"rows":2}},"newArrivals":{"enabled":true,"title":"New Arrivals","tabs":[],"showAllTab":false,"style":"carousel","grid":{"columns":4,"rows":2}},"showcase":{"enabled":true,"title":"Featured Picks","productIds":["prod-004","prod-005","prod-006"],"tabs":[],"style":"spotlight","grid":{"columns":3,"rows":2}},"bestsellers":{"enabled":true,"title":"Bestsellers","tabs":[],"showAllTab":false,"style":"split","grid":{"columns":4,"rows":2}},"tabbedShowcase":{"enabled":false,"title":"","tabs":[],"style":"grid","grid":{"columns":4,"rows":2}},"categoryTabsShowcase":{"enabled":false,"title":"","tabs":[],"showAllTab":false,"style":"grid","grid":{"columns":4,"rows":2}},"promoBanners":{"enabled":true,"style":"twoCol","items":[]},"brandCarousel":{"enabled":true,"style":"carousel","brands":[]},"featureBar":{"enabled":true,"items":[]}}}', '2025-01-01T00:00:00.000Z')
ON CONFLICT("key") DO NOTHING;

PRAGMA foreign_keys = ON;
