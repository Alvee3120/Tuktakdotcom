import { z } from 'zod';

// Shared checkout validators — single source of truth for web (RHF) and api (Hono)

export const addressSchema = z.object({
  street: z.string().min(5).max(300),
  city: z.string().min(2).max(100),
  district: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
});

export const guestInfoSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(15),
  email: z.string().email().max(100).optional().or(z.literal('')),
});

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1).max(10),
});

export const createGuestOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(20),
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(15),
  email: z.string().email().max(100).optional(),
  shipping: addressSchema,
  shippingMethodId: z.string().min(1).optional(),
  paymentMethod: z.enum(['bkash', 'nagad', 'sslcommerz', 'cod']),
  paymentTransactionId: z.string().min(4).max(100).optional(),
  couponCode: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
});

export const createOrderSchema = z.object({
  shippingAddressId: z.string().min(1),
  shippingMethodId: z.string().min(1).optional(),
  paymentMethod: z.enum(['bkash', 'nagad', 'sslcommerz', 'cod']),
  paymentTransactionId: z.string().min(4).max(100).optional(),
  couponCode: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(orderItemSchema).min(1).max(20),
});

export const validateCouponSchema = z.object({
  code: z.string().min(1).max(50),
  orderAmount: z.coerce.number().int().min(0),
});

export type CreateGuestOrderInput = z.infer<typeof createGuestOrderSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
