/** API base URL from environment */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

/** App base URL */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/** Supported locales */
export const LOCALES = ['en', 'bn'] as const;
export type Locale = (typeof LOCALES)[number];

/** Default locale */
export const DEFAULT_LOCALE: Locale = 'en';

/** Cart limits */
export const MAX_CART_ITEMS = 50;
export const MAX_QUANTITY_PER_ITEM = 10;
