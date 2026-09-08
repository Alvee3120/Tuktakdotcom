/**
 * Single source of truth for order statuses used across schema, validators
 * and routes. Keep in sync with the ORDER_STATUS_TRANSITIONS map in admin.ts.
 */
export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
