import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes with clsx */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format price in ৳ (Taka) */
export function formatPrice(amount: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `৳${formatted}`;
}

/** Truncate string with ellipsis */
export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.slice(0, length)}...` : str;
}

/** Sleep utility for async operations */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate a slug from a string */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Get initials from a name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Currency / shipping / tax constants — mirror apps/api/src/services/order-service.ts.
 * The backend ALWAYS recomputes the final order total from line items; these
 * frontend values are DISPLAY ESTIMATES only (cart / checkout preview). */
export const SHIPPING_COST = 80; // BDT
export const FREE_SHIPPING_THRESHOLD = 5000; // BDT
export const TAX_RATE = 0.05; // 5% VAT

/** Shipping method shape mirroring the admin `shippingMethods` checkout setting. */
export type ShippingMethodConfig = {
  id: string;
  name: string;
  nameBn?: string;
  enabled: boolean;
  cost: number;
  freeAbove: number;
  estimatedDays: string;
  estimatedDaysBn: string;
};

/** Minimal checkout config used for cart / checkout estimates. */
export type CheckoutConfig = {
  paymentMethods: {
    id: string;
    name: string;
    nameBn: string;
    enabled: boolean;
    description: string;
    requiresTransactionId: boolean;
  }[];
  shippingMethods: ShippingMethodConfig[];
  taxRate: string;
};

export interface CheckoutEstimates {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
}

/** Estimate order totals for display, mirroring OrderService totals (order-service.ts).
 * Accepts the admin checkout config so estimates track the configured shipping/tax. */
export function estimateTotals(
  subtotal: number,
  discount = 0,
  config?: Pick<CheckoutConfig, 'taxRate' | 'shippingMethods'>
): CheckoutEstimates {
  const afterDiscount = subtotal - discount;
  const parsedTaxRate = parseFloat(config?.taxRate ?? '') / 100;
  const taxRate = Number.isFinite(parsedTaxRate) && parsedTaxRate >= 0 ? parsedTaxRate : TAX_RATE;
  const firstShipping = config?.shippingMethods?.find((s) => s.enabled !== false);
  const shipping =
    subtotal >= (firstShipping?.freeAbove ?? FREE_SHIPPING_THRESHOLD)
      ? 0
      : (firstShipping?.cost ?? SHIPPING_COST);
  const tax = Math.round(afterDiscount * taxRate);
  return {
    subtotal,
    discount,
    tax,
    shipping,
    total: afterDiscount + tax + shipping,
  };
}
