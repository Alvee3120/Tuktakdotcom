/**
 * Tuktak Database Seeder — Comprehensive Demo Data
 *
 * Generates seed SQL for PostgreSQL (self-hosted). Run:
 *   npx tsx drizzle/seed.ts
 *   psql "$DATABASE_URL" -f drizzle/seed.sql
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOW = new Date('2025-07-01T00:00:00.000Z').toISOString();
const EXPIRES = new Date('2025-10-01T00:00:00.000Z').toISOString();

const q = (s: unknown) => {
  if (s === null || s === undefined) return 'NULL';
  if (typeof s === 'number') return String(s);
  if (typeof s === 'boolean') return s ? '1' : '0';
  return `'${String(s).replace(/'/g, "''")}'`;
};
const j = (arr: unknown[]) => arr.map(q).join(', ');

let sql = '';
function insert(table: string, columns: string[], rows: Record<string, unknown>[]) {
  const cols = columns.map((c) => `"${c}"`).join(', ');
  for (const row of rows) {
    // Postgres: idempotent — skip rows that already exist (e.g. re-runs).
    sql += `INSERT INTO "${table}" (${cols}) VALUES (${j(columns.map((c) => row[c]))}) ON CONFLICT DO NOTHING;\n`;
  }
}

// ══════════════════════════════════
//  CATEGORIES
// ══════════════════════════════════
const CATEGORIES = [
  {
    id: 'cat-001',
    name: 'Smartphones',
    name_bn: 'স্মার্টফোন',
    slug: 'smartphones',
    description: 'Latest smartphones from top brands',
    image: 'https://picsum.photos/seed/cat-phone/600/400',
    sort_order: 1,
    parent_id: null,
  },
  {
    id: 'cat-002',
    name: 'Laptops',
    name_bn: 'ল্যাপটপ',
    slug: 'laptops',
    description: 'Laptops for work, study, and gaming',
    image: 'https://picsum.photos/seed/cat-laptop/600/400',
    sort_order: 2,
    parent_id: null,
  },
  {
    id: 'cat-003',
    name: 'Audio',
    name_bn: 'অডিও',
    slug: 'audio',
    description: 'Headphones, earphones, and speakers',
    image: 'https://picsum.photos/seed/cat-audio/600/400',
    sort_order: 3,
    parent_id: null,
  },
  {
    id: 'cat-004',
    name: 'Smartwatches',
    name_bn: 'স্মার্টওয়াচ',
    slug: 'smartwatches',
    description: 'Wearable technology',
    image: 'https://picsum.photos/seed/cat-watch/600/400',
    sort_order: 4,
    parent_id: null,
  },
  {
    id: 'cat-005',
    name: 'Accessories',
    name_bn: 'এক্সেসরিজ',
    slug: 'accessories',
    description: 'Phone cases, chargers, cables',
    image: 'https://picsum.photos/seed/cat-acc/600/400',
    sort_order: 5,
    parent_id: null,
  },
  {
    id: 'cat-006',
    name: 'Gaming',
    name_bn: 'গেমিং',
    slug: 'gaming',
    description: 'Gaming consoles, controllers',
    image: 'https://picsum.photos/seed/cat-game/600/400',
    sort_order: 6,
    parent_id: null,
  },
  {
    id: 'cat-007',
    name: 'Tablets',
    name_bn: 'ট্যাবলেট',
    slug: 'tablets',
    description: 'Tablets for productivity',
    image: 'https://picsum.photos/seed/cat-tab/600/400',
    sort_order: 7,
    parent_id: null,
  },
  {
    id: 'cat-101',
    name: 'Android Phones',
    name_bn: 'অ্যান্ড্রয়েড ফোন',
    slug: 'android-phones',
    image: 'https://picsum.photos/seed/cat-android/600/400',
    parent_id: 'cat-001',
    sort_order: 1,
  },
  {
    id: 'cat-102',
    name: 'iPhones',
    name_bn: 'আইফোন',
    slug: 'iphones',
    image: 'https://picsum.photos/seed/cat-iphone/600/400',
    parent_id: 'cat-001',
    sort_order: 2,
  },
  {
    id: 'cat-201',
    name: 'Windows Laptops',
    name_bn: 'উইন্ডোজ ল্যাপটপ',
    slug: 'windows-laptops',
    image: 'https://picsum.photos/seed/cat-win/600/400',
    parent_id: 'cat-002',
    sort_order: 1,
  },
  {
    id: 'cat-202',
    name: 'MacBooks',
    name_bn: 'ম্যাকবুক',
    slug: 'macbooks',
    image: 'https://picsum.photos/seed/cat-mac/600/400',
    parent_id: 'cat-002',
    sort_order: 2,
  },
];
const CAT_COLS = [
  'id',
  'name',
  'name_bn',
  'slug',
  'description',
  'image',
  'parent_id',
  'sort_order',
  'is_active',
  'created_at',
  'updated_at',
];
for (const c of CATEGORIES)
  insert('category', CAT_COLS, [{ ...c, is_active: 1, created_at: NOW, updated_at: NOW }]);

// ══════════════════════════════════
//  BRANDS
// ══════════════════════════════════
const BRANDS = [
  { id: 'brd-001', name: 'Apple', name_bn: 'অ্যাপল', slug: 'apple', logo: '/brands/apple.png' },
  {
    id: 'brd-002',
    name: 'Samsung',
    name_bn: 'স্যামসাং',
    slug: 'samsung',
    logo: '/brands/samsung.png',
  },
  {
    id: 'brd-003',
    name: 'Xiaomi',
    name_bn: 'জিয়াওমি',
    slug: 'xiaomi',
    logo: '/brands/xiaomi.png',
  },
  { id: 'brd-004', name: 'Sony', name_bn: 'সনি', slug: 'sony', logo: '/brands/sony.png' },
  { id: 'brd-005', name: 'Dell', name_bn: 'ডেল', slug: 'dell', logo: '/brands/dell.png' },
  { id: 'brd-006', name: 'HP', name_bn: 'এইচপি', slug: 'hp', logo: '/brands/hp.png' },
  { id: 'brd-007', name: 'Lenovo', name_bn: 'লেনোভো', slug: 'lenovo', logo: '/brands/lenovo.png' },
  {
    id: 'brd-008',
    name: 'OnePlus',
    name_bn: 'ওয়ানপ্লাস',
    slug: 'oneplus',
    logo: '/brands/oneplus.png',
  },
  { id: 'brd-009', name: 'ASUS', name_bn: 'আসুস', slug: 'asus', logo: '/brands/asus.png' },
  {
    id: 'brd-010',
    name: 'Nothing',
    name_bn: 'নাথিং',
    slug: 'nothing',
    logo: '/brands/nothing.png',
  },
];
const BRD_COLS = ['id', 'name', 'name_bn', 'slug', 'logo', 'is_active', 'created_at', 'updated_at'];
for (const b of BRANDS)
  insert('brand', BRD_COLS, [{ ...b, is_active: 1, created_at: NOW, updated_at: NOW }]);

// ══════════════════════════════════
//  PRODUCTS (12 with Bengali)
// ══════════════════════════════════
const PRODUCTS = [
  {
    id: 'prd-001',
    name: 'iPhone 16 Pro Max 256GB',
    name_bn: 'আইফোন ১৬ প্রো ম্যাক্স ২৫৬জিবি',
    slug: 'iphone-16-pro-max-256gb',
    description:
      'The most powerful iPhone ever. A18 Pro chip, 48MP camera system, titanium design.',
    description_bn:
      'সবচেয়ে শক্তিশালী আইফোন। A18 Pro চিপ, 48MP ক্যামেরা সিস্টেম, টাইটানিয়াম ডিজাইন।',
    short_description: 'A18 Pro | 48MP Camera | Titanium',
    short_description_bn: 'A18 Pro | 48MP ক্যামেরা | টাইটানিয়াম',
    price: 159900,
    compare_at_price: 169900,
    cost: 111930,
    category_id: 'cat-102',
    brand_id: 'brd-001',
    image: 'https://picsum.photos/seed/iphone16/600/600',
    images: '"[\"https://picsum.photos/seed/iphone16-2/600/600\"]"',
    is_featured: 1,
    rating: 480,
    review_count: 24,
    stock: 50,
  },
  {
    id: 'prd-002',
    name: 'Samsung Galaxy S25 Ultra',
    name_bn: 'স্যামসাং গ্যালাক্সি S25 আল্ট্রা',
    slug: 'samsung-galaxy-s25-ultra',
    description: 'Samsung Galaxy S25 Ultra with Galaxy AI, 200MP camera, S Pen built-in.',
    description_bn: 'গ্যালাক্সি AI, 200MP ক্যামেরা, এস পেন সহ স্যামসাং গ্যালাক্সি S25 আল্ট্রা।',
    short_description: 'Galaxy AI | 200MP Camera | S Pen',
    short_description_bn: 'গ্যালাক্সি AI | 200MP ক্যামেরা | এস পেন',
    price: 149900,
    compare_at_price: 159900,
    cost: 104930,
    category_id: 'cat-101',
    brand_id: 'brd-002',
    image: 'https://picsum.photos/seed/s25ultra/600/600',
    is_featured: 1,
    rating: 460,
    review_count: 18,
    stock: 35,
  },
  {
    id: 'prd-003',
    name: 'MacBook Air M4 15-inch',
    name_bn: 'ম্যাকবুক এয়ার M4 ১৫-ইঞ্চি',
    slug: 'macbook-air-m4-15',
    description: 'Apple MacBook Air with M4 chip, 15.3-inch Liquid Retina display, 18GB memory.',
    description_bn:
      'M4 চিপ, ১৫.৩-ইঞ্চি লিকুইড রেটিনা ডিসপ্লে, ১৮জিবি মেমোরি সহ অ্যাপল ম্যাকবুক এয়ার।',
    short_description: 'M4 Chip | 15.3" Display | 18GB RAM',
    short_description_bn: 'M4 চিপ | ১৫.৩" ডিসপ্লে | ১৮জিবি র‍্যাম',
    price: 169900,
    category_id: 'cat-202',
    brand_id: 'brd-001',
    image: 'https://picsum.photos/seed/macbookair/600/600',
    is_featured: 1,
    rating: 490,
    review_count: 31,
    stock: 20,
  },
  {
    id: 'prd-004',
    name: 'Sony WH-1000XM6 Wireless',
    name_bn: 'সনি WH-1000XM6 ওয়্যারলেস',
    slug: 'sony-wh-1000xm6',
    description: 'Industry-leading noise cancellation. 30-hour battery, Hi-Res Audio.',
    description_bn: 'শিল্প-নেতৃস্থানীয় নয়েজ ক্যান্সেলেশন। ৩০-ঘন্টা ব্যাটারি, হাই-রেজ অডিও।',
    short_description: 'Noise Cancelling | 30h Battery',
    short_description_bn: 'নয়েজ ক্যান্সেলিং | ৩০ঘ ব্যাটারি',
    price: 35000,
    compare_at_price: 40000,
    cost: 24500,
    category_id: 'cat-003',
    brand_id: 'brd-004',
    image: 'https://picsum.photos/seed/sonyxm6/600/600',
    is_featured: 1,
    rating: 470,
    review_count: 42,
    stock: 100,
  },
  {
    id: 'prd-005',
    name: 'Xiaomi 14T Pro',
    name_bn: 'জিয়াওমি ১৪টি প্রো',
    slug: 'xiaomi-14t-pro',
    description: 'Xiaomi 14T Pro with Leica optics, Dimensity 9300+, 120W HyperCharge.',
    description_bn: 'লাইকা অপটিক্স, Dimensity 9300+, 120W হাইপারচার্জ সহ জিয়াওমি ১৪টি প্রো।',
    short_description: 'Leica Cameras | 120W Charging',
    short_description_bn: 'লাইকা ক্যামেরা | ১২০W চার্জিং',
    price: 69999,
    compare_at_price: 79999,
    cost: 49000,
    category_id: 'cat-101',
    brand_id: 'brd-003',
    image: 'https://picsum.photos/seed/xiaomi14t/600/600',
    rating: 440,
    review_count: 15,
    stock: 45,
  },
  {
    id: 'prd-006',
    name: 'Dell XPS 16 Ultra 9',
    name_bn: 'ডেল XPS ১৬ আল্ট্রা ৯',
    slug: 'dell-xps-16',
    description: 'Dell XPS 16 with Intel Core Ultra 9, 32GB RAM, 1TB SSD, 4K OLED display.',
    description_bn:
      'ইন্টেল কোর আল্ট্রা ৯, ৩২জিবি র‍্যাম, ১টিবি এসএসডি, ৪কে ওএলইডি ডিসপ্লে সহ ডেল XPS ১৬।',
    short_description: 'Ultra 9 | 32GB RAM | 4K OLED',
    short_description_bn: 'আল্ট্রা ৯ | ৩২জিবি র‍্যাম | ৪কে ওএলইডি',
    price: 249900,
    category_id: 'cat-201',
    brand_id: 'brd-005',
    image: 'https://picsum.photos/seed/dellxps/600/600',
    rating: 450,
    review_count: 8,
    stock: 10,
  },
  {
    id: 'prd-007',
    name: 'OnePlus 13',
    name_bn: 'ওয়ানপ্লাস ১৩',
    slug: 'oneplus-13',
    description: 'OnePlus 13 with Snapdragon 8 Gen 4, Hasselblad camera, 100W charging.',
    description_bn: 'Snapdragon 8 Gen 4, Hasselblad ক্যামেরা, 100W চার্জিং সহ ওয়ানপ্লাস ১৩।',
    short_description: 'SD 8 Gen 4 | Hasselblad | 100W',
    short_description_bn: 'SD 8 Gen 4 | হ্যাসেলব্ল্যাড | ১০০W',
    price: 89999,
    compare_at_price: 94999,
    cost: 62999,
    category_id: 'cat-101',
    brand_id: 'brd-008',
    image: 'https://picsum.photos/seed/oneplus13/600/600',
    is_featured: 1,
    rating: 455,
    review_count: 12,
    stock: 30,
  },
  {
    id: 'prd-008',
    name: 'Apple Watch Ultra 3',
    name_bn: 'অ্যাপল ওয়াচ আল্ট্রা ৩',
    slug: 'apple-watch-ultra-3',
    description: 'Apple Watch Ultra 3 with titanium case, dual-frequency GPS, 36h battery.',
    description_bn:
      'টাইটানিয়াম কেস, ডুয়াল-ফ্রিকোয়েন্সি জিপিএস, ৩৬ঘ ব্যাটারি সহ অ্যাপল ওয়াচ আল্ট্রা ৩।',
    short_description: 'Titanium | GPS | 36h Battery',
    short_description_bn: 'টাইটানিয়াম | জিপিএস | ৩৬ঘ ব্যাটারি',
    price: 89900,
    category_id: 'cat-004',
    brand_id: 'brd-001',
    image: 'https://picsum.photos/seed/awu3/600/600',
    rating: 475,
    review_count: 9,
    stock: 25,
  },
  {
    id: 'prd-009',
    name: 'Nothing Phone (3)',
    name_bn: 'নাথিং ফোন (৩)',
    slug: 'nothing-phone-3',
    description: 'Nothing Phone (3) with Glyph Interface, 50MP camera, transparent design.',
    description_bn: 'গ্লিফ ইন্টারফেস, ৫০MP ক্যামেরা, ট্রান্সপারেন্ট ডিজাইন সহ নাথিং ফোন (৩)।',
    short_description: 'Glyph Interface | Transparent Design',
    short_description_bn: 'গ্লিফ ইন্টারফেস | ট্রান্সপারেন্ট ডিজাইন',
    price: 54999,
    compare_at_price: 59999,
    cost: 38499,
    category_id: 'cat-101',
    brand_id: 'brd-010',
    image: 'https://picsum.photos/seed/nothing3/600/600',
    is_featured: 1,
    rating: 430,
    review_count: 20,
    stock: 60,
  },
  {
    id: 'prd-010',
    name: 'iPad Pro M4 13-inch',
    name_bn: 'আইপ্যাড প্রো M4 ১৩-ইঞ্চি',
    slug: 'ipad-pro-m4-13',
    description: 'iPad Pro with M4 chip, Ultra Retina XDR display, 5.1mm design.',
    description_bn: 'M4 চিপ, আল্ট্রা রেটিনা XDR ডিসপ্লে, ৫.১ মিমি ডিজাইন সহ আইপ্যাড প্রো।',
    short_description: 'M4 Chip | XDR Display | 5.1mm',
    short_description_bn: 'M4 চিপ | XDR ডিসপ্লে | ৫.১মিমি',
    price: 159900,
    category_id: 'cat-007',
    brand_id: 'brd-001',
    image: 'https://picsum.photos/seed/ipadprom4/600/600',
    rating: 485,
    review_count: 7,
    stock: 15,
  },
  {
    id: 'prd-011',
    name: 'ASUS ROG Ally X',
    name_bn: 'আসুস ROG অ্যালি X',
    slug: 'asus-rog-ally-x',
    description: 'ASUS ROG Ally X handheld gaming with Ryzen Z1 Extreme, 7" 120Hz.',
    description_bn: 'Ryzen Z1 Extreme, ৭" 120Hz সহ আসুস ROG অ্যালি X হ্যান্ডহেল্ড গেমিং।',
    short_description: 'Ryzen Z1E | 7" 120Hz | 80Wh',
    short_description_bn: 'Ryzen Z1E | ৭" 120Hz | ৮০Wh',
    price: 89900,
    compare_at_price: 94900,
    cost: 62930,
    category_id: 'cat-006',
    brand_id: 'brd-009',
    image: 'https://picsum.photos/seed/rogally/600/600',
    rating: 460,
    review_count: 14,
    stock: 22,
  },
  {
    id: 'prd-012',
    name: 'Samsung Galaxy Watch 7',
    name_bn: 'স্যামসাং গ্যালাক্সি ওয়াচ ৭',
    slug: 'samsung-galaxy-watch-7',
    description: 'Galaxy Watch 7 Pro with titanium case, BioActive sensor, 4-day battery.',
    description_bn:
      'টাইটানিয়াম কেস, BioActive সেন্সর, ৪-দিনের ব্যাটারি সহ গ্যালাক্সি ওয়াচ ৭ প্রো।',
    short_description: 'Titanium | 4-Day Battery',
    short_description_bn: 'টাইটানিয়াম | ৪-দিনের ব্যাটারি',
    price: 49900,
    compare_at_price: 54900,
    cost: 34930,
    category_id: 'cat-004',
    brand_id: 'brd-002',
    image: 'https://picsum.photos/seed/gw7pro/600/600',
    rating: 445,
    review_count: 11,
    stock: 40,
  },
];
const PRD_COLS = [
  'id',
  'name',
  'name_bn',
  'slug',
  'description',
  'description_bn',
  'short_description',
  'short_description_bn',
  'price',
  'compare_at_price',
  'cost',
  'sku',
  'stock',
  'low_stock_threshold',
  'category_id',
  'brand_id',
  'image',
  'images',
  'is_active',
  'is_featured',
  'weight',
  'rating',
  'review_count',
  'meta_title',
  'meta_description',
  'created_at',
  'updated_at',
];
for (const p of PRODUCTS) {
  insert('product', PRD_COLS, [
    {
      ...p,
      low_stock_threshold: 5,
      is_active: 1,
      images: p.images ?? null,
      sku: null,
      weight: null,
      meta_title: `${p.name} | Tuktak`,
      meta_description: p.short_description || null,
      created_at: NOW,
      updated_at: NOW,
    },
  ]);
}

// ══════════════════════════════════
//  VARIANTS
// ══════════════════════════════════
const VARIANTS = [
  {
    id: 'var-001',
    product_id: 'prd-001',
    name: '256GB Natural Titanium',
    price: 159900,
    stock: 20,
    attributes: '{"color":"natural titanium","storage":"256gb"}',
  },
  {
    id: 'var-002',
    product_id: 'prd-001',
    name: '512GB Natural Titanium',
    price: 179900,
    stock: 15,
    attributes: '{"color":"natural titanium","storage":"512gb"}',
  },
  {
    id: 'var-003',
    product_id: 'prd-001',
    name: '256GB Desert Titanium',
    price: 159900,
    stock: 15,
    attributes: '{"color":"desert titanium","storage":"256gb"}',
  },
  {
    id: 'var-004',
    product_id: 'prd-002',
    name: '256GB Titanium Gray',
    price: 149900,
    stock: 15,
    attributes: '{"color":"titanium gray","storage":"256gb"}',
  },
  {
    id: 'var-005',
    product_id: 'prd-002',
    name: '512GB Titanium Gray',
    price: 169900,
    stock: 10,
    attributes: '{"color":"titanium gray","storage":"512gb"}',
  },
  {
    id: 'var-006',
    product_id: 'prd-003',
    name: '15" M4/18GB/512GB Midnight',
    price: 169900,
    stock: 8,
    attributes: '{"color":"midnight","storage":"512gb"}',
  },
  {
    id: 'var-008',
    product_id: 'prd-004',
    name: 'WH-1000XM6 Black',
    price: 35000,
    stock: 40,
    attributes: '{"color":"black"}',
  },
  {
    id: 'var-009',
    product_id: 'prd-004',
    name: 'WH-1000XM6 Silver',
    price: 35000,
    stock: 30,
    attributes: '{"color":"silver"}',
  },
  {
    id: 'var-010',
    product_id: 'prd-004',
    name: 'WH-1000XM6 Midnight Blue',
    price: 36500,
    stock: 20,
    attributes: '{"color":"midnight blue"}',
  },
];
const VAR_COLS = [
  'id',
  'product_id',
  'name',
  'price',
  'stock',
  'attributes',
  'is_active',
  'created_at',
  'updated_at',
];
for (const v of VARIANTS)
  insert('product_variant', VAR_COLS, [
    {
      ...v,
      compare_at_price: null,
      image: null,
      sku: null,
      is_active: 1,
      created_at: NOW,
      updated_at: NOW,
    },
  ]);

// ══════════════════════════════════
//  HERO SLIDES (4 slides)
// ══════════════════════════════════
const HERO_SLIDES = [
  {
    id: 'hero-001',
    title: 'The Latest Tech, Delivered',
    title_bn: 'সর্বশেষ প্রযুক্তি, আপনার দোরগোড়ায়',
    subtitle: 'Discover premium electronics and gadgets at unbeatable prices',
    subtitle_bn: 'অপরাজিত মূল্যে প্রিমিয়াম ইলেকট্রনিক্স ও গ্যাজেট আবিষ্কার করুন',
    image: 'https://picsum.photos/seed/hero-phone/1920/800',
    cta_text: 'Shop Now',
    cta_text_bn: 'এখনই কিনুন',
    cta_link: '/products',
    badge: 'New Arrivals',
    badge_bn: 'নতুন আগমন',
    badge_variant: 'default',
    text_align: 'left',
    text_color: '#ffffff',
    overlay_color: 'from-black/60 to-transparent',
    animation: 'fade',
    animation_duration: 700,
    title_font_size: 'lg',
    subtitle_font_size: 'md',
    show_trust_badges: 1,
    show_title: 1,
    show_subtitle: 1,
    sort_order: 0,
    is_active: 1,
  },
  {
    id: 'hero-002',
    title: 'Summer Sale — Up to 40% Off',
    title_bn: 'গ্রীষ্মকালীন সেল — ৪০% পর্যন্ত ছাড়',
    subtitle: "Limited time offers on top brands. Don't miss out!",
    subtitle_bn: 'শীর্ষ ব্র্যান্ডে সীমিত সময়ের অফার। মিস করবেন না!',
    image: 'https://picsum.photos/seed/hero-sale/1920/800',
    cta_text: 'View Deals',
    cta_text_bn: 'ডিল দেখুন',
    cta_link: '/products?sort=price_desc',
    cta_secondary_text: 'Learn More',
    cta_secondary_text_bn: 'আরো জানুন',
    cta_secondary_link: '/about',
    badge: 'Limited Offer',
    badge_bn: 'সীমিত অফার',
    badge_variant: 'destructive',
    text_align: 'center',
    text_color: '#ffffff',
    overlay_color: 'from-primary/60 to-transparent',
    animation: 'fade',
    animation_duration: 700,
    title_font_size: 'lg',
    subtitle_font_size: 'md',
    show_trust_badges: 1,
    show_title: 1,
    show_subtitle: 1,
    sort_order: 1,
    is_active: 1,
  },
  {
    id: 'hero-003',
    title: 'Premium Audio Experience',
    title_bn: 'প্রিমিয়াম অডিও অভিজ্ঞতা',
    subtitle: 'Sony, Bose, and more — immerse yourself in sound',
    subtitle_bn: 'Sony, Bose, এবং আরও — শব্দে ডুবে যান',
    image: 'https://picsum.photos/seed/hero-audio/1920/800',
    cta_text: 'Shop Audio',
    cta_text_bn: 'অডিও কিনুন',
    cta_link: '/products?category=audio',
    badge: 'Top Rated',
    badge_bn: 'শীর্ষ রেটেড',
    badge_variant: 'secondary',
    text_align: 'right',
    text_color: '#ffffff',
    overlay_color: 'from-black/40 to-transparent',
    animation: 'fade',
    animation_duration: 700,
    title_font_size: 'lg',
    subtitle_font_size: 'md',
    show_trust_badges: 1,
    show_title: 1,
    show_subtitle: 1,
    sort_order: 2,
    is_active: 1,
  },
  {
    id: 'hero-004',
    title: 'সেরা ইলেকট্রনিক্স',
    title_bn: 'সেরা ইলেকট্রনিক্স',
    subtitle: "Bangladesh's trusted destination for premium gadgets",
    subtitle_bn: 'প্রিমিয়াম গ্যাজেটের জন্য বাংলাদেশের বিশ্বস্ত গন্তব্য',
    image: 'https://picsum.photos/seed/hero-bd/1920/800',
    cta_text: 'দেখুন',
    cta_text_bn: 'দেখুন',
    cta_link: '/products',
    badge: 'Welcome',
    badge_bn: 'স্বাগতম',
    badge_variant: 'default',
    text_align: 'left',
    text_color: '#ffffff',
    overlay_color: 'from-black/60 to-transparent',
    animation: 'fade',
    animation_duration: 700,
    title_font_size: 'lg',
    subtitle_font_size: 'md',
    show_trust_badges: 1,
    show_title: 1,
    show_subtitle: 1,
    sort_order: 3,
    is_active: 1,
  },
];
const HERO_COLS = [
  'id',
  'title',
  'title_bn',
  'subtitle',
  'subtitle_bn',
  'image',
  'background_image',
  'cta_text',
  'cta_text_bn',
  'cta_link',
  'cta_secondary_text',
  'cta_secondary_text_bn',
  'cta_secondary_link',
  'overlay_color',
  'text_align',
  'text_color',
  'badge',
  'badge_bn',
  'badge_variant',
  'animation',
  'animation_duration',
  'title_font_size',
  'subtitle_font_size',
  'show_trust_badges',
  'show_title',
  'show_subtitle',
  'sort_order',
  'is_active',
  'created_at',
  'updated_at',
];
for (const h of HERO_SLIDES)
  insert('hero_slide', HERO_COLS, [
    {
      ...h,
      background_image: null,
      cta_secondary_text: h.cta_secondary_text ?? null,
      cta_secondary_text_bn: h.cta_secondary_text_bn ?? null,
      cta_secondary_link: h.cta_secondary_link ?? null,
      created_at: NOW,
      updated_at: NOW,
    },
  ]);

// ══════════════════════════════════
//  BLOG POSTS (4 posts)
// ══════════════════════════════════
const BLOG_POSTS = [
  {
    id: 'blog-001',
    title: 'iPhone 16 Pro Max: Everything You Need to Know',
    slug: 'iphone-16-pro-max-guide',
    excerpt:
      "A comprehensive look at Apple's latest flagship smartphone featuring the A18 Pro chip and 48MP camera system.",
    content:
      'Apple has once again raised the bar with the iPhone 16 Pro Max. Featuring the powerful A18 Pro chip, a stunning titanium design, and a 48MP camera system that rivals professional cameras.\n\nThe new 5x optical zoom lens is a game-changer for photography enthusiasts. Battery life has been improved to last up to 33 hours of video playback.\n\nAvailable in four stunning finishes: Natural Titanium, Desert Titanium, White Titanium, and Black Titanium. Prices start at ৳159,900 for the 256GB model.',
    image: 'https://picsum.photos/seed/blog-iphone/1200/630',
    author: 'Tuktak Tech',
    tags: 'iPhone,Apple,Smartphones,Review',
    is_published: 1,
    published_at: NOW,
  },
  {
    id: 'blog-002',
    title: 'Top 10 Gadgets Under ৳50,000 in Bangladesh',
    slug: 'top-gadgets-under-50000',
    excerpt:
      'Our curated list of the best value-for-money electronics available in Bangladesh under ৳50,000.',
    content:
      "Finding quality electronics on a budget in Bangladesh can be challenging. We've done the research so you don't have to.\n\nFrom noise-cancelling headphones to powerful smartphones, here are our top picks under ৳50,000:\n\n1. Sony WH-1000XM6 - ৳35,000\n2. Nothing Phone (3) - ৳54,999\n3. Samsung Galaxy Watch 7 - ৳49,900\n4. Xiaomi 14T Pro - ৳69,999\n\nEach of these products offers exceptional value for their price point.",
    image: 'https://picsum.photos/seed/blog-gadgets/1200/630',
    author: 'Tuktak Team',
    tags: 'Budget,Gadgets,Bangladesh,Guide',
    is_published: 1,
    published_at: NOW,
  },
  {
    id: 'blog-003',
    title: 'The Ultimate Guide to Wireless Headphones',
    slug: 'wireless-headphones-guide-2025',
    excerpt:
      'Everything you need to know about choosing the perfect wireless headphones for your lifestyle.',
    content:
      "Wireless headphones have become essential for modern life. Whether you're working from home, commuting, or hitting the gym, the right pair can transform your experience.\n\nKey factors to consider:\n\n1. **Sound Quality**: Look for Hi-Res Audio support and LDAC codec\n2. **Noise Cancellation**: Active Noise Cancellation (ANC) is essential for busy environments\n3. **Battery Life**: Aim for 30+ hours for over-ear headphones\n4. **Comfort**: Weight and ear cushion material matter for long sessions\n\nOur top recommendation: Sony WH-1000XM6 offers the best balance of all these factors at ৳35,000.",
    image: 'https://picsum.photos/seed/blog-audio/1200/630',
    author: 'Audio Expert',
    tags: 'Audio,Headphones,Guide,Wireless',
    is_published: 1,
    published_at: NOW,
  },
  {
    id: 'blog-004',
    title: 'MacBook Air M4 vs MacBook Pro M4: Which Should You Buy?',
    slug: 'macbook-air-m4-vs-pro-m4',
    excerpt:
      "Comparing Apple's latest laptops to help you decide which one is right for your needs and budget.",
    content:
      "Apple's M4 chip has brought incredible performance to both the MacBook Air and MacBook Pro. But which one should you choose?\n\n**MacBook Air M4**\n- Starting at ৳169,900\n- 15.3-inch Liquid Retina display\n- Fanless design, ultra-thin\n- Perfect for students and general productivity\n\n**MacBook Pro M4**\n- Starting at ৳249,900\n- 14.2-inch Liquid Retina XDR display\n- Active cooling for sustained performance\n- Ideal for professionals and creators\n\nVerdict: The Air is perfect for most users. Choose the Pro only if you need sustained performance for video editing, coding, or 3D work.",
    image: 'https://picsum.photos/seed/blog-macbook/1200/630',
    author: 'Tech Reviewer',
    tags: 'Apple,MacBook,Laptop,Comparison',
    is_published: 1,
    published_at: NOW,
  },
];
const BLOG_COLS = [
  'id',
  'title',
  'slug',
  'excerpt',
  'content',
  'image',
  'author',
  'tags',
  'is_published',
  'published_at',
  'created_at',
  'updated_at',
];
for (const b of BLOG_POSTS)
  insert('blog_post', BLOG_COLS, [{ ...b, created_at: NOW, updated_at: NOW }]);

// ══════════════════════════════════
//  USERS (seed references)
// ══════════════════════════════════
const USERS = [
  { id: 'usr-001', name: 'Admin User', email: 'admin@tuktak.com', role: 'admin' },
  { id: 'usr-002', name: 'John Customer', email: 'john@example.com', role: 'customer' },
  { id: 'usr-003', name: 'Jane Customer', email: 'jane@example.com', role: 'customer' },
  { id: 'usr-004', name: 'Moderator User', email: 'moderator@tuktak.com', role: 'moderator' },
];
const USER_COLS = [
  'id',
  'name',
  'email',
  'email_verified',
  'role',
  'banned',
  'created_at',
  'updated_at',
];
for (const u of USERS)
  insert('user', USER_COLS, [
    { ...u, email_verified: 1, banned: 0, created_at: NOW, updated_at: NOW },
  ]);

// ══════════════════════════════════
//  ADDRESSES
// ══════════════════════════════════
const ADDRESSES = [
  {
    id: 'addr-001',
    user_id: 'usr-002',
    label: 'Home',
    name: 'John Customer',
    phone: '+8801712345678',
    street: 'House 12, Road 5, Dhanmondi',
    city: 'Dhaka',
    district: 'Dhaka',
    postal_code: '1205',
    is_default: 1,
  },
  {
    id: 'addr-002',
    user_id: 'usr-002',
    label: 'Office',
    name: 'John Customer',
    phone: '+8801712345678',
    street: 'Level 8, Gulshan Avenue',
    city: 'Dhaka',
    district: 'Dhaka',
    postal_code: '1212',
    is_default: 0,
  },
];
const ADDR_COLS = [
  'id',
  'user_id',
  'label',
  'name',
  'phone',
  'street',
  'city',
  'district',
  'postal_code',
  'is_default',
  'created_at',
  'updated_at',
];
for (const a of ADDRESSES)
  insert('address', ADDR_COLS, [{ ...a, created_at: NOW, updated_at: NOW }]);

// ══════════════════════════════════
//  ORDERS
// ══════════════════════════════════
const ORDERS = [
  {
    id: 'ord-001',
    user_id: 'usr-002',
    order_number: 'TK-000001',
    status: 'delivered',
    subtotal: 194900,
    discount: 0,
    shipping_cost: 0,
    tax: 9745,
    total: 204645,
    payment_method: 'bkash',
    payment_status: 'paid',
    shipping_address_id: 'addr-001',
  },
  {
    id: 'ord-002',
    user_id: 'usr-002',
    order_number: 'TK-000002',
    status: 'shipped',
    subtotal: 35000,
    discount: 0,
    shipping_cost: 80,
    tax: 1750,
    total: 36830,
    payment_method: 'cod',
    payment_status: 'pending',
    shipping_address_id: 'addr-001',
  },
  {
    id: 'ord-003',
    user_id: 'usr-002',
    order_number: 'TK-000003',
    status: 'pending',
    subtotal: 89999,
    discount: 8999,
    shipping_cost: 0,
    tax: 4050,
    total: 85050,
    payment_method: 'nagad',
    payment_status: 'paid',
    shipping_address_id: 'addr-001',
    coupon_code: 'WELCOME10',
  },
];
const ORD_COLS = [
  'id',
  'user_id',
  'order_number',
  'status',
  'subtotal',
  'discount',
  'shipping_cost',
  'tax',
  'total',
  'payment_method',
  'payment_status',
  'shipping_address_id',
  'coupon_code',
  'created_at',
  'updated_at',
];
for (const o of ORDERS)
  insert('order', ORD_COLS, [
    { ...o, payment_transaction_id: null, notes: null, created_at: NOW, updated_at: NOW },
  ]);

// ═══ ORDER ITEMS ═══
const ORDER_ITEMS = [
  {
    id: 'oi-001',
    order_id: 'ord-001',
    product_id: 'prd-001',
    variant_id: 'var-001',
    name: 'iPhone 16 Pro Max 256GB - Natural Titanium',
    image: 'https://picsum.photos/seed/iphone16/600/600',
    price: 159900,
    quantity: 1,
  },
  {
    id: 'oi-002',
    order_id: 'ord-001',
    product_id: 'prd-004',
    variant_id: 'var-008',
    name: 'Sony WH-1000XM6 - Black',
    image: 'https://picsum.photos/seed/sonyxm6/600/600',
    price: 35000,
    quantity: 1,
  },
  {
    id: 'oi-003',
    order_id: 'ord-002',
    product_id: 'prd-004',
    variant_id: 'var-009',
    name: 'Sony WH-1000XM6 - Silver',
    image: 'https://picsum.photos/seed/sonyxm6/600/600',
    price: 35000,
    quantity: 1,
  },
  {
    id: 'oi-004',
    order_id: 'ord-003',
    product_id: 'prd-007',
    variant_id: null,
    name: 'OnePlus 13',
    image: 'https://picsum.photos/seed/oneplus13/600/600',
    price: 89999,
    quantity: 1,
  },
];
const OI_COLS = [
  'id',
  'order_id',
  'product_id',
  'variant_id',
  'name',
  'image',
  'price',
  'quantity',
  'created_at',
];
for (const oi of ORDER_ITEMS) insert('order_item', OI_COLS, [{ ...oi, created_at: NOW }]);

// ═══ REVIEWS ═══
const REVIEWS = [
  {
    id: 'rev-001',
    product_id: 'prd-001',
    user_id: 'usr-002',
    order_id: 'ord-001',
    rating: 5,
    title: 'Amazing phone!',
    body: 'The iPhone 16 Pro Max is incredibly fast. Camera is outstanding and battery lasts two days.',
    is_approved: 1,
    is_verified_purchase: 1,
  },
  {
    id: 'rev-002',
    product_id: 'prd-001',
    user_id: 'usr-002',
    order_id: null,
    rating: 4,
    title: 'Great but heavy',
    body: 'Excellent phone. Only downside is the weight.',
    is_approved: 1,
    is_verified_purchase: 0,
  },
  {
    id: 'rev-003',
    product_id: 'prd-004',
    user_id: 'usr-002',
    order_id: 'ord-001',
    rating: 5,
    title: 'Best noise cancellation',
    body: 'Incredible noise cancellation. Very comfortable for long sessions.',
    is_approved: 1,
    is_verified_purchase: 1,
  },
];
const REV_COLS = [
  'id',
  'product_id',
  'user_id',
  'order_id',
  'rating',
  'title',
  'body',
  'is_approved',
  'is_verified_purchase',
  'created_at',
  'updated_at',
];
for (const r of REVIEWS) insert('review', REV_COLS, [{ ...r, created_at: NOW, updated_at: NOW }]);

// ═══ COUPONS ═══
const COUPONS = [
  {
    id: 'cpn-001',
    code: 'WELCOME10',
    type: 'percentage',
    value: 10,
    min_order_amount: 1000,
    max_discount_amount: 2000,
    usage_limit: 100,
    description: '10% off for new customers',
    is_active: 1,
  },
  {
    id: 'cpn-002',
    code: 'FREESHIP',
    type: 'fixed',
    value: 80,
    description: 'Free shipping',
    is_active: 1,
  },
  {
    id: 'cpn-003',
    code: 'SAVE500',
    type: 'fixed',
    value: 500,
    min_order_amount: 10000,
    usage_limit: 50,
    description: 'Flat ৳500 off',
    is_active: 1,
  },
  {
    id: 'cpn-004',
    code: 'MEGA15',
    type: 'percentage',
    value: 15,
    min_order_amount: 5000,
    max_discount_amount: 3000,
    usage_limit: 200,
    description: '15% off electronics',
    is_active: 0,
  },
];
const CPN_COLS = [
  'id',
  'code',
  'type',
  'value',
  'min_order_amount',
  'max_discount_amount',
  'usage_limit',
  'description',
  'is_active',
  'starts_at',
  'expires_at',
  'created_at',
  'updated_at',
];
for (const c of COUPONS)
  insert('coupon', CPN_COLS, [
    { ...c, usage_count: 0, starts_at: NOW, expires_at: EXPIRES, created_at: NOW, updated_at: NOW },
  ]);

// ═══ CONTACT MESSAGES (sample) ═══
const MESSAGES = [
  {
    id: 'msg-001',
    name: 'Rahim Khan',
    email: 'rahim@example.com',
    subject: 'Product Inquiry',
    message:
      'I am interested in the iPhone 16 Pro Max. Do you have the Desert Titanium color in stock? Please let me know.',
    is_read: 0,
  },
  {
    id: 'msg-002',
    name: 'Fatima Begum',
    email: 'fatima@example.com',
    subject: 'Delivery Issue',
    message:
      "My order TK-000002 was supposed to arrive yesterday but it hasn't been delivered yet. Can you please check the status?",
    is_read: 1,
  },
  {
    id: 'msg-003',
    name: 'Kamal Hossain',
    email: 'kamal@example.com',
    subject: 'Return Request',
    message:
      "I received a defective product. The headphone's left earbud is not working. Please initiate a return.",
    is_read: 1,
  },
];
const MSG_COLS = [
  'id',
  'name',
  'email',
  'subject',
  'message',
  'is_read',
  'created_at',
  'updated_at',
];
for (const m of MESSAGES)
  insert('contact_message', MSG_COLS, [{ ...m, created_at: NOW, updated_at: NOW }]);

// ═══ NEWSLETTER SUBSCRIBERS ═══
const SUBS = [
  { id: 'sub-001', email: 'rahim@example.com', is_active: 1 },
  { id: 'sub-002', email: 'fatima@example.com', is_active: 1 },
];
const SUB_COLS = ['id', 'email', 'is_active', 'created_at'];
for (const s of SUBS) insert('newsletter_subscriber', SUB_COLS, [{ ...s, created_at: NOW }]);

sql = `-- Tuktak Database Seed (Comprehensive Demo Data)\n-- Generated: ${new Date().toISOString()}\n-- Includes: products, categories, brands, variants, hero slides, blog posts,\n-- orders, reviews, coupons, contact messages, newsletter subscribers\n\n${sql}\n`;

const outPath = path.join(__dirname, 'seed.sql');
fs.writeFileSync(outPath, sql, 'utf-8');
console.log(`✅ Seed SQL written to: ${outPath}`);
console.log(`   Apply with: psql "$DATABASE_URL" -f drizzle/seed.sql`);
