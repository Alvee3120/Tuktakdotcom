import { API_URL } from '@/lib/constants';

/**
 * News Ticker configuration (Top Bar News Ticker), mirrored from the API layer.
 * The storefront fetches this server-side (ISR, tagged `news-ticker`) so an
 * admin save + on-demand revalidation reflects immediately on the frontend.
 */
export type NewsTickerConfig = {
  enabled: boolean;
  text: string;
  textBn: string | null;
  link: string | null;
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

/**
 * Server-side fetch of the active news ticker. Falls back to
 * `DEFAULT_NEWS_TICKER` (disabled) if the API is unreachable.
 */
export async function getNewsTicker(): Promise<NewsTickerConfig> {
  try {
    const res = await fetch(`${API_URL}/api/news-ticker`, {
      next: { tags: ['news-ticker'], revalidate: 120 },
    });
    if (!res.ok) return DEFAULT_NEWS_TICKER;
    const body = (await res.json()) as { success?: boolean; data?: Partial<NewsTickerConfig> };
    if (!body.success) return DEFAULT_NEWS_TICKER;
    return { ...DEFAULT_NEWS_TICKER, ...(body.data ?? {}) };
  } catch {
    return DEFAULT_NEWS_TICKER;
  }
}
