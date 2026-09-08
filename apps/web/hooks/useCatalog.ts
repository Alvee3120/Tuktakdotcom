import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

/** Review type */
export type Review = {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string | null;
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: string;
  userName?: string | null;
};

/** Reviews list response */
type ReviewsListResponse = {
  success: boolean;
  data: Review[];
  meta?: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
};

/** Review eligibility response */
type ReviewEligibilityResponse = {
  success: boolean;
  data: {
    canReview: boolean;
    reason: string;
    hasPurchased: boolean;
    hasReviewed: boolean;
  };
};

/** Hook: Fetch reviews for a product */
export function useProductReviews(
  productId: string,
  params: { page?: number; sort?: string } = {}
) {
  return useQuery({
    queryKey: ['reviews', productId, params],
    queryFn: () =>
      api.get<ReviewsListResponse>(`/api/reviews/${productId}`, {
        params: { page: params.page, sort: params.sort },
      }),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });
}

/** Hook: Check if user can review a product */
export function useReviewEligibility(productId: string, orderId?: string) {
  return useQuery({
    queryKey: ['review-eligibility', productId, orderId],
    queryFn: () =>
      api.get<ReviewEligibilityResponse>('/api/reviews/check-eligibility', {
        params: { productId, orderId },
      }),
    enabled: !!productId,
    staleTime: 1 * 60 * 1000,
  });
}

/** Create review payload */
type CreateReviewPayload = {
  productId: string;
  orderId?: string;
  rating: number;
  title?: string;
  body?: string;
};

/** Hook: Submit a review */
export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReviewPayload) => api.post('/api/reviews', payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.productId] });
    },
  });
}

/** Category type */
export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
};

/** Hook: Fetch all categories */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ success: boolean; data: Category[] }>('/api/categories'),
    staleTime: 10 * 60 * 1000,
  });
}

/** Category with nested children (from /api/categories/tree) */
export type CategoryTreeNode = Category & { children: Category[] };

/** Hook: Fetch categories as a nested tree */
export function useCategoryTree() {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => api.get<{ success: boolean; data: CategoryTreeNode[] }>('/api/categories/tree'),
    staleTime: 10 * 60 * 1000,
  });
}

/** Brand type */
export type Brand = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  isActive: boolean;
};

/** Hook: Fetch all brands */
export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get<{ success: boolean; data: Brand[] }>('/api/brands'),
    staleTime: 10 * 60 * 1000,
  });
}

/** Hook: Fetch a single brand by slug */
export function useBrand(slug: string) {
  return useQuery({
    queryKey: ['brand', slug],
    queryFn: () => api.get<{ success: boolean; data: Brand }>(`/api/brands/${slug}`),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });
}
