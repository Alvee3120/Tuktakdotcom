'use client';

import { Search, Check, X, Star, Trash2, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type Review = {
  id: string;
  productId: string;
  userId: string;
  orderId: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: string;
  productName: string | null;
  productImage: string | null;
  productSlug: string | null;
  userName: string | null;
  userEmail: string | null;
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: Review[] }>('/api/admin/reviews');
      setReviews(res.data);
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const toggleApprove = async (review: Review) => {
    try {
      await api.patch(`/api/admin/reviews/${review.id}`, { isApproved: !review.isApproved });
      toast.success(review.isApproved ? 'Review hidden' : 'Review approved');
      fetchReviews();
    } catch {
      toast.error('Failed to update');
    }
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    await api.delete(`/api/admin/reviews/${id}`);
    toast.success('Review deleted');
    fetchReviews();
  };

  const filtered = search
    ? reviews.filter(
        (r) =>
          (r.body ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (r.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (r.productName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (r.userName ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : reviews;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-xl font-bold">Reviews</h1>
        <p className="text-body-sm text-muted-foreground mt-0.5">
          {reviews.length} total · {reviews.filter((r) => !r.isApproved).length} pending approval
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search reviews..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-border flex flex-col items-center rounded-xl border border-dashed py-16 text-center">
          <Star className="text-muted-foreground/30 h-10 w-10" />
          <p className="text-muted-foreground mt-3 text-sm font-medium">No reviews found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <div
              key={review.id}
              className="border-border bg-card rounded-xl border transition-colors"
            >
              <div className="flex items-start gap-3 p-4">
                {/* Product image */}
                <div className="bg-muted relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                  {review.productImage && (
                    <Image
                      src={review.productImage}
                      alt={review.productName ?? 'Product'}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {/* Stars + badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            'h-3.5 w-3.5',
                            s <= review.rating ? 'fill-warning text-warning' : 'text-muted'
                          )}
                        />
                      ))}
                    </div>
                    <Badge
                      variant={review.isApproved ? 'default' : 'secondary'}
                      className="text-[9px]"
                    >
                      {review.isApproved ? 'Approved' : 'Pending'}
                    </Badge>
                    {review.isVerifiedPurchase && (
                      <Badge variant="outline" className="text-success text-[9px]">
                        Verified
                      </Badge>
                    )}
                  </div>

                  {/* Review title + body */}
                  {review.title && <p className="mt-1 text-sm font-medium">{review.title}</p>}
                  {review.body && (
                    <p
                      className={cn(
                        'text-muted-foreground mt-0.5 text-xs',
                        !expanded.has(review.id) && 'line-clamp-2'
                      )}
                    >
                      {review.body}
                    </p>
                  )}

                  {/* Product + reviewer info */}
                  <div className="text-muted-foreground mt-2 flex items-center gap-3 text-[11px]">
                    {review.productSlug ? (
                      <Link
                        href={`/admin/products`}
                        className="hover:text-primary max-w-[200px] truncate"
                      >
                        {review.productName ?? review.productId}
                      </Link>
                    ) : (
                      <span className="max-w-[200px] truncate">
                        {review.productName ?? review.productId}
                      </span>
                    )}
                    <span>·</span>
                    <span className="max-w-[150px] truncate">
                      {review.userName ?? review.userEmail ?? 'Unknown'}
                    </span>
                    <span>·</span>
                    <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="ml-2 flex shrink-0 items-center gap-1">
                  <button
                    onClick={() =>
                      setExpanded((p) => {
                        const n = new Set(p);
                        if (n.has(review.id)) {
                          n.delete(review.id);
                        } else {
                          n.add(review.id);
                        }
                        return n;
                      })
                    }
                    className="text-muted-foreground hover:bg-muted flex h-7 w-7 items-center justify-center rounded"
                  >
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 transition-transform',
                        expanded.has(review.id) && 'rotate-180'
                      )}
                    />
                  </button>
                  <button
                    onClick={() => toggleApprove(review)}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded',
                      review.isApproved
                        ? 'text-muted-foreground hover:bg-warning/10 hover:text-warning'
                        : 'text-success hover:bg-success/10'
                    )}
                  >
                    {review.isApproved ? (
                      <X className="h-3.5 w-3.5" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteReview(review.id)}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex h-7 w-7 items-center justify-center rounded"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
