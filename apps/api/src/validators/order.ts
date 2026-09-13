import { z } from 'zod';

import { ORDER_STATUSES } from '@/lib/order-status';

/** Address creation payload */
export const createAddressSchema = z.object({
  label: z.string().min(1).max(50).default('Home'),
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(15),
  street: z.string().min(5).max(300),
  city: z.string().min(2).max(100),
  district: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  isDefault: z.boolean().default(false),
});

/** Address update payload */
export const updateAddressSchema = createAddressSchema.partial();

/** Create order payload */
export const createOrderSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          variantId: z.string().optional(),
          quantity: z.number().int().min(1).max(10),
        })
      )
      .min(1)
      .max(20),
    /** Either attach a saved address… */
    shippingAddressId: z.string().min(1).optional(),
    /** …or supply the delivery details inline (checkout does this) */
    name: z.string().min(2).max(100).optional(),
    phone: z.string().min(10).max(15).optional(),
    email: z.string().email().max(100).optional(),
    shipping: z
      .object({
        street: z.string().min(5).max(300),
        city: z.string().min(2).max(100),
        district: z.string().max(100).optional(),
        postalCode: z.string().max(20).optional(),
      })
      .optional(),
    shippingMethodId: z
      .string()
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
    paymentMethod: z.enum(['bkash', 'nagad', 'sslcommerz', 'cod']),
    paymentTransactionId: z
      .string()
      .optional()
      .transform((v) => (v && v.trim().length >= 4 ? v.trim() : undefined)),
    couponCode: z
      .string()
      .max(50)
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim().toUpperCase() : undefined)),
    notes: z.string().max(500).optional(),
  })
  .refine((v) => !!v.shippingAddressId === !(v.name && v.phone && v.shipping), {
    message: 'Provide either shippingAddressId or name, phone and shipping',
  });

/** Guest (anonymous) order payload — no account required */
export const createGuestOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional(),
        quantity: z.number().int().min(1).max(10),
      })
    )
    .min(1)
    .max(20),
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(15),
  email: z.string().email().max(100).optional(),
  shipping: z.object({
    street: z.string().min(5).max(300),
    city: z.string().min(2).max(100),
    district: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
  }),
  shippingMethodId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  paymentMethod: z.enum(['bkash', 'nagad', 'sslcommerz', 'cod']),
  paymentTransactionId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length >= 4 ? v.trim() : undefined)),
  couponCode: z
    .string()
    .max(50)
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim().toUpperCase() : undefined)),
  notes: z.string().max(500).optional(),
});

/** Order cancellation reason */
export const cancelOrderSchema = z.object({
  reason: z.string().min(5).max(500).optional(),
});

/** Coupon validation query */
export const validateCouponSchema = z.object({
  code: z.string().min(1).max(50),
  orderAmount: z.coerce.number().int().min(0),
});

/** Order list query (user's own orders) */
export const orderListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(ORDER_STATUSES).optional(),
});
