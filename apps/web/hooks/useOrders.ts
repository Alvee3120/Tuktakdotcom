import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { useCartStore } from '@/stores/useCartStore';

/** Address type matching API schema */
export type Address = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  district: string | null;
  postalCode: string | null;
  isDefault: boolean;
  label: string;
  createdAt: string;
  updatedAt: string;
};

/** Order type matching API response */
export type Order = {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  subtotal: number;
  discount: number;
  shippingCost: number;
  tax: number;
  total: number;
  paymentMethod: string | null;
  paymentStatus: string;
  notes: string | null;
  couponCode: string | null;
  invoiceAccessToken?: string | null;
  voucherNumber?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
};

/** Order item matching API schema */
export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  name: string;
  price: number;
  quantity: number;
  image: string;
  slug?: string | null;
};

/** Hook: Fetch user's addresses */
export function useAddresses(enabled = true) {
  return useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get<{ success: boolean; data: Address[] }>('/api/addresses'),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

/** Hook: Create a new address */
export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      phone: string;
      street: string;
      city: string;
      district?: string;
      postalCode?: string;
      label?: string;
      isDefault?: boolean;
    }) => api.post('/api/addresses', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}

/** Hook: Update an address */
export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        name: string;
        phone: string;
        street: string;
        city: string;
        district?: string;
        postalCode?: string;
        label?: string;
        isDefault?: boolean;
      }>;
    }) => api.patch(`/api/addresses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}

/** Hook: Delete an address */
export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (addressId: string) => api.delete(`/api/addresses/${addressId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}

/** Create order payload matching API schema */
export type CreateOrderPayload = {
  shippingAddressId: string;
  shippingMethodId?: string;
  paymentMethod: 'bkash' | 'nagad' | 'sslcommerz' | 'cod';
  paymentTransactionId?: string;
  couponCode?: string;
  notes?: string;
  items: { productId: string; variantId?: string; quantity: number }[];
};

/** Response returned by POST /api/orders (create order) */
export type CreateOrderResult = {
  orderId: string;
  orderNumber: string;
  total: number;
  invoiceAccessToken: string;
};

/** Guest order payload matching API schema */
export type CreateGuestOrderPayload = {
  name: string;
  phone: string;
  email?: string;
  shipping: { street: string; city: string; district?: string; postalCode?: string };
  shippingMethodId?: string;
  paymentMethod: 'bkash' | 'nagad' | 'sslcommerz' | 'cod';
  paymentTransactionId?: string;
  couponCode?: string;
  notes?: string;
  items: { productId: string; variantId?: string; quantity: number }[];
};

/** Hook: Place an order */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  const clearCart = useCartStore((state) => state.clearCart);
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) =>
      api.post<{ success: boolean; data: CreateOrderResult }>('/api/orders', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      clearCart(); // Clear cart after successful order placement
    },
  });
}

/** Hook: Place a guest (anonymous, no login) order */
export function useCreateGuestOrder() {
  const clearCart = useCartStore((state) => state.clearCart);
  return useMutation({
    mutationFn: (payload: CreateGuestOrderPayload) =>
      api.post<{ success: boolean; data: CreateOrderResult }>('/api/orders/guest', payload),
    onSuccess: () => {
      clearCart();
    },
  });
}

/** Hook: Fetch user's orders */
export function useOrders(params: { page?: number; limit?: number; status?: string } = {}) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () =>
      api.get<{
        success: boolean;
        data: Order[];
        meta: { total: number; page: number; totalPages: number };
      }>('/api/orders', {
        params: { page: params.page, limit: params.limit, status: params.status },
      }),
    staleTime: 30 * 1000,
  });
}

/** Hook: Fetch single order by ID */
export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.get<{ success: boolean; data: Order }>(`/api/orders/${orderId}`),
    enabled: !!orderId,
    staleTime: 60 * 1000,
  });
}

/** Hook: Cancel an order (only pending/confirmed orders) */
export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      api.post<{ success: boolean; data: { message: string } }>(
        `/api/orders/${orderId}/cancel`,
        reason ? { reason } : {}
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
    },
  });
}

/** Hook: Validate coupon */
export function useValidateCoupon() {
  return useMutation({
    mutationFn: (payload: { code: string; subtotal: number }) =>
      api.post<{ success: boolean; data: { discount: number; couponCode: string } }>(
        '/api/orders/validate-coupon',
        { code: payload.code, orderAmount: payload.subtotal }
      ),
  });
}

/** Customer details shown on an invoice. */
export type InvoiceCustomer = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

/** Shipping snapshot shown on an invoice. */
export type InvoiceShipping = {
  street?: string;
  city?: string;
  district?: string;
  postalCode?: string;
} | null;

/** Invoice data returned by GET /api/invoices/:orderNumber */
export type Invoice = {
  invoiceNumber: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    subtotal: number;
    discount: number;
    shippingCost: number;
    tax: number;
    total: number;
    paymentMethod: string | null;
    paymentStatus: string;
    paymentTransactionId: string | null;
    voucherNumber: string | null;
    createdAt: string;
  };
  customer: InvoiceCustomer;
  shipping: InvoiceShipping;
  items: { name: string; quantity: number; price: number; image: string }[];
};

/** Hook: Fetch an invoice by order number (public, no auth). */
export function useInvoice(orderNumber: string, token?: string) {
  return useQuery({
    queryKey: ['invoice', orderNumber, token],
    queryFn: () =>
      api.get<{ success: boolean; data: Invoice }>(
        `/api/invoices/${encodeURIComponent(orderNumber)}`,
        token ? { params: { token } } : undefined
      ),
    enabled: !!orderNumber,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
