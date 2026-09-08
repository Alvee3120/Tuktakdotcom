'use client';

import { Star, User, CheckCircle } from 'lucide-react';
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useProductReviews, useCreateReview, useReviewEligibility } from '@/hooks/useCatalog';
import { cn } from '@/lib/utils';

type ReviewsSectionProps = {
  productId: string;
  orderId?: string;
};

export function ReviewsSection({ productId, orderId }: ReviewsSectionProps) {
  const { data: reviewsRes, isLoading } = useProductReviews(productId);
  const { data: eligibility } = useReviewEligibility(productId, orderId);
  const createReview = useCreateReview();
  const reviews = reviewsRes?.data ?? [];

  const canReview = eligibility?.data?.canReview ?? false;
  const hasPurchased = eligibility?.data?.hasPurchased ?? false;
  const hasReviewed = eligibility?.data?.hasReviewed ?? false;

  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createReview.mutateAsync({
        productId,
        orderId,
        rating,
        title: title || undefined,
        body: body || undefined,
      });
      setShowForm(false);
      setRating(5);
      setTitle('');
      setBody('');
    } catch {
      // Error handling in mutation
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-heading-md font-semibold">Customer Reviews</h2>
        {canReview && (
          <PremiumButton variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
            Write a Review
          </PremiumButton>
        )}
      </div>

      {/* Purchase requirement notice */}
      {!hasPurchased && (
        <div className="border-border bg-muted/30 rounded-xl border p-4 text-center">
          <p className="text-muted-foreground text-sm">Purchase this product to leave a review.</p>
        </div>
      )}

      {hasReviewed && !showForm && (
        <div className="border-success/30 bg-success/5 rounded-xl border p-4 text-center">
          <CheckCircle className="text-success mx-auto mb-1 h-5 w-5" />
          <p className="text-success text-sm font-medium">
            You&apos;ve already reviewed this product.
          </p>
        </div>
      )}

      {/* Review form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border-border bg-card space-y-4 rounded-xl border p-6"
        >
          <div className="space-y-2">
            <Label>Your Rating</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-colors"
                >
                  <Star
                    className={cn(
                      'h-6 w-6 transition-colors',
                      star <= (hoverRating || rating)
                        ? 'fill-warning text-warning'
                        : 'fill-muted text-muted'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-title">Title (optional)</Label>
            <Input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-body">Review</Label>
            <Textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your thoughts about this product"
              rows={4}
            />
          </div>

          <div className="flex items-center gap-3">
            <PremiumButton
              variant="primary"
              size="sm"
              type="submit"
              disabled={createReview.isPending}
            >
              {createReview.isPending ? 'Submitting...' : 'Submit Review'}
            </PremiumButton>
            <PremiumButton
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </PremiumButton>
          </div>
          <p className="text-caption text-muted-foreground">
            Reviews are moderated and will appear after approval.
          </p>
        </form>
      )}

      <Separator />

      {/* Reviews list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-border space-y-2 rounded-xl border p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-body-md text-muted-foreground">No reviews yet.</p>
          <p className="text-caption text-muted-foreground mt-1">
            Be the first to review this product!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border-border bg-card space-y-2 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                    <User className="text-muted-foreground h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-body-sm font-medium">{review.userName || 'Customer'}</p>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-3 w-3',
                            i < review.rating
                              ? 'fill-warning text-warning'
                              : 'fill-muted text-muted'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-caption text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              {review.title && <p className="text-body-sm font-semibold">{review.title}</p>}
              {review.body && <p className="text-body-sm text-muted-foreground">{review.body}</p>}
              {review.isVerifiedPurchase && (
                <span className="text-caption text-success font-medium">✓ Verified Purchase</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
