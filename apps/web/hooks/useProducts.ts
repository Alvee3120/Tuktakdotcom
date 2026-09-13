import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

/** Product list response from API */
type ProductListResponse = {
  success: boolean;
  data: Product[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
};

/** Product detail response */
type ProductDetailResponse = {
  success: boolean;
  data: Product;
};

/** Product variant (size/color/storage option) */
export type ProductVariant = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  image: string | null;
  attributes: string | null;
  isActive: boolean;
};

/** Variant type group (Color, Size, etc.) */
export type VariantTypeGroup = {
  id: string;
  productId: string;
  name: string;
  type: string;
  sortOrder: number;
  options: {
    id: string;
    variantTypeId: string;
    name: string;
    value: string | null;
    sortOrder: number;
  }[];
};

/** Product type (matches API schema) */
export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  categoryId: string | null;
  brandId: string | null;
  image: string;
  images: string | null;
  isActive: boolean;
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  /** Present on the single-product endpoint only */
  variants?: ProductVariant[];
  /** Present on the single-product endpoint only */
  variantTypes?: VariantTypeGroup[];
};

/** Product list query params */
type ProductListParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  /** Include products from child categories of `category`. */
  includeDescendants?: boolean;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'best_selling';
  featured?: boolean;
  ids?: string[];
};

/** Hook: Fetch paginated product list with filters */
export function useProducts(params: ProductListParams = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () =>
      api.get<ProductListResponse>('/api/products', {
        params: {
          page: params.page,
          limit: params.limit,
          search: params.search,
          category: params.category,
          includeDescendants: params.includeDescendants ? 'true' : undefined,
          brand: params.brand,
          minPrice: params.minPrice,
          maxPrice: params.maxPrice,
          sort: params.sort,
          featured: params.featured ? 'true' : undefined,
          ids: params.ids && params.ids.length > 0 ? params.ids.join(',') : undefined,
        },
      }),
    staleTime: 60 * 1000, // 1 min
  });
}

/**
 * Hook: Fetch a specific set of products by ID (manually-picked home sections),
 * preserving the given `ids` order in the returned array.
 */
export function useProductsByIds(ids: string[]) {
  const query = useProducts({ ids, limit: ids.length || 1 });
  const ordered = query.data?.data
    ? [...query.data.data].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
    : [];
  return { ...query, products: ids.length > 0 ? ordered : [] };
}

/** Hook: Server-paginated infinite product list (real pagination, no client cap) */
export function useInfiniteProducts(params: Omit<ProductListParams, 'page'> = {}) {
  const limit = params.limit ?? 20;
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', { ...params, limit }],
    queryFn: ({ pageParam }) =>
      api.get<ProductListResponse>('/api/products', {
        params: {
          page: pageParam,
          limit,
          search: params.search,
          category: params.category,
          brand: params.brand,
          minPrice: params.minPrice,
          maxPrice: params.maxPrice,
          sort: params.sort,
          featured: params.featured ? 'true' : undefined,
        },
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta && lastPage.meta.page < lastPage.meta.totalPages
        ? lastPage.meta.page + 1
        : undefined,
    staleTime: 60 * 1000, // 1 min
  });
}

/** Flash deal product with sold count */
export type FlashDealProduct = Product & { sold: number };

/**
 * Hook: Fetch flash deal products by IDs with sold counts from orders.
 * Returns products in the given ID order, each with a `sold` field.
 */
export function useFlashDealProducts(ids: string[]) {
  const query = useQuery({
    queryKey: ['products', 'flash-deal', ids],
    queryFn: () =>
      api.get<{ success: boolean; data: FlashDealProduct[] }>('/api/products/flash-deal', {
        params: { ids: ids.join(',') },
      }),
    enabled: ids.length > 0,
    staleTime: 60 * 1000,
  });
  return { ...query, products: query.data?.data ?? [] };
}

/** Hook: Fetch single product by slug */
export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get<ProductDetailResponse>(`/api/products/${slug}`),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

/** Hook: Fetch featured products */
export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => api.get<{ success: boolean; data: Product[] }>('/api/products/featured'),
    staleTime: 5 * 60 * 1000,
  });
}

/** Hook: Fetch related products (same category) for a given product slug */
export function useRelatedProducts(slug: string, limit = 8) {
  return useQuery({
    queryKey: ['products', 'related', slug, limit],
    queryFn: () =>
      api.get<{ success: boolean; data: Product[] }>(`/api/products/${slug}/related`, {
        params: { limit },
      }),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}
