import { API_URL } from '@/lib/constants';

/**
 * Admin-configurable menu settings.
 *
 * Fetched server-side from the public /api/menu-config endpoint (settings
 * key `menuConfig`, JSON string) with the `menu-config` ISR tag — on-demand
 * revalidation triggered by the API when an admin saves, so changes are
 * instant.
 */

export type MenuItem = {
  id: string;
  type: 'link' | 'category' | 'dropdown';
  label: string;
  labelBn?: string;
  /** URL for type='link' items */
  href?: string;
  /** Category ID for type='category' — resolved from DB at render time */
  categoryId?: string;
  /** Optional lucide icon name */
  icon?: string;
  openInNewTab?: boolean;
  /** Nested children (max 2 levels deep) */
  children?: MenuItem[];
};

export type SocialPlatform = {
  id: string;
  label: string;
  /** brand color for hover */
  color?: string;
};

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { id: 'facebook', label: 'Facebook', color: '#1877F2' },
  { id: 'youtube', label: 'YouTube', color: '#FF0000' },
  { id: 'tiktok', label: 'TikTok', color: '#010101' },
  { id: 'instagram', label: 'Instagram', color: '#E4405F' },
  { id: 'twitter', label: 'X (Twitter)', color: '#1DA1F2' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2' },
];

export type FooterSocialItem = {
  platform: string; // matches SOCIAL_PLATFORMS.id
  url: string;
};

export type FooterPaymentItem = {
  id: string;
  name: string;
  /** Admin-uploaded image URL (logo/icon) */
  image?: string;
  labelBn?: string;
};

export type MenuConfig = {
  mainMenu: MenuItem[];
  mobileMenu: MenuItem[];
  /** Footer columns — array of { title, titleBn, items } */
  footerMenu: FooterColumn[];
  /** Tagline shown under the footer logo. Empty = built-in default copy. */
  footerTagline?: string;
  footerTaglineBn?: string;
  /** Social links shown in footer */
  footerSocial: FooterSocialItem[];
  /** Payment method badges shown in footer bottom bar */
  footerPayments: FooterPaymentItem[];
};

export type FooterColumn = {
  id: string;
  title: string;
  titleBn?: string;
  items: MenuItem[];
};

export const DEFAULT_MENU_CONFIG: MenuConfig = {
  mainMenu: [
    { id: 'home', type: 'link', label: 'Home', href: '/' },
    { id: 'products', type: 'link', label: 'Products', href: '/products' },
    { id: 'deals', type: 'link', label: 'Deals', href: '/flash-deals' },
  ],
  mobileMenu: [
    { id: 'home', type: 'link', label: 'Home', href: '/' },
    { id: 'products', type: 'link', label: 'Products', href: '/products' },
    { id: 'deals', type: 'link', label: 'Deals', href: '/flash-deals' },
    { id: 'blog', type: 'link', label: 'Blog', href: '/blog' },
  ],
  footerMenu: [
    {
      id: 'col-shop',
      title: 'Shop',
      titleBn: 'দোকান',
      items: [
        { id: 'fl-all', type: 'link', label: 'All Products', href: '/products' },
        { id: 'fl-phones', type: 'link', label: 'Phones', href: '/products?category=phones' },
        { id: 'fl-laptops', type: 'link', label: 'Laptops', href: '/products?category=laptops' },
        { id: 'fl-audio', type: 'link', label: 'Audio', href: '/products?category=audio' },
      ],
    },
    {
      id: 'col-support',
      title: 'Support',
      titleBn: 'সাপোর্ট',
      items: [
        { id: 'fs-contact', type: 'link', label: 'Contact Us', href: '/contact' },
        { id: 'fs-shipping', type: 'link', label: 'Shipping Info', href: '/shipping' },
        { id: 'fs-returns', type: 'link', label: 'Returns & Refunds', href: '/refund' },
        { id: 'fs-faq', type: 'link', label: 'FAQ', href: '/contact' },
      ],
    },
    {
      id: 'col-company',
      title: 'Company',
      titleBn: 'কোম্পানি',
      items: [
        { id: 'fc-about', type: 'link', label: 'About Us', href: '/about' },
        { id: 'fc-privacy', type: 'link', label: 'Privacy Policy', href: '/privacy' },
        { id: 'fc-terms', type: 'link', label: 'Terms of Service', href: '/terms' },
      ],
    },
  ],
  footerTagline:
    'Stay in the loop — get the latest deals, new arrivals, and exclusive offers straight to your inbox.',
  footerTaglineBn:
    'সর্বশেষ ডিল, নতুন পণ্য এবং একচেটিয়া অফার সম্পর্কে জানুন — সরাসরি আপনার ইনবক্সে।',
  footerSocial: [
    { platform: 'facebook', url: 'https://facebook.com' },
    { platform: 'youtube', url: 'https://youtube.com' },
    { platform: 'tiktok', url: 'https://tiktok.com' },
    { platform: 'instagram', url: 'https://instagram.com' },
  ],
  footerPayments: [
    { id: 'pay-bkash', name: 'bKash' },
    { id: 'pay-nagad', name: 'Nagad' },
    { id: 'pay-ssl', name: 'SSLCommerz' },
    { id: 'pay-cod', name: 'COD' },
  ],
};

/** Merge saved config with defaults so new fields are always present. */
export function mergeMenuConfig(saved?: Partial<MenuConfig> | null): MenuConfig {
  if (!saved) return DEFAULT_MENU_CONFIG;
  return {
    mainMenu: Array.isArray(saved.mainMenu) ? saved.mainMenu : DEFAULT_MENU_CONFIG.mainMenu,
    mobileMenu: Array.isArray(saved.mobileMenu) ? saved.mobileMenu : DEFAULT_MENU_CONFIG.mobileMenu,
    footerMenu: Array.isArray(saved.footerMenu) ? saved.footerMenu : DEFAULT_MENU_CONFIG.footerMenu,
    footerTagline: saved.footerTagline ?? DEFAULT_MENU_CONFIG.footerTagline,
    footerTaglineBn: saved.footerTaglineBn ?? DEFAULT_MENU_CONFIG.footerTaglineBn,
    footerSocial: Array.isArray(saved.footerSocial)
      ? saved.footerSocial
      : DEFAULT_MENU_CONFIG.footerSocial,
    footerPayments: Array.isArray(saved.footerPayments)
      ? saved.footerPayments
      : DEFAULT_MENU_CONFIG.footerPayments,
  };
}

/** Server-side fetch with ISR tag. Used in Server Components / layout. */
export async function getMenuConfig(): Promise<MenuConfig> {
  try {
    const res = await fetch(`${API_URL}/api/menu-config`, {
      next: { tags: ['menu-config'], revalidate: 0 },
    });
    if (!res.ok) return DEFAULT_MENU_CONFIG;
    const body = (await res.json()) as { success?: boolean; data?: unknown };
    if (!body.success || !body.data) return DEFAULT_MENU_CONFIG;
    return mergeMenuConfig(body.data as Partial<MenuConfig>);
  } catch {
    return DEFAULT_MENU_CONFIG;
  }
}

/** Generate a unique ID for new menu items. */
export function createMenuItemId(): string {
  return `mi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
