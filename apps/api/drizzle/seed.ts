/**
 * Tuktak Database Seeder — Comprehensive Demo Data
 *
 * Generates seed SQL for PostgreSQL (self-hosted). Run:
 *   npx tsx drizzle/seed.ts
 *   psql "$DATABASE_URL" -f drizzle/seed.sql
 *
 * Every statement is idempotent (`ON CONFLICT DO NOTHING`) so it can be applied
 * repeatedly. Column lists below must match src/db/schema.ts exactly.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOW = new Date('2025-07-01T00:00:00.000Z').toISOString();
const EXPIRES = new Date('2026-12-31T23:59:59.000Z').toISOString();

/**
 * Render a SQL literal.
 *
 * Every scalar is quoted: Postgres coerces an unknown-type literal into the
 * target column type, so `'1'` inserts into both integer and boolean columns
 * and `'2025-07-01T00:00:00.000Z'` into timestamptz. (Integer literals like `1`
 * are NOT implicitly cast to boolean, which is why booleans must be quoted.)
 */
const q = (s: unknown) => {
  if (s === null || s === undefined) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
};
const j = (arr: unknown[]) => arr.map(q).join(', ');

const counts = new Map<string, number>();
function insert(table: string, columns: string[], rows: Record<string, unknown>[]) {
  let sql = '';
  const cols = columns.map((c) => `"${c}"`).join(', ');
  for (const row of rows) {
    sql += `INSERT INTO "${table}" (${cols}) VALUES (${j(columns.map((c) => row[c]))}) ON CONFLICT DO NOTHING;\n`;
  }
  counts.set(table, (counts.get(table) ?? 0) + rows.length);
  return sql;
}

const STORE = new Date('2025-07-01T00:00:00.000Z').toISOString();

/** Unsplash CDN base — no query string so the Next.js loader can append resize params. */
const u = (id: string) => `https://images.unsplash.com/photo-${id}`;

let sql = '';

// ══════════════════════════════════
//  CATEGORIES
// ══════════════════════════════════
const CATEGORIES = [
  {
    id: 'cat-001',
    name: 'Smartphones',
    slug: 'smartphones',
    description: 'Latest smartphones from top brands',
    image: u('1511707171634-5f897ff02aa9'),
    sort_order: 1,
    parent_id: null,
  },
  {
    id: 'cat-002',
    name: 'Laptops',
    slug: 'laptops',
    description: 'Laptops for work, study, and gaming',
    image: u('1496181133206-80ce9b88a853'),
    sort_order: 2,
    parent_id: null,
  },
  {
    id: 'cat-003',
    name: 'Audio',
    slug: 'audio',
    description: 'Headphones, earphones, and speakers',
    image: u('1505740420928-5e560c06d30e'),
    sort_order: 3,
    parent_id: null,
  },
  {
    id: 'cat-004',
    name: 'Smartwatches',
    slug: 'smartwatches',
    description: 'Wearable technology',
    image: u('1523275335684-37898b6baf30'),
    sort_order: 4,
    parent_id: null,
  },
  {
    id: 'cat-005',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Chargers, cables, power banks and more',
    image: u('1625772452859-1c03d5bf1137'),
    sort_order: 5,
    parent_id: null,
  },
  {
    id: 'cat-006',
    name: 'Gaming',
    slug: 'gaming',
    description: 'Consoles, controllers and handhelds',
    image: u('1612287230202-1ff1d85d1bdf'),
    sort_order: 6,
    parent_id: null,
  },
  {
    id: 'cat-007',
    name: 'Tablets',
    slug: 'tablets',
    description: 'Tablets for productivity and entertainment',
    image: u('1544244015-0df4b3ffc6b0'),
    sort_order: 7,
    parent_id: null,
  },
  {
    id: 'cat-008',
    name: 'Cameras',
    slug: 'cameras',
    description: 'Mirrorless, DSLR and action cameras',
    image: u('1516035069371-29a1b244cc32'),
    sort_order: 8,
    parent_id: null,
  },
  {
    id: 'cat-009',
    name: 'Speakers',
    slug: 'speakers',
    description: 'Bluetooth and smart speakers',
    image: u('1608043152269-423dbba4e7e1'),
    sort_order: 9,
    parent_id: null,
  },
  {
    id: 'cat-010',
    name: 'Smart Home',
    slug: 'smart-home',
    description: 'Smart displays, lighting and IoT devices',
    image: u('1558089687-f282ffcbc126'),
    sort_order: 10,
    parent_id: null,
  },
  {
    id: 'cat-101',
    name: 'Android Phones',
    slug: 'android-phones',
    description: 'Android flagships and mid-rangers',
    image: u('1598327105666-5b89351aff97'),
    parent_id: 'cat-001',
    sort_order: 1,
  },
  {
    id: 'cat-102',
    name: 'iPhones',
    slug: 'iphones',
    description: 'The latest Apple iPhones',
    image: u('1695048133142-1a20484d2569'),
    parent_id: 'cat-001',
    sort_order: 2,
  },
  {
    id: 'cat-201',
    name: 'Windows Laptops',
    slug: 'windows-laptops',
    description: 'Windows ultrabooks and gaming laptops',
    image: u('1593642702821-c8da6771f0c6'),
    parent_id: 'cat-002',
    sort_order: 1,
  },
  {
    id: 'cat-202',
    name: 'MacBooks',
    slug: 'macbooks',
    description: 'Apple MacBook Air and Pro',
    image: u('1517336714731-489689fd1ca8'),
    parent_id: 'cat-002',
    sort_order: 2,
  },
];
const CAT_COLS = [
  'id',
  'name',
  'slug',
  'description',
  'image',
  'parent_id',
  'sort_order',
  'is_active',
  'created_at',
  'updated_at',
];
sql += insert(
  'category',
  CAT_COLS,
  CATEGORIES.map((c) => ({ ...c, is_active: true, created_at: NOW, updated_at: NOW }))
);

// ══════════════════════════════════
//  BRANDS
// ══════════════════════════════════
const logo = (text: string, bg: string, fg = 'ffffff') =>
  `https://placehold.co/200x80/${bg}/${fg}?text=${encodeURIComponent(text)}`;

const BRANDS = [
  { id: 'brd-001', name: 'Apple', slug: 'apple', logo: logo('Apple', '000000') },
  { id: 'brd-002', name: 'Samsung', slug: 'samsung', logo: logo('Samsung', '1428a0') },
  { id: 'brd-003', name: 'Xiaomi', slug: 'xiaomi', logo: logo('Xiaomi', 'ff6900') },
  { id: 'brd-004', name: 'Sony', slug: 'sony', logo: logo('Sony', '000000') },
  { id: 'brd-005', name: 'Dell', slug: 'dell', logo: logo('Dell', '007db8') },
  { id: 'brd-006', name: 'HP', slug: 'hp', logo: logo('HP', '0096d6') },
  { id: 'brd-007', name: 'Lenovo', slug: 'lenovo', logo: logo('Lenovo', 'e2231a') },
  { id: 'brd-008', name: 'OnePlus', slug: 'oneplus', logo: logo('OnePlus', 'e50000') },
  { id: 'brd-009', name: 'ASUS', slug: 'asus', logo: logo('ASUS', '00539b') },
  { id: 'brd-010', name: 'Nothing', slug: 'nothing', logo: logo('Nothing', '000000') },
  { id: 'brd-011', name: 'JBL', slug: 'jbl', logo: logo('JBL', 'ff6600') },
  { id: 'brd-012', name: 'Anker', slug: 'anker', logo: logo('Anker', '0066cc') },
  { id: 'brd-013', name: 'Google', slug: 'google', logo: logo('Google', '4285f4') },
];
const BRD_COLS = ['id', 'name', 'slug', 'logo', 'is_active', 'created_at', 'updated_at'];
sql += insert(
  'brand',
  BRD_COLS,
  BRANDS.map((b) => ({ ...b, is_active: true, created_at: NOW, updated_at: NOW }))
);

// ══════════════════════════════════
//  PRODUCTS
// ══════════════════════════════════
type ProductSeed = {
  id: string;
  name: string;
  name_bn: string;
  slug: string;
  description: string;
  description_bn: string;
  short_description: string;
  short_description_bn: string;
  price: number;
  compare_at_price?: number;
  cost?: number;
  sku: string;
  stock: number;
  category_id: string;
  brand_id: string;
  image: string;
  images: string[];
  is_featured?: boolean;
  weight?: number;
  rating: number;
  review_count: number;
};

const PRODUCTS: ProductSeed[] = [
  {
    id: 'prd-001',
    name: 'iPhone 16 Pro Max 256GB',
    name_bn: 'আইফোন ১৬ প্রো ম্যাক্স ২৫৬জিবি',
    slug: 'iphone-16-pro-max-256gb',
    description:
      'The most powerful iPhone ever. A18 Pro chip, 48MP Fusion camera system and a titanium design built to last.',
    description_bn:
      'সবচেয়ে শক্তিশালী আইফোন। A18 Pro চিপ, 48MP ফিউশন ক্যামেরা সিস্টেম এবং টাইটানিয়াম ডিজাইন।',
    short_description: 'A18 Pro | 48MP Camera | Titanium',
    short_description_bn: 'A18 Pro | 48MP ক্যামেরা | টাইটানিয়াম',
    price: 159900,
    compare_at_price: 169900,
    cost: 111930,
    sku: 'APL-16PM-256',
    stock: 50,
    category_id: 'cat-102',
    brand_id: 'brd-001',
    image: u('1695048133142-1a20484d2569'),
    images: [u('1591337676887-a217a6970a8a'), u('1511707171634-5f897ff02aa9')],
    is_featured: true,
    weight: 227,
    rating: 480,
    review_count: 24,
  },
  {
    id: 'prd-002',
    name: 'Samsung Galaxy S25 Ultra',
    name_bn: 'স্যামসাং গ্যালাক্সি S25 আল্ট্রা',
    slug: 'samsung-galaxy-s25-ultra',
    description: 'Galaxy AI, a 200MP camera and the built-in S Pen in a titanium frame.',
    description_bn: 'গ্যালাক্সি AI, 200MP ক্যামেরা এবং বিল্ট-ইন এস পেন, টাইটানিয়াম ফ্রেমে।',
    short_description: 'Galaxy AI | 200MP Camera | S Pen',
    short_description_bn: 'গ্যালাক্সি AI | 200MP ক্যামেরা | এস পেন',
    price: 149900,
    compare_at_price: 159900,
    cost: 104930,
    sku: 'SAM-S25U-256',
    stock: 35,
    category_id: 'cat-101',
    brand_id: 'brd-002',
    image: u('1610945265064-0e34e5519bbf'),
    images: [u('1678685888221-cda773a3dcdb'), u('1598327105666-5b89351aff97')],
    is_featured: true,
    weight: 218,
    rating: 460,
    review_count: 18,
  },
  {
    id: 'prd-003',
    name: 'MacBook Air M4 15-inch',
    name_bn: 'ম্যাকবুক এয়ার M4 ১৫-ইঞ্চি',
    slug: 'macbook-air-m4-15',
    description:
      'M4 chip, a 15.3-inch Liquid Retina display and 18GB of unified memory in a fanless design.',
    description_bn: 'M4 চিপ, ১৫.৩-ইঞ্চি লিকুইড রেটিনা ডিসপ্লে এবং ১৮জিবি মেমোরি।',
    short_description: 'M4 Chip | 15.3" Display | 18GB RAM',
    short_description_bn: 'M4 চিপ | ১৫.৩" ডিসপ্লে | ১৮জিবি র‍্যাম',
    price: 169900,
    compare_at_price: 179900,
    cost: 122000,
    sku: 'APL-MBA-M4-15',
    stock: 20,
    category_id: 'cat-202',
    brand_id: 'brd-001',
    image: u('1517336714731-489689fd1ca8'),
    images: [u('1611186871348-b1ce696e52c9'), u('1496181133206-80ce9b88a853')],
    is_featured: true,
    weight: 1510,
    rating: 490,
    review_count: 31,
  },
  {
    id: 'prd-004',
    name: 'Sony WH-1000XM6 Wireless',
    name_bn: 'সনি WH-1000XM6 ওয়্যারলেস',
    slug: 'sony-wh-1000xm6',
    description: 'Industry-leading noise cancellation, 30-hour battery and Hi-Res Audio.',
    description_bn: 'শিল্প-নেতৃস্থানীয় নয়েজ ক্যান্সেলেশন, ৩০-ঘন্টা ব্যাটারি ও হাই-রেজ অডিও।',
    short_description: 'Noise Cancelling | 30h Battery',
    short_description_bn: 'নয়েজ ক্যান্সেলিং | ৩০ঘ ব্যাটারি',
    price: 35000,
    compare_at_price: 40000,
    cost: 24500,
    sku: 'SNY-XM6-BLK',
    stock: 100,
    category_id: 'cat-003',
    brand_id: 'brd-004',
    image: u('1618366712010-f4ae9c647dcb'),
    images: [u('1546435770-a3e426bf472b'), u('1505740420928-5e560c06d30e')],
    is_featured: true,
    weight: 250,
    rating: 470,
    review_count: 42,
  },
  {
    id: 'prd-005',
    name: 'Xiaomi 14T Pro',
    name_bn: 'জিয়াওমি ১৪টি প্রো',
    slug: 'xiaomi-14t-pro',
    description: 'Leica optics, Dimensity 9300+ and 120W HyperCharge fast charging.',
    description_bn: 'লাইকা অপটিক্স, Dimensity 9300+ এবং 120W হাইপারচার্জ।',
    short_description: 'Leica Cameras | 120W Charging',
    short_description_bn: 'লাইকা ক্যামেরা | ১২০W চার্জিং',
    price: 69999,
    compare_at_price: 79999,
    cost: 49000,
    sku: 'XMI-14TP-512',
    stock: 45,
    category_id: 'cat-101',
    brand_id: 'brd-003',
    image: u('1598327105666-5b89351aff97'),
    images: [u('1678685888221-cda773a3dcdb'), u('1511707171634-5f897ff02aa9')],
    weight: 209,
    rating: 440,
    review_count: 15,
  },
  {
    id: 'prd-006',
    name: 'Dell XPS 16 Ultra 9',
    name_bn: 'ডেল XPS ১৬ আল্ট্রা ৯',
    slug: 'dell-xps-16',
    description: 'Intel Core Ultra 9, 32GB RAM, 1TB SSD and a 4K OLED display.',
    description_bn: 'ইন্টেল কোর আল্ট্রা ৯, ৩২জিবি র‍্যাম, ১টিবি এসএসডি ও ৪কে ওএলইডি ডিসপ্লে।',
    short_description: 'Ultra 9 | 32GB RAM | 4K OLED',
    short_description_bn: 'আল্ট্রা ৯ | ৩২জিবি র‍্যাম | ৪কে ওএলইডি',
    price: 249900,
    cost: 185000,
    sku: 'DEL-XPS16-U9',
    stock: 10,
    category_id: 'cat-201',
    brand_id: 'brd-005',
    image: u('1593642702821-c8da6771f0c6'),
    images: [u('1525547719571-a2d4ac8945e2'), u('1496181133206-80ce9b88a853')],
    weight: 2180,
    rating: 450,
    review_count: 8,
  },
  {
    id: 'prd-007',
    name: 'OnePlus 13',
    name_bn: 'ওয়ানপ্লাস ১৩',
    slug: 'oneplus-13',
    description: 'Snapdragon 8 Elite, Hasselblad camera tuning and 100W charging.',
    description_bn: 'Snapdragon 8 Elite, হ্যাসেলব্ল্যাড ক্যামেরা ও ১০০W চার্জিং।',
    short_description: 'SD 8 Elite | Hasselblad | 100W',
    short_description_bn: 'SD 8 Elite | হ্যাসেলব্ল্যাড | ১০০W',
    price: 89999,
    compare_at_price: 94999,
    cost: 62999,
    sku: 'ONP-13-256',
    stock: 30,
    category_id: 'cat-101',
    brand_id: 'brd-008',
    image: u('1511707171634-5f897ff02aa9'),
    images: [u('1591337676887-a217a6970a8a'), u('1598327105666-5b89351aff97')],
    is_featured: true,
    weight: 210,
    rating: 455,
    review_count: 12,
  },
  {
    id: 'prd-008',
    name: 'Apple Watch Ultra 3',
    name_bn: 'অ্যাপল ওয়াচ আল্ট্রা ৩',
    slug: 'apple-watch-ultra-3',
    description: 'Titanium case, dual-frequency GPS and up to 36 hours of battery life.',
    description_bn: 'টাইটানিয়াম কেস, ডুয়াল-ফ্রিকোয়েন্সি জিপিএস ও ৩৬ ঘন্টা ব্যাটারি।',
    short_description: 'Titanium | GPS | 36h Battery',
    short_description_bn: 'টাইটানিয়াম | জিপিএস | ৩৬ঘ ব্যাটারি',
    price: 89900,
    compare_at_price: 95900,
    cost: 64000,
    sku: 'APL-WU3-49',
    stock: 25,
    category_id: 'cat-004',
    brand_id: 'brd-001',
    image: u('1434493789847-2f02dc6ca35d'),
    images: [u('1523275335684-37898b6baf30')],
    weight: 61,
    rating: 475,
    review_count: 9,
  },
  {
    id: 'prd-009',
    name: 'Nothing Phone (3)',
    name_bn: 'নাথিং ফোন (৩)',
    slug: 'nothing-phone-3',
    description: 'The Glyph Interface, a 50MP camera and a transparent design that stands out.',
    description_bn: 'গ্লিফ ইন্টারফেস, ৫০MP ক্যামেরা ও ট্রান্সপারেন্ট ডিজাইন।',
    short_description: 'Glyph Interface | Transparent Design',
    short_description_bn: 'গ্লিফ ইন্টারফেস | ট্রান্সপারেন্ট ডিজাইন',
    price: 54999,
    compare_at_price: 59999,
    cost: 38499,
    sku: 'NTH-PH3-256',
    stock: 60,
    category_id: 'cat-101',
    brand_id: 'brd-010',
    image: u('1678685888221-cda773a3dcdb'),
    images: [u('1598327105666-5b89351aff97'), u('1511707171634-5f897ff02aa9')],
    is_featured: true,
    weight: 195,
    rating: 430,
    review_count: 20,
  },
  {
    id: 'prd-010',
    name: 'iPad Pro M4 13-inch',
    name_bn: 'আইপ্যাড প্রো M4 ১৩-ইঞ্চি',
    slug: 'ipad-pro-m4-13',
    description: 'M4 chip, Ultra Retina XDR display and a 5.1mm thin enclosure.',
    description_bn: 'M4 চিপ, আল্ট্রা রেটিনা XDR ডিসপ্লে ও ৫.১ মিমি ডিজাইন।',
    short_description: 'M4 Chip | XDR Display | 5.1mm',
    short_description_bn: 'M4 চিপ | XDR ডিসপ্লে | ৫.১মিমি',
    price: 159900,
    compare_at_price: 169900,
    cost: 118000,
    sku: 'APL-IPD-M4-13',
    stock: 15,
    category_id: 'cat-007',
    brand_id: 'brd-001',
    image: u('1544244015-0df4b3ffc6b0'),
    images: [u('1561154464-82e9adf32764')],
    weight: 579,
    rating: 485,
    review_count: 7,
  },
  {
    id: 'prd-011',
    name: 'ASUS ROG Ally X',
    name_bn: 'আসুস ROG অ্যালি X',
    slug: 'asus-rog-ally-x',
    description: 'Handheld gaming with Ryzen Z1 Extreme, a 7" 120Hz display and an 80Wh battery.',
    description_bn: 'Ryzen Z1 Extreme, ৭" 120Hz ডিসপ্লে ও ৮০Wh ব্যাটারি সহ হ্যান্ডহেল্ড গেমিং।',
    short_description: 'Ryzen Z1E | 7" 120Hz | 80Wh',
    short_description_bn: 'Ryzen Z1E | ৭" 120Hz | ৮০Wh',
    price: 89900,
    compare_at_price: 94900,
    cost: 62930,
    sku: 'ASU-ROGALX-X',
    stock: 22,
    category_id: 'cat-006',
    brand_id: 'brd-009',
    image: u('1612287230202-1ff1d85d1bdf'),
    images: [u('1606144042614-b2417e99c4e3')],
    weight: 678,
    rating: 460,
    review_count: 14,
  },
  {
    id: 'prd-012',
    name: 'Samsung Galaxy Watch 7',
    name_bn: 'স্যামসাং গ্যালাক্সি ওয়াচ ৭',
    slug: 'samsung-galaxy-watch-7',
    description: 'BioActive sensor, sleep coaching and up to 4 days of battery life.',
    description_bn: 'BioActive সেন্সর, স্লিপ কোচিং ও ৪ দিনের ব্যাটারি।',
    short_description: 'Titanium | 4-Day Battery',
    short_description_bn: 'টাইটানিয়াম | ৪-দিনের ব্যাটারি',
    price: 49900,
    compare_at_price: 54900,
    cost: 34930,
    sku: 'SAM-GW7-44',
    stock: 40,
    category_id: 'cat-004',
    brand_id: 'brd-002',
    image: u('1523275335684-37898b6baf30'),
    images: [u('1434493789847-2f02dc6ca35d')],
    weight: 57,
    rating: 445,
    review_count: 11,
  },
  {
    id: 'prd-013',
    name: 'Apple AirPods Pro 2',
    name_bn: 'অ্যাপল এয়ারপডস প্রো ২',
    slug: 'apple-airpods-pro-2',
    description: 'Adaptive Audio, 2x more Active Noise Cancellation and a USB-C MagSafe case.',
    description_bn: 'অ্যাডাপটিভ অডিও, দ্বিগুণ নয়েজ ক্যান্সেলেশন ও USB-C MagSafe কেস।',
    short_description: 'Adaptive Audio | USB-C Case',
    short_description_bn: 'অ্যাডাপটিভ অডিও | USB-C কেস',
    price: 27999,
    compare_at_price: 32999,
    cost: 18500,
    sku: 'APL-APP2-USBC',
    stock: 55,
    category_id: 'cat-003',
    brand_id: 'brd-001',
    image: u('1606220588913-b3aacb4d2f46'),
    images: [u('1505740420928-5e560c06d30e')],
    weight: 51,
    rating: 465,
    review_count: 38,
  },
  {
    id: 'prd-014',
    name: 'Sony Alpha A7 IV',
    name_bn: 'সনি আলফা A7 IV',
    slug: 'sony-alpha-a7-iv',
    description: 'Full-frame 33MP sensor, real-time Eye AF and 4K 60p video.',
    description_bn: 'ফুল-ফ্রেম ৩৩MP সেন্সর, রিয়েল-টাইম Eye AF ও 4K 60p ভিডিও।',
    short_description: '33MP Full-Frame | 4K 60p',
    short_description_bn: '৩৩MP ফুল-ফ্রেম | 4K 60p',
    price: 249999,
    compare_at_price: 279999,
    cost: 185000,
    sku: 'SNY-A7IV-BODY',
    stock: 8,
    category_id: 'cat-008',
    brand_id: 'brd-004',
    image: u('1516035069371-29a1b244cc32'),
    images: [u('1502920917128-1aa500764cbd')],
    is_featured: true,
    weight: 658,
    rating: 470,
    review_count: 6,
  },
  {
    id: 'prd-015',
    name: 'JBL Charge 5',
    name_bn: 'জেবিএল চার্জ ৫',
    slug: 'jbl-charge-5',
    description:
      'Portable Bluetooth speaker with JBL Pro Sound, 20 hours of playtime and IP67 rating.',
    description_bn: 'JBL Pro Sound, ২০ ঘন্টা প্লেটাইম ও IP67 রেটিং সহ পোর্টেবল স্পিকার।',
    short_description: 'IP67 Waterproof | 20h Playtime',
    short_description_bn: 'IP67 ওয়াটারপ্রুফ | ২০ঘ প্লেটাইম',
    price: 14999,
    compare_at_price: 17999,
    cost: 9500,
    sku: 'JBL-CHG5-BLK',
    stock: 70,
    category_id: 'cat-009',
    brand_id: 'brd-011',
    image: u('1608043152269-423dbba4e7e1'),
    images: [u('1589003077984-894e133dabab')],
    weight: 960,
    rating: 440,
    review_count: 27,
  },
  {
    id: 'prd-016',
    name: 'Anker PowerCore 26800mAh',
    name_bn: 'অ্যাঙ্কার পাওয়ারকোর ২৬৮০০',
    slug: 'anker-powercore-26800',
    description: 'Ultra-high capacity 26800mAh portable charger with dual USB output.',
    description_bn: 'অতি-উচ্চ ক্ষমতা ২৬৮০০mAh পোর্টেবল চার্জার, ডুয়াল USB আউটপুট।',
    short_description: '26800mAh | Dual USB | Fast Charge',
    short_description_bn: '২৬৮০০mAh | ডুয়াল USB | ফাস্ট চার্জ',
    price: 4999,
    compare_at_price: 6999,
    cost: 3200,
    sku: 'ANK-PC-26800',
    stock: 90,
    category_id: 'cat-005',
    brand_id: 'brd-012',
    image: u('1609091839311-d5365f9ff1c5'),
    images: [u('1585338107529-13afc5f02586'), u('1625772452859-1c03d5bf1137')],
    weight: 495,
    rating: 430,
    review_count: 52,
  },
  {
    id: 'prd-017',
    name: 'Google Nest Hub Max',
    name_bn: 'গুগল নেস্ট হাব ম্যাক্স',
    slug: 'google-nest-hub-max',
    description:
      '10-inch smart display with Google Assistant, built-in Nest Cam and stereo speakers.',
    description_bn: 'বিল্ট-ইন Nest Cam ও স্টেরিও স্পিকার সহ ১০ ইঞ্চি স্মার্ট ডিসপ্লে।',
    short_description: '10" Smart Display | Nest Cam',
    short_description_bn: '১০" স্মার্ট ডিসপ্লে | Nest Cam',
    price: 24999,
    compare_at_price: 29999,
    cost: 17000,
    sku: 'GGL-NHM-CHR',
    stock: 18,
    category_id: 'cat-010',
    brand_id: 'brd-013',
    image: u('1558089687-f282ffcbc126'),
    images: [u('1543512214-318c7553f230')],
    weight: 1320,
    rating: 420,
    review_count: 10,
  },
  {
    id: 'prd-018',
    name: 'Sony DualSense Controller',
    name_bn: 'সনি ডুয়ালসেন্স কন্ট্রোলার',
    slug: 'sony-dualsense-controller',
    description: 'Haptic feedback, adaptive triggers and a built-in microphone for PS5.',
    description_bn: 'হ্যাপটিক ফিডব্যাক, অ্যাডাপটিভ ট্রিগার ও বিল্ট-ইন মাইক্রোফোন, PS5 এর জন্য।',
    short_description: 'Haptic Feedback | Adaptive Triggers',
    short_description_bn: 'হ্যাপটিক ফিডব্যাক | অ্যাডাপটিভ ট্রিগার',
    price: 6999,
    compare_at_price: 7999,
    cost: 4500,
    sku: 'SNY-DS-WHT',
    stock: 65,
    category_id: 'cat-006',
    brand_id: 'brd-004',
    image: u('1606144042614-b2417e99c4e3'),
    images: [u('1592840496694-26d035b52b48'), u('1612287230202-1ff1d85d1bdf')],
    weight: 280,
    rating: 450,
    review_count: 19,
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
sql += insert(
  'product',
  PRD_COLS,
  PRODUCTS.map((p) => ({
    id: p.id,
    name: p.name,
    name_bn: p.name_bn,
    slug: p.slug,
    description: p.description,
    description_bn: p.description_bn,
    short_description: p.short_description,
    short_description_bn: p.short_description_bn,
    price: p.price,
    compare_at_price: p.compare_at_price ?? null,
    cost: p.cost ?? null,
    sku: p.sku,
    stock: p.stock,
    low_stock_threshold: 5,
    category_id: p.category_id,
    brand_id: p.brand_id,
    image: p.image,
    // Stored as a JSON array string — the storefront JSON.parses this field.
    images: JSON.stringify(p.images),
    is_active: true,
    is_featured: p.is_featured ?? false,
    weight: p.weight ?? null,
    rating: p.rating,
    review_count: p.review_count,
    meta_title: `${p.name} | Tuktak`,
    meta_description: p.short_description,
    created_at: STORE,
    updated_at: STORE,
  }))
);

// ══════════════════════════════════
//  PRODUCT VARIANTS
// ══════════════════════════════════
const VARIANTS = [
  {
    id: 'var-001',
    product_id: 'prd-001',
    name: '256GB Natural Titanium',
    sku: 'APL-16PM-256-NAT',
    price: 159900,
    compare_at_price: 169900,
    stock: 20,
    image: u('1695048133142-1a20484d2569'),
    attributes: JSON.stringify({ color: 'natural titanium', storage: '256gb' }),
  },
  {
    id: 'var-002',
    product_id: 'prd-001',
    name: '512GB Natural Titanium',
    sku: 'APL-16PM-512-NAT',
    price: 179900,
    compare_at_price: 189900,
    stock: 15,
    image: u('1591337676887-a217a6970a8a'),
    attributes: JSON.stringify({ color: 'natural titanium', storage: '512gb' }),
  },
  {
    id: 'var-003',
    product_id: 'prd-001',
    name: '256GB Desert Titanium',
    sku: 'APL-16PM-256-DES',
    price: 159900,
    compare_at_price: 169900,
    stock: 15,
    image: u('1511707171634-5f897ff02aa9'),
    attributes: JSON.stringify({ color: 'desert titanium', storage: '256gb' }),
  },
  {
    id: 'var-004',
    product_id: 'prd-002',
    name: '256GB Titanium Gray',
    sku: 'SAM-S25U-256-GRY',
    price: 149900,
    compare_at_price: 159900,
    stock: 15,
    image: u('1610945265064-0e34e5519bbf'),
    attributes: JSON.stringify({ color: 'titanium gray', storage: '256gb' }),
  },
  {
    id: 'var-005',
    product_id: 'prd-002',
    name: '512GB Titanium Gray',
    sku: 'SAM-S25U-512-GRY',
    price: 169900,
    compare_at_price: 179900,
    stock: 10,
    image: u('1678685888221-cda773a3dcdb'),
    attributes: JSON.stringify({ color: 'titanium gray', storage: '512gb' }),
  },
  {
    id: 'var-006',
    product_id: 'prd-003',
    name: '15" M4/18GB/512GB Midnight',
    sku: 'APL-MBA-M4-512-MID',
    price: 169900,
    compare_at_price: 179900,
    stock: 8,
    image: u('1517336714731-489689fd1ca8'),
    attributes: JSON.stringify({ color: 'midnight', storage: '512gb' }),
  },
  {
    id: 'var-007',
    product_id: 'prd-003',
    name: '15" M4/16GB/256GB Starlight',
    sku: 'APL-MBA-M4-256-STA',
    price: 149900,
    compare_at_price: 159900,
    stock: 6,
    image: u('1611186871348-b1ce696e52c9'),
    attributes: JSON.stringify({ color: 'starlight', storage: '256gb' }),
  },
  {
    id: 'var-008',
    product_id: 'prd-004',
    name: 'WH-1000XM6 Black',
    sku: 'SNY-XM6-BLK-V',
    price: 35000,
    compare_at_price: 40000,
    stock: 40,
    image: u('1618366712010-f4ae9c647dcb'),
    attributes: JSON.stringify({ color: 'black' }),
  },
  {
    id: 'var-009',
    product_id: 'prd-004',
    name: 'WH-1000XM6 Silver',
    sku: 'SNY-XM6-SLV-V',
    price: 35000,
    compare_at_price: 40000,
    stock: 30,
    image: u('1546435770-a3e426bf472b'),
    attributes: JSON.stringify({ color: 'silver' }),
  },
  {
    id: 'var-010',
    product_id: 'prd-004',
    name: 'WH-1000XM6 Midnight Blue',
    sku: 'SNY-XM6-MBL-V',
    price: 36500,
    compare_at_price: 41500,
    stock: 20,
    image: u('1505740420928-5e560c06d30e'),
    attributes: JSON.stringify({ color: 'midnight blue' }),
  },
];
const VAR_COLS = [
  'id',
  'product_id',
  'name',
  'sku',
  'price',
  'compare_at_price',
  'cost',
  'stock',
  'low_stock_threshold',
  'image',
  'attributes',
  'is_active',
  'created_at',
  'updated_at',
];
sql += insert(
  'product_variant',
  VAR_COLS,
  VARIANTS.map((v) => ({
    ...v,
    cost: null,
    low_stock_threshold: 5,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  }))
);

// ══════════════════════════════════
//  HERO SLIDES
// ══════════════════════════════════
const HERO_SLIDES = [
  {
    id: 'hero-001',
    title: 'The Latest Tech, Delivered',
    title_bn: 'সর্বশেষ প্রযুক্তি, আপনার দোরগোড়ায়',
    subtitle: 'Discover premium electronics and gadgets at unbeatable prices',
    subtitle_bn: 'অপরাজিত মূল্যে প্রিমিয়াম ইলেকট্রনিক্স ও গ্যাজেট আবিষ্কার করুন',
    image: u('1511707171634-5f897ff02aa9'),
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
    show_trust_badges: true,
    show_title: true,
    show_subtitle: true,
    sort_order: 0,
  },
  {
    id: 'hero-002',
    title: 'Summer Sale — Up to 40% Off',
    title_bn: 'গ্রীষ্মকালীন সেল — ৪০% পর্যন্ত ছাড়',
    subtitle: "Limited time offers on top brands. Don't miss out!",
    subtitle_bn: 'শীর্ষ ব্র্যান্ডে সীমিত সময়ের অফার। মিস করবেন না!',
    image: u('1607082348824-0a96f2a4b9da'),
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
    show_trust_badges: true,
    show_title: true,
    show_subtitle: true,
    sort_order: 1,
  },
  {
    id: 'hero-003',
    title: 'Premium Audio Experience',
    title_bn: 'প্রিমিয়াম অডিও অভিজ্ঞতা',
    subtitle: 'Sony, JBL and more — immerse yourself in sound',
    subtitle_bn: 'Sony, JBL এবং আরও — শব্দে ডুবে যান',
    image: u('1505740420928-5e560c06d30e'),
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
    show_trust_badges: true,
    show_title: true,
    show_subtitle: true,
    sort_order: 2,
  },
  {
    id: 'hero-004',
    title: 'Work From Anywhere',
    title_bn: 'যেখানেই কাজ করুন',
    subtitle: "Bangladesh's trusted destination for premium laptops and gadgets",
    subtitle_bn: 'প্রিমিয়াম ল্যাপটপ ও গ্যাজেটের জন্য বাংলাদেশের বিশ্বস্ত গন্তব্য',
    image: u('1496181133206-80ce9b88a853'),
    cta_text: 'Shop Laptops',
    cta_text_bn: 'ল্যাপটপ কিনুন',
    cta_link: '/categories/laptops',
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
    show_trust_badges: true,
    show_title: true,
    show_subtitle: true,
    sort_order: 3,
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
sql += insert(
  'hero_slide',
  HERO_COLS,
  HERO_SLIDES.map((h) => ({
    ...h,
    background_image: null,
    cta_secondary_text: h.cta_secondary_text ?? null,
    cta_secondary_text_bn: h.cta_secondary_text_bn ?? null,
    cta_secondary_link: h.cta_secondary_link ?? null,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  }))
);

// ══════════════════════════════════
//  BLOG POSTS
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
    image: u('1695048133142-1a20484d2569'),
    author: 'Tuktak Tech',
    tags: 'iPhone,Apple,Smartphones,Review',
    published_at: STORE,
  },
  {
    id: 'blog-002',
    title: 'Top Gadgets Under ৳50,000 in Bangladesh',
    slug: 'top-gadgets-under-50000',
    excerpt:
      'Our curated list of the best value-for-money electronics available in Bangladesh under ৳50,000.',
    content:
      "Finding quality electronics on a budget in Bangladesh can be challenging. We've done the research so you don't have to.\n\nFrom noise-cancelling headphones to smartwatches, here are our top picks under ৳50,000:\n\n1. Sony WH-1000XM6 - ৳35,000\n2. Samsung Galaxy Watch 7 - ৳49,900\n3. Apple AirPods Pro 2 - ৳27,999\n4. JBL Charge 5 - ৳14,999\n\nEach of these products offers exceptional value for their price point.",
    image: u('1505740420928-5e560c06d30e'),
    author: 'Tuktak Team',
    tags: 'Budget,Gadgets,Bangladesh,Guide',
    published_at: STORE,
  },
  {
    id: 'blog-003',
    title: 'The Ultimate Guide to Wireless Headphones',
    slug: 'wireless-headphones-guide-2025',
    excerpt:
      'Everything you need to know about choosing the perfect wireless headphones for your lifestyle.',
    content:
      "Wireless headphones have become essential for modern life. Whether you're working from home, commuting, or hitting the gym, the right pair can transform your experience.\n\nKey factors to consider:\n\n1. **Sound Quality**: Look for Hi-Res Audio support and LDAC codec\n2. **Noise Cancellation**: Active Noise Cancellation (ANC) is essential for busy environments\n3. **Battery Life**: Aim for 30+ hours for over-ear headphones\n4. **Comfort**: Weight and ear cushion material matter for long sessions\n\nOur top recommendation: the Sony WH-1000XM6 offers the best balance of all these factors at ৳35,000.",
    image: u('1618366712010-f4ae9c647dcb'),
    author: 'Audio Expert',
    tags: 'Audio,Headphones,Guide,Wireless',
    published_at: STORE,
  },
  {
    id: 'blog-004',
    title: 'MacBook Air M4 vs MacBook Pro M4: Which Should You Buy?',
    slug: 'macbook-air-m4-vs-pro-m4',
    excerpt:
      "Comparing Apple's latest laptops to help you decide which one is right for your needs and budget.",
    content:
      "Apple's M4 chip has brought incredible performance to both the MacBook Air and MacBook Pro. But which one should you choose?\n\n**MacBook Air M4**\n- Starting at ৳169,900\n- 15.3-inch Liquid Retina display\n- Fanless design, ultra-thin\n- Perfect for students and general productivity\n\n**MacBook Pro M4**\n- Starting at ৳249,900\n- 14.2-inch Liquid Retina XDR display\n- Active cooling for sustained performance\n- Ideal for professionals and creators\n\nVerdict: The Air is perfect for most users. Choose the Pro only if you need sustained performance for video editing, coding, or 3D work.",
    image: u('1517336714731-489689fd1ca8'),
    author: 'Tech Reviewer',
    tags: 'Apple,MacBook,Laptop,Comparison',
    published_at: STORE,
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
sql += insert(
  'blog_post',
  BLOG_COLS,
  BLOG_POSTS.map((b) => ({
    ...b,
    is_published: true,
    created_at: STORE,
    updated_at: STORE,
  }))
);

// ══════════════════════════════════
//  USERS
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
sql += insert(
  'user',
  USER_COLS,
  USERS.map((usr) => ({
    ...usr,
    email_verified: true,
    banned: false,
    created_at: STORE,
    updated_at: STORE,
  }))
);

// ══════════════════════════════════
//  SETTINGS
// ══════════════════════════════════
const SETTINGS: Record<string, string> = {
  store_name: 'Tuktak.com',
  store_tagline: 'Your Trusted Tech Store in Bangladesh',
  store_email: 'support@tuktak.com',
  store_phone: '+880-1700-000000',
  store_address: 'House 42, Road 11, Banani, Dhaka 1213',
  currency: 'BDT',
  currency_symbol: '৳',
  // Checkout config — the storefront reads these exact keys via
  // /api/checkout-config; without them the payment section is hidden and
  // "Complete order" stays disabled.
  paymentMethods: JSON.stringify([
    {
      id: 'cod',
      name: 'Cash on Delivery',
      nameBn: 'Cash on Delivery',
      enabled: true,
      icon: 'Banknote',
      description: 'Pay when you receive your order',
      descriptionBn: 'Order peye payment korun',
      requiresTransactionId: false,
    },
    {
      id: 'bkash',
      name: 'bKash',
      nameBn: 'bKash',
      enabled: true,
      icon: 'Smartphone',
      description: 'Pay via bKash mobile wallet',
      descriptionBn: 'bKash mobile wallet er maddhome payment korun',
      requiresTransactionId: true,
    },
    {
      id: 'nagad',
      name: 'Nagad',
      nameBn: 'Nagad',
      enabled: true,
      icon: 'Wallet',
      description: 'Pay via Nagad digital wallet',
      descriptionBn: 'Nagad digital wallet er maddhome payment korun',
      requiresTransactionId: true,
    },
    {
      id: 'sslcommerz',
      name: 'SSLCommerz',
      nameBn: 'SSLCommerz',
      enabled: false,
      icon: 'CreditCard',
      description: 'Pay via card, mobile banking, or internet banking',
      descriptionBn: 'Card, mobile banking ba internet banking er maddhome payment korun',
      requiresTransactionId: false,
    },
  ]),
  shippingMethods: JSON.stringify([
    {
      id: 'inside-dhaka',
      name: 'Inside Dhaka',
      nameBn: 'Dhakar bhitore',
      enabled: true,
      cost: 70,
      freeAbove: 5000,
      estimatedDays: '1-2 days',
      estimatedDaysBn: '1-2 din',
    },
    {
      id: 'outside-dhaka',
      name: 'Outside Dhaka',
      nameBn: 'Dhakar baire',
      enabled: true,
      cost: 120,
      freeAbove: 5000,
      estimatedDays: '3-5 days',
      estimatedDaysBn: '3-5 din',
    },
  ]),
  taxRate: '5',
  is_whatsapp_enabled: '1',
  whatsapp_mode: 'DIRECT_NUMBER',
  whatsapp_phone_number: '8801700000000',
  is_messenger_enabled: '0',
};
sql += insert(
  'setting',
  ['key', 'value', 'updated_at'],
  Object.entries(SETTINGS).map(([key, value]) => ({ key, value, updated_at: STORE }))
);

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
    is_default: true,
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
    is_default: false,
  },
  {
    id: 'addr-003',
    user_id: 'usr-003',
    label: 'Home',
    name: 'Jane Customer',
    phone: '+8801722222222',
    street: 'Flat 4B, Green Valley, Dhanmondi',
    city: 'Dhaka',
    district: 'Dhaka',
    postal_code: '1209',
    is_default: true,
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
sql += insert(
  'address',
  ADDR_COLS,
  ADDRESSES.map((a) => ({ ...a, created_at: NOW, updated_at: NOW }))
);

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
    coupon_code: null,
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
    coupon_code: null,
  },
  {
    id: 'ord-003',
    user_id: 'usr-003',
    order_number: 'TK-000003',
    status: 'pending',
    subtotal: 89999,
    discount: 8999,
    shipping_cost: 0,
    tax: 4050,
    total: 85050,
    payment_method: 'nagad',
    payment_status: 'paid',
    shipping_address_id: 'addr-003',
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
  'payment_transaction_id',
  'shipping_address_id',
  'notes',
  'coupon_code',
  'created_at',
  'updated_at',
];
sql += insert(
  'order',
  ORD_COLS,
  ORDERS.map((o) => ({
    ...o,
    payment_transaction_id: null,
    notes: null,
    created_at: NOW,
    updated_at: NOW,
  }))
);

// ═══ ORDER ITEMS ═══
const ORDER_ITEMS = [
  {
    id: 'oi-001',
    order_id: 'ord-001',
    product_id: 'prd-001',
    variant_id: 'var-001',
    name: 'iPhone 16 Pro Max 256GB - Natural Titanium',
    image: u('1695048133142-1a20484d2569'),
    price: 159900,
    cost: 111930,
    quantity: 1,
  },
  {
    id: 'oi-002',
    order_id: 'ord-001',
    product_id: 'prd-004',
    variant_id: 'var-008',
    name: 'Sony WH-1000XM6 - Black',
    image: u('1618366712010-f4ae9c647dcb'),
    price: 35000,
    cost: 24500,
    quantity: 1,
  },
  {
    id: 'oi-003',
    order_id: 'ord-002',
    product_id: 'prd-004',
    variant_id: 'var-009',
    name: 'Sony WH-1000XM6 - Silver',
    image: u('1546435770-a3e426bf472b'),
    price: 35000,
    cost: 24500,
    quantity: 1,
  },
  {
    id: 'oi-004',
    order_id: 'ord-003',
    product_id: 'prd-007',
    variant_id: null,
    name: 'OnePlus 13',
    image: u('1511707171634-5f897ff02aa9'),
    price: 89999,
    cost: 62999,
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
  'cost',
  'quantity',
  'created_at',
];
sql += insert(
  'order_item',
  OI_COLS,
  ORDER_ITEMS.map((oi) => ({ ...oi, created_at: NOW }))
);

// ═══ REVIEWS ═══
// NB: `review` has a unique (user_id, product_id) index — one per user per product.
const REVIEWS = [
  {
    id: 'rev-001',
    product_id: 'prd-001',
    user_id: 'usr-002',
    order_id: 'ord-001',
    rating: 5,
    title: 'Amazing phone!',
    body: 'The iPhone 16 Pro Max is incredibly fast. Camera is outstanding and battery lasts two days.',
    is_approved: true,
    is_verified_purchase: true,
  },
  {
    id: 'rev-002',
    product_id: 'prd-002',
    user_id: 'usr-002',
    order_id: null,
    rating: 4,
    title: 'Great, but heavy',
    body: 'Excellent screen and battery. Only downside is the weight in the hand.',
    is_approved: true,
    is_verified_purchase: false,
  },
  {
    id: 'rev-003',
    product_id: 'prd-004',
    user_id: 'usr-002',
    order_id: 'ord-001',
    rating: 5,
    title: 'Best noise cancellation',
    body: 'Incredible noise cancellation. Very comfortable for long sessions.',
    is_approved: true,
    is_verified_purchase: true,
  },
  {
    id: 'rev-004',
    product_id: 'prd-007',
    user_id: 'usr-003',
    order_id: 'ord-003',
    rating: 4,
    title: 'Flagship killer',
    body: 'Fast charging and a great display. Camera is a solid step up this year.',
    is_approved: true,
    is_verified_purchase: true,
  },
  {
    id: 'rev-005',
    product_id: 'prd-015',
    user_id: 'usr-003',
    order_id: null,
    rating: 5,
    title: 'Perfect for trips',
    body: 'Loud, waterproof and the battery genuinely lasts. Great value.',
    is_approved: true,
    is_verified_purchase: false,
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
sql += insert(
  'review',
  REV_COLS,
  REVIEWS.map((r) => ({ ...r, created_at: NOW, updated_at: NOW }))
);

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
    is_active: true,
  },
  {
    id: 'cpn-002',
    code: 'FREESHIP',
    type: 'fixed',
    value: 80,
    description: 'Free shipping',
    is_active: true,
  },
  {
    id: 'cpn-003',
    code: 'SAVE500',
    type: 'fixed',
    value: 500,
    min_order_amount: 10000,
    usage_limit: 50,
    description: 'Flat ৳500 off',
    is_active: true,
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
    is_active: false,
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
  'usage_count',
  'description',
  'is_active',
  'starts_at',
  'expires_at',
  'created_at',
  'updated_at',
];
sql += insert(
  'coupon',
  CPN_COLS,
  COUPONS.map((c) => ({
    ...c,
    min_order_amount: c.min_order_amount ?? 0,
    max_discount_amount: c.max_discount_amount ?? null,
    usage_limit: c.usage_limit ?? null,
    usage_count: 0,
    starts_at: NOW,
    expires_at: EXPIRES,
    created_at: NOW,
    updated_at: NOW,
  }))
);

// ═══ CONTACT MESSAGES ═══
const MESSAGES = [
  {
    id: 'msg-001',
    name: 'Rahim Khan',
    email: 'rahim@example.com',
    subject: 'Product Inquiry',
    message:
      'I am interested in the iPhone 16 Pro Max. Do you have the Desert Titanium color in stock? Please let me know.',
    is_read: false,
  },
  {
    id: 'msg-002',
    name: 'Fatima Begum',
    email: 'fatima@example.com',
    subject: 'Delivery Issue',
    message:
      "My order TK-000002 was supposed to arrive yesterday but it hasn't been delivered yet. Can you please check the status?",
    is_read: true,
  },
  {
    id: 'msg-003',
    name: 'Kamal Hossain',
    email: 'kamal@example.com',
    subject: 'Return Request',
    message:
      'I received a defective product. The left earbud is not working. Please initiate a return.',
    is_read: true,
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
sql += insert(
  'contact_message',
  MSG_COLS,
  MESSAGES.map((m) => ({ ...m, created_at: NOW, updated_at: NOW }))
);

// ═══ NEWSLETTER SUBSCRIBERS ═══
const SUBS = [
  { id: 'sub-001', email: 'rahim@example.com', is_active: true },
  { id: 'sub-002', email: 'fatima@example.com', is_active: true },
  { id: 'sub-003', email: 'kamal@example.com', is_active: true },
];
sql += insert(
  'newsletter_subscriber',
  ['id', 'email', 'is_active', 'created_at'],
  SUBS.map((s) => ({ ...s, created_at: NOW }))
);

sql = `-- Tuktak Database Seed (Comprehensive Demo Data)\n-- Generated: ${new Date().toISOString()}\n-- Includes: categories, brands, products (with photos), variants, hero slides,\n-- blog posts, settings, users, addresses, orders, reviews, coupons.\n\n${sql}\n`;

const outPath = path.join(__dirname, 'seed.sql');
fs.writeFileSync(outPath, sql, 'utf-8');
console.log(`✅ Seed SQL written to: ${outPath}`);
for (const [table, n] of counts) console.log(`   ${table.padEnd(24)} ${n}`);
console.log(`\n   Apply with: psql "$DATABASE_URL" -f drizzle/seed.sql`);
