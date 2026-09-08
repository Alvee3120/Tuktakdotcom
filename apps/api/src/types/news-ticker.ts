/**
 * News Ticker configuration (Top Bar News Ticker).
 *
 * Stored as a JSON string under the `settings` table key `newsTicker`,
 * mirroring the existing `homeConfig` / `tracking` config pattern.
 */
export type NewsTickerConfig = {
  /** Master enable/disable for the top-bar ticker. */
  enabled: boolean;
  /** English copy shown when the active locale is `en`. */
  text: string;
  /** Bengali copy shown when the active locale is `bn` (falls back to `text`). */
  textBn: string | null;
  /** Optional link the ticker text (or link label) points to. Empty = no link. */
  link: string | null;
  /** Optional label for the link. Falls back to the message text. */
  linkLabel: string | null;
  /** Storefront phone number (announcement bar; ASCII digits for the tel: URI). */
  phone: string;
  /** Scrolling announcement phrases shown in the marquee (English). Empty = built-in defaults. */
  announcements: string[];
  /** Scrolling announcement phrases shown in the marquee (Bengali). Empty = built-in defaults. */
  announcementsBn: string[];
};

export const DEFAULT_NEWS_TICKER: NewsTickerConfig = {
  enabled: false,
  text: 'Free shipping on orders over ৳5,000 | Same-day delivery in Dhaka | Cash on delivery available',
  textBn: '৳5,000-এর ওপর ফ্রি শিপিং | ঢাকায় একদিনের ডেলিভারি | ক্যাশ অন ডেলিভারি উপলব্ধ',
  link: '/products',
  linkLabel: 'Shop Now',
  phone: '01400881103',
  announcements: [
    'Welcome to Tuktak',
    'Home delivery all over Bangladesh (3-5 days)',
    'Cash on Delivery',
    '5% off on advance bKash payment',
  ],
  announcementsBn: [
    'টুকটাকে স্বাগতম',
    'সারা বাংলাদেশে হোম ডেলিভারি (৩-৫ দিন)',
    'ক্যাশ অন ডেলিভারি',
    'অগ্রিম বিকাশে ৫% ছাড়',
  ],
};
