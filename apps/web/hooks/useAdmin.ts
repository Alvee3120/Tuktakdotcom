import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

/** Shared pagination shape returned by paginated admin endpoints */
export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/** Dashboard stats */
export type DashboardStats = {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  recentOrders: Pick<AdminOrder, 'id' | 'orderNumber' | 'status' | 'total' | 'createdAt'>[];
  lowStockProducts: AdminProduct[];
  outOfStockCount: number;
  statusCounts: Record<string, number>;
  weeklySeries: { day: string; revenue: number; orders: number }[];
  recentTransactions: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    paymentMethod: string | null;
    paymentStatus: string;
    createdAt: string;
    customerName: string | null;
  }[];
  bestSellers: {
    productId: string;
    name: string;
    image: string;
    price: number;
    stock: number;
    sold: number;
    revenue: number;
  }[];
  newsletterCount: number;
  newCustomersThisWeek: number;
};

/** Admin product type */
export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  image: string;
  createdAt: string;
};

/** Product variant (size/color/storage option with its own pricing) */
export type AdminVariant = {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  cost: number | null;
  stock: number;
  image: string | null;
  isActive: boolean;
  attributes: string | null;
};

/** Variant payload sent to the sync endpoint (id omitted for new rows) */
export type VariantInput = {
  id?: string;
  name: string;
  sku?: string | null;
  price: number;
  compareAtPrice?: number | null;
  cost?: number | null;
  stock: number;
  image?: string | null;
  isActive: boolean;
};

/** Full product detail for the admin edit page */
export type AdminProductDetail = AdminProduct & {
  description: string | null;
  shortDescription: string | null;
  compareAtPrice: number | null;
  cost: number | null;
  categoryId: string | null;
  brandId: string | null;
  images: string[];
  variants: AdminVariant[];
  inventoryAllocations?: { inventoryId: string; quantity: number }[];
};

/** Order line item (product snapshot) */
export type AdminOrderItem = {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

/** Admin order type */
export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  discount: number;
  shippingCost: number;
  tax: number;
  total: number;
  paymentMethod: 'bkash' | 'nagad' | 'sslcommerz' | 'cod' | null;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentTransactionId: string | null;
  couponCode: string | null;
  notes: string | null;
  riskScore: number | null;
  riskFlags: string | null;
  createdAt: string;
  userId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerImage: string | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  items: AdminOrderItem[];
};

/** Full order detail (offcanvas panel) */
export type AdminOrderDetail = AdminOrder & {
  updatedAt: string;
  invoiceAccessToken: string | null;
  voucherNumber: string | null;
  voucherQrKey: string | null;
  customerId: string | null;
  customerPhone: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  shippingSnapshot?: string | null;
  shippingAddress: {
    label: string;
    name: string;
    phone: string;
    street: string;
    city: string;
    district: string | null;
    postalCode: string | null;
  } | null;
};

/** Transaction row (payment view over orders) */
export type AdminTransaction = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  paymentMethod: 'bkash' | 'nagad' | 'sslcommerz' | 'cod' | null;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentTransactionId: string | null;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  customerImage: string | null;
  items: AdminOrderItem[];
};

/** Admin brand type */
export type AdminBrand = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Brand alias used by paginated brand hooks */
export type AdminBrandItem = AdminBrand;

/** Admin coupon type */
export type AdminCoupon = {
  id: string;
  code: string;
  description: string | null;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

/** Admin category type */
export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
};

/** Admin user type */
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
  banned: boolean;
  createdAt: string;
};

// ── Dashboard ──
export function useDashboardStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get<{ success: boolean; data: DashboardStats }>('/api/admin/dashboard'),
    staleTime: 60 * 1000,
  });
}

// ── Products ──
export function useAdminProducts(
  params: { page?: number; search?: string; category?: string } = {}
) {
  return useQuery({
    queryKey: ['admin', 'products', params],
    queryFn: () =>
      api.get<{
        success: boolean;
        data: AdminProduct[];
        meta: { total: number; page: number; totalPages: number };
      }>('/api/admin/products', {
        params: { page: params.page, search: params.search, category: params.category },
      }),
    staleTime: 30 * 1000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/api/admin/products', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/api/admin/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

/** Single product with images + variants (admin edit page) */
export function useAdminProduct(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () =>
      api.get<{ success: boolean; data: AdminProductDetail }>(`/api/admin/products/${id}`),
    enabled: !!id,
  });
}

/** Replace a product's variant list (upsert incoming, delete missing) */
export function useSyncVariants() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, variants }: { productId: string; variants: VariantInput[] }) =>
      api.put<{ success: boolean; data: AdminVariant[] }>(
        `/api/admin/products/${productId}/variants`,
        { variants }
      ),
    onSuccess: (_data, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

/** Upload an image file to R2 via the admin upload endpoint. Returns its public path. */
export async function uploadImage(file: File, folder?: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  if (folder) formData.append('folder', folder);
  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Upload failed');
  }
  const json = (await res.json()) as { success: boolean; data: { url: string } };
  return json.data.url;
}

// ── Orders ──
export function useAdminOrders(params: { page?: number; status?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ['admin', 'orders', params],
    queryFn: () =>
      api.get<{
        success: boolean;
        data: AdminOrder[];
        meta: {
          total: number;
          page: number;
          totalPages: number;
          statusCounts: Record<string, number>;
        };
      }>('/api/admin/orders', {
        params: { page: params.page, status: params.status, search: params.search || undefined },
      }),
    staleTime: 30 * 1000,
  });
}

export function useAdminOrder(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: () => api.get<{ success: boolean; data: AdminOrderDetail }>(`/api/admin/orders/${id}`),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/admin/orders/${id}/status`, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
    },
  });
}

// ── Transactions ──
export type TransactionsMeta = {
  total: number;
  page: number;
  totalPages: number;
  paymentStatusCounts: Record<string, number>;
  methodBreakdown: { method: string; count: number; total: number }[];
  paidRevenue: number;
};

export function useAdminTransactions(
  params: { page?: number; paymentStatus?: string; method?: string; search?: string } = {}
) {
  return useQuery({
    queryKey: ['admin', 'transactions', params],
    queryFn: () =>
      api.get<{ success: boolean; data: AdminTransaction[]; meta: TransactionsMeta }>(
        '/api/admin/transactions',
        {
          params: {
            page: params.page,
            paymentStatus: params.paymentStatus,
            method: params.method,
            search: params.search || undefined,
          },
        }
      ),
    staleTime: 30 * 1000,
  });
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paymentStatus }: { id: string; paymentStatus: string }) =>
      api.patch(`/api/admin/transactions/${id}/payment-status`, { paymentStatus }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', variables.id] });
    },
  });
}

// ── Brands ──
export function useAdminBrands() {
  return useQuery({
    queryKey: ['admin', 'brands'],
    queryFn: () =>
      api.get<{ success: boolean; data: AdminBrand[] }>('/api/admin/brands?limit=100&page=1'),
    staleTime: 30 * 1000,
  });
}

// ── Categories ──
export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => api.get<{ success: boolean; data: AdminCategory[] }>('/api/admin/categories'),
    staleTime: 30 * 1000,
  });
}

// ── Users ──
export function useAdminUsers(params: { page?: number; search?: string } = {}) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () =>
      api.get<{
        success: boolean;
        data: AdminUser[];
        meta: { total: number; page: number; totalPages: number };
      }>('/api/admin/users', { params: { page: params.page, search: params.search || undefined } }),
    staleTime: 30 * 1000,
  });
}

export function useToggleUserBan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/api/admin/users/${id}/ban`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

// ── Customer Orders ──
export type CustomerOrderItem = {
  orderId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string | null;
};

export type CustomerOrder = {
  id: string;
  orderNumber: string | null;
  status: string;
  total: number;
  paymentMethod: string | null;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  items: CustomerOrderItem[];
};

export function useCustomerOrders(userId: string | null, page = 1) {
  return useQuery({
    queryKey: ['admin', 'customerOrders', userId, page],
    queryFn: () =>
      api.get<{
        success: boolean;
        data: CustomerOrder[];
        meta: { total: number; page: number; totalPages: number; limit: number };
      }>(`/api/admin/users/${userId}/orders`, { params: { page, limit: 10 } }),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

// ── Moderators ──
export type ModeratorPage = {
  key: string;
  label: string;
  section: string;
};

export type Moderator = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  permissions: string | null;
  banned: boolean;
  createdAt: string;
};

export function useModerators(params: { page?: number; search?: string } = {}) {
  return useQuery({
    queryKey: ['admin', 'moderators', params],
    queryFn: () =>
      api.get<{
        success: boolean;
        data: Moderator[];
        meta: { total: number; page: number; totalPages: number };
      }>('/api/admin/moderators', {
        params: { page: params.page, search: params.search || undefined },
      }),
    staleTime: 30 * 1000,
  });
}

export function useModeratorPages() {
  return useQuery({
    queryKey: ['admin', 'moderator-pages'],
    queryFn: () =>
      api.get<{ success: boolean; data: ModeratorPage[] }>('/api/admin/moderators/pages'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateModerator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string; permissions: string[] }) =>
      api.post('/api/admin/moderators', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderators'] });
    },
  });
}

export function useUpdateModerator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; permissions?: string[]; banned?: boolean };
    }) => api.patch(`/api/admin/moderators/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderators'] });
    },
  });
}

export function useDeleteModerator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/moderators/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderators'] });
    },
  });
}

// ── Newsletter ──
export type NewsletterSubscriber = {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
};

export function useNewsletterSubscribers() {
  return useQuery({
    queryKey: ['admin', 'newsletter-subscribers'],
    queryFn: () =>
      api.get<{ success: boolean; data: NewsletterSubscriber[] }>(
        '/api/admin/newsletter-subscribers'
      ),
    staleTime: 60 * 1000,
  });
}

// ── Inventories ──// ── Inventories ──
export type AdminInventory = {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  skuCount: number;
  totalUnits: number;
};

export type InventoryReportRow = {
  product_id: string;
  name: string;
  sku: string | null;
  unit_cost: number | null;
  qty_sold: number;
  revenue: number;
  cost_total: number;
  profit: number;
  avg_sale_price: number;
  current_stock: number;
};

export type InventoryReport = {
  summary: {
    units_sold: number;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    stock_units: number;
    stock_value: number;
  };
  rows: InventoryReportRow[];
  range: { from: string | null; to: string | null };
  inventoryId: string;
};

export function useInventories() {
  return useQuery({
    queryKey: ['admin', 'inventories'],
    queryFn: () => api.get<{ success: boolean; data: AdminInventory[] }>('/api/admin/inventories'),
    staleTime: 60 * 1000,
  });
}

export function useCreateInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      location?: string | null;
      description?: string | null;
    }) => api.post('/api/admin/inventories', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventories'] });
    },
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/api/admin/inventories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventories'] });
    },
  });
}

/** Report for one inventory (or 'all') over an optional from/to date range */ /** Report for one inventory (or 'all') over an optional from/to date range */
export function useInventoryReport(id: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ['admin', 'inventory-report', id, from, to],
    queryFn: () =>
      api.get<{ success: boolean; data: InventoryReport }>(`/api/admin/inventories/${id}/report`, {
        params: { from, to },
      }),
    staleTime: 60 * 1000,
  });
}

// ── Fraud Protection ──
export type BlocklistEntry = {
  id: string;
  type: 'phone' | 'ip';
  value: string;
  reason: string | null;
  createdAt: string;
};

export type CourierReport = {
  phone: string;
  total: number;
  success: number;
  cancelled: number;
  successRatio: number;
  byCourier: { name: string; total: number; success: number; cancelled: number }[];
  checkedAt: string;
  cached: boolean;
  raw?: unknown;
  error?: string;
};

export type RiskyOrder = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  paymentMethod: string | null;
  riskScore: number | null;
  riskFlags: string | null;
  createdAt: string;
  userId?: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerImage: string | null;
  customerPhone?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  items: AdminOrderItem[];
};

export function useBlocklist() {
  return useQuery({
    queryKey: ['admin', 'blocklist'],
    queryFn: () =>
      api.get<{ success: boolean; data: BlocklistEntry[] }>('/api/admin/fraud/blocklist'),
    staleTime: 30 * 1000,
  });
}

export function useAddBlocklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { type: 'phone' | 'ip'; value: string; reason?: string | null }) =>
      api.post('/api/admin/fraud/blocklist', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blocklist'] });
    },
  });
}

export function useRemoveBlocklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/fraud/blocklist/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blocklist'] });
    },
  });
}

/** On-demand courier delivery-history lookup (server caches 24h per phone) */
export function useCourierCheck() {
  return useMutation({
    mutationFn: (phone: string) =>
      api.get<{ success: boolean; data: CourierReport }>('/api/admin/fraud/courier-check', {
        params: { phone },
      }),
  });
}

export function useRiskyOrders(page = 1) {
  return useQuery({
    queryKey: ['admin', 'risky-orders', page],
    queryFn: () =>
      api.get<{
        success: boolean;
        data: RiskyOrder[];
        meta: { total: number; totalPages: number };
      }>('/api/admin/fraud/overview', { params: { page } }),
    staleTime: 30 * 1000,
  });
}

// ── Accounting ──
export type Expense = {
  id: string;
  category: string;
  amount: number;
  note: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  totalPurchased: number;
  totalPaid: number;
  due: number;
};

export type Purchase = {
  id: string;
  supplierId: string;
  description: string | null;
  totalAmount: number;
  paidAmount: number;
  date: string;
  createdAt: string;
  updatedAt: string;
};

export type PnlReport = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  shippingIncome: number;
  discountsGiven: number;
  expensesByCategory: { category: string; total: number }[];
  totalExpenses: number;
  netProfit: number;
  orderCount: number;
  unitsSold: number;
  range: { from: string | null; to: string | null };
};

export function useExpenses(params: { from?: string; to?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ['admin', 'expenses', params],
    queryFn: () =>
      api.get<{
        success: boolean;
        data: Expense[];
        meta: { total: number; totalPages: number; totalAmount: number };
      }>('/api/admin/accounting/expenses', {
        params: { from: params.from, to: params.to, page: params.page },
      }),
    staleTime: 30 * 1000,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      category: string;
      amount: number;
      note?: string | null;
      date: string;
    }) => api.post('/api/admin/accounting/expenses', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pnl'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/api/admin/accounting/expenses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pnl'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/accounting/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pnl'] });
    },
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['admin', 'suppliers'],
    queryFn: () =>
      api.get<{ success: boolean; data: Supplier[] }>('/api/admin/accounting/suppliers'),
    staleTime: 30 * 1000,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      phone?: string | null;
      address?: string | null;
      note?: string | null;
    }) => api.post('/api/admin/accounting/suppliers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'] });
    },
  });
}

export function usePurchases(supplierId: string | null) {
  return useQuery({
    queryKey: ['admin', 'purchases', supplierId],
    queryFn: () =>
      api.get<{ success: boolean; data: Purchase[] }>(
        `/api/admin/accounting/suppliers/${supplierId}/purchases`
      ),
    enabled: !!supplierId,
    staleTime: 30 * 1000,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      supplierId: string;
      description?: string | null;
      totalAmount: number;
      paidAmount?: number;
      date: string;
    }) => api.post('/api/admin/accounting/purchases', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'purchases'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'] });
    },
  });
}

export function useUpdatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        totalAmount?: number;
        paidAmount?: number;
        description?: string | null;
        date?: string;
      };
    }) => api.put(`/api/admin/accounting/purchases/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'purchases'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'] });
    },
  });
}

export function usePnl(from?: string, to?: string) {
  return useQuery({
    queryKey: ['admin', 'pnl', from, to],
    queryFn: () =>
      api.get<{ success: boolean; data: PnlReport }>('/api/admin/accounting/pnl', {
        params: { from, to },
      }),
    staleTime: 60 * 1000,
  });
}

// ═══════════════════════════════════════════════════════════════
// VARIANT TYPES — structured variant groups per product
// ═══════════════════════════════════════════════════════════════

export type VariantTypePreset = 'color' | 'size' | 'storage' | 'material' | 'custom';

export type VariantTypeItem = {
  id: string;
  productId: string;
  name: string;
  type: VariantTypePreset;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  options: VariantOptionItem[];
};

export type VariantOptionItem = {
  id: string;
  variantTypeId: string;
  name: string;
  value: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** Get variant types + options for a product */
export function useVariantTypes(productId: string | null) {
  return useQuery({
    queryKey: ['admin', 'variant-types', productId],
    queryFn: () =>
      api.get<{ success: boolean; data: VariantTypeItem[] }>(
        `/api/admin/products/${productId}/variant-types`
      ),
    enabled: !!productId,
  });
}

/** Create a variant type for a product */
export function useCreateVariantType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: { name: string; type: VariantTypePreset; sortOrder?: number };
    }) => api.post(`/api/admin/products/${productId}/variant-types`, data),
    onSuccess: (_data, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'variant-types', productId] });
    },
  });
}

/** Update a variant type */
export function useUpdateVariantType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; type: VariantTypePreset; sortOrder?: number };
      productId: string;
    }) => api.put(`/api/admin/variant-types/${id}`, data),
    onSuccess: (_data, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'variant-types', productId] });
    },
  });
}

/** Delete a variant type */
export function useDeleteVariantType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; productId: string }) =>
      api.delete(`/api/admin/variant-types/${id}`),
    onSuccess: (_data, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'variant-types', productId] });
    },
  });
}

/** Add an option to a variant type */
export function useAddVariantOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      variantTypeId,
      data,
    }: {
      variantTypeId: string;
      data: { name: string; value?: string | null; sortOrder?: number };
      productId: string;
    }) => api.post(`/api/admin/variant-types/${variantTypeId}/options`, data),
    onSuccess: (_data, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'variant-types', productId] });
    },
  });
}

/** Update a variant option */
export function useUpdateVariantOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; value?: string | null; sortOrder?: number };
      productId: string;
    }) => api.put(`/api/admin/variant-options/${id}`, data),
    onSuccess: (_data, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'variant-types', productId] });
    },
  });
}

/** Delete a variant option */
export function useDeleteVariantOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; productId: string }) =>
      api.delete(`/api/admin/variant-options/${id}`),
    onSuccess: (_data, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'variant-types', productId] });
    },
  });
}

/** Generate variant combinations from types/options (creates product_variant rows) */
export function useGenerateCombinations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: {
        defaultPrice: number;
        defaultCompareAtPrice?: number | null;
        defaultCost?: number | null;
        defaultStock: number;
        defaultSku?: string | null;
      };
    }) =>
      api.post<{ success: boolean; data: AdminVariant[] }>(
        `/api/admin/products/${productId}/variant-types/generate`,
        data
      ),
    onSuccess: (_data, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'variant-types', productId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

// ── Blog Posts ──

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  image: string | null;
  author: string;
  tags: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
};

export function useAdminBlogPosts() {
  return useQuery<{ success: boolean; data: BlogPost[] }>({
    queryKey: ['admin', 'blog-posts'],
    queryFn: () => api.get('/api/admin/blog-posts'),
    staleTime: 60_000,
  });
}

export function useCreateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BlogPost>) =>
      api.post<{ success: boolean; data: BlogPost }>('/api/admin/blog-posts', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'blog-posts'] }),
  });
}

export function useUpdateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BlogPost> }) =>
      api.put<{ success: boolean; data: BlogPost }>(`/api/admin/blog-posts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'blog-posts'] }),
  });
}

export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/blog-posts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'blog-posts'] }),
  });
}

// ── Contact Messages ──

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  repliedAt: string | null;
  createdAt: string;
};

export function useAdminContactMessages(page = 1, limit = 20) {
  return useQuery<{ success: boolean; data: ContactMessage[]; pagination: Pagination }>({
    queryKey: ['admin', 'contact-messages', page, limit],
    queryFn: () => api.get(`/api/admin/contact-messages?page=${page}&limit=${limit}`),
    staleTime: 30_000,
  });
}

export function useMarkMessageRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/api/admin/contact-messages/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'contact-messages'] }),
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/contact-messages/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'contact-messages'] }),
  });
}

// ── Coupons ──

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export function useAdminCoupons(page = 1, limit = 20) {
  return useQuery<{ success: boolean; data: Coupon[]; pagination: Pagination }>({
    queryKey: ['admin', 'coupons', page, limit],
    queryFn: () => api.get(`/api/admin/coupons?page=${page}&limit=${limit}`),
    staleTime: 60_000,
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Coupon>) =>
      api.post<{ success: boolean; data: Coupon }>('/api/admin/coupons', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Coupon> }) =>
      api.put<{ success: boolean; data: Coupon }>(`/api/admin/coupons/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/coupons/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  });
}

// ── Brands (list variant for admin) ──

export function useAdminBrandsPaginated(page = 1, limit = 100) {
  return useQuery<{ success: boolean; data: AdminBrandItem[]; pagination: Pagination }>({
    queryKey: ['admin', 'brands', page, limit],
    queryFn: () => api.get(`/api/admin/brands?page=${page}&limit=${limit}`),
    staleTime: 60_000,
  });
}

export function useCreateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AdminBrandItem>) =>
      api.post<{ success: boolean; data: AdminBrandItem }>('/api/admin/brands', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'brands'] }),
  });
}

export function useUpdateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminBrandItem> }) =>
      api.put<{ success: boolean; data: AdminBrandItem }>(`/api/admin/brands/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'brands'] }),
  });
}

export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/brands/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'brands'] }),
  });
}
