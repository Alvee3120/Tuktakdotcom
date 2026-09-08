'use client';

import { GitCompare, Heart, ShoppingCart, Star, Check, Eye, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { useAddToCart } from '@/hooks/useAddToCart';
import { cn, formatPrice } from '@/lib/utils';
import { useCompareStore } from '@/stores/useCompareStore';
import { useWishlistStore } from '@/stores/useWishlistStore';

import type { Product } from '@/hooks/useProducts';

type ProductCardProps = {
  product: Pick<
    Product,
    | 'id'
    | 'slug'
    | 'name'
    | 'image'
    | 'price'
    | 'compareAtPrice'
    | 'rating'
    | 'reviewCount'
    | 'stock'
  > & { badge?: string; badgeVariant?: 'default' | 'destructive' | 'secondary' };
  onAddToCart?: () => void;
  className?: string;
  /** 'compact' renders the storefront "Order Now" card (circular discount + full-width CTA) */
  variant?: 'default' | 'compact';
};

export function ProductCard({
  product,
  onAddToCart,
  className,
  variant = 'default',
}: ProductCardProps) {
  const {
    id,
    slug,
    name,
    image,
    price,
    compareAtPrice,
    rating,
    reviewCount,
    stock,
    badge,
    badgeVariant,
  } = product;
  const inStock = stock > 0;
  const lowStock = inStock && stock <= 5;
  const discount = compareAtPrice
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;
  const savedAmount = compareAtPrice ? compareAtPrice - price : 0;
  const addCompare = useCompareStore((s) => s.add);
  const isComparing = useCompareStore((s) => s.isComparing(id));
  const { add, isAdded } = useAddToCart();
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const isWishlistedStore = useWishlistStore((s) => s.isWishlisted(id));
  const t = useTranslations('home');
  const tp = useTranslations('products');
  const [mobileActionsVisible, setMobileActionsVisible] = useState(false);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback(() => {
    setMobileActionsVisible(true);
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => setMobileActionsVisible(false), 3000);
  }, []);

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    const success = addCompare({ id, slug, name, price, compareAtPrice, image, stock });
    if (!success) toast.error('Maximum 4 products can be compared');
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    add({ productId: id, slug, name, price, image }, e);
    onAddToCart?.();
  };

  // ═══ Compact "Order Now" storefront card ═══
  if (variant === 'compact') {
    return (
      <Link
        href={`/products/${slug}`}
        className={cn(
          'border-border/60 bg-card hover:shadow-primary/[0.06] group relative flex flex-col overflow-hidden rounded-2xl border text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
          !inStock && 'opacity-70',
          className
        )}
      >
        <div className="from-muted/40 to-muted/80 relative aspect-square overflow-hidden bg-gradient-to-b">
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 16vw"
            quality={92}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {discount > 0 && (
            <div className="bg-destructive absolute right-2.5 top-2.5 flex h-11 w-11 flex-col items-center justify-center rounded-full text-white shadow-lg">
              <span className="text-[9px] font-bold leading-none">-{discount}%</span>
            </div>
          )}
          {!inStock && (
            <Badge
              variant="secondary"
              className="absolute left-2.5 top-2.5 rounded-lg text-[10px] font-semibold"
            >
              {tp('outOfStock')}
            </Badge>
          )}
        </div>

        <div className="flex flex-1 flex-col px-3.5 pb-1 pt-2.5">
          <h3 className="text-foreground group-hover:text-primary line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug transition-colors">
            {name}
          </h3>
          <div className="mt-1.5 flex flex-col gap-x-1.5 gap-y-0.5 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            {discount > 0 && (
              <span className="mb-0.5 inline-flex self-start whitespace-nowrap rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 sm:mb-0 sm:inline">
                {tp('save')} {formatPrice(savedAmount)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              {compareAtPrice && (
                <span className="text-red-500 line-through">{formatPrice(compareAtPrice)}</span>
              )}
              <span className="text-foreground text-base font-bold">{formatPrice(price)}</span>
            </span>
          </div>
        </div>

        <div className="p-2 pt-1 sm:p-3">
          <button
            onClick={inStock ? handleAddToCart : (e) => e.preventDefault()}
            disabled={!inStock || isAdded(id)}
            className={cn(
              'flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-white transition-all sm:gap-2 sm:py-2.5 sm:text-sm',
              !inStock
                ? 'bg-muted-foreground/40 cursor-not-allowed'
                : isAdded(id)
                  ? 'bg-success'
                  : 'bg-primary hover:bg-primary/90 hover:shadow-primary/20 hover:shadow-md'
            )}
          >
            {isAdded(id) ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            {isAdded(id) ? tp('added') : t('orderNow')}
          </button>
        </div>
      </Link>
    );
  }

  // ═══ Default premium card ═══
  return (
    <Link
      href={`/products/${slug}`}
      className={cn(
        'border-border/60 bg-card group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border transition-all duration-300',
        'hover:border-primary/20 hover:shadow-primary/[0.06] hover:-translate-y-1 hover:shadow-xl',
        !inStock && 'opacity-70',
        className
      )}
    >
      {/* Image area */}
      <div
        className="from-muted/30 via-muted/50 to-muted/80 relative aspect-square overflow-hidden bg-gradient-to-br"
        onTouchStart={handleTouchStart}
      >
        <Image
          src={image}
          alt={name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          quality={92}
          className="object-cover transition-all duration-500 group-hover:scale-105"
        />

        {/* Discount badge — top left */}
        {discount > 0 && (
          <div className="absolute left-2.5 top-2.5 z-10">
            <span className="bg-destructive inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-bold text-white shadow-md">
              <Zap className="h-3 w-3 fill-white" />-{discount}%
            </span>
          </div>
        )}

        {/* Custom badge — below discount */}
        {badge && (
          <div className="absolute left-2.5 top-10 z-10">
            <Badge
              variant={badgeVariant}
              className="rounded-lg text-[10px] font-bold uppercase tracking-wide shadow-sm"
            >
              {badge}
            </Badge>
          </div>
        )}

        {/* Out of Stock */}
        {!inStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
            <span className="text-foreground rounded-full bg-white/90 px-4 py-1.5 text-xs font-bold shadow-lg">
              {tp('outOfStock')}
            </span>
          </div>
        )}

        {/* Action buttons — top right */}
        <div className={cn(
          "absolute right-2.5 top-2.5 z-10 flex flex-col gap-1.5 transition-all duration-200",
          // Mobile: hidden by default, visible on tap (mobileActionsVisible)
          mobileActionsVisible ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0",
          // Desktop: hidden by default, visible on hover
          "lg:translate-x-2 lg:opacity-0 lg:group-hover:translate-x-0 lg:group-hover:opacity-100"
        )}>
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleWishlist({ productId: id, slug, name, price, image, stock });
            }}
            aria-label="Toggle wishlist"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg shadow-sm backdrop-blur-sm transition-all hover:scale-110',
              isWishlistedStore
                ? 'bg-destructive/15 text-destructive border-destructive/20 border'
                : 'text-foreground border-border/40 border bg-white/80 hover:bg-white dark:bg-black/50 dark:hover:bg-black/70'
            )}
          >
            <Heart className={cn('h-3.5 w-3.5', isWishlistedStore && 'fill-destructive')} />
          </button>
          <button
            onClick={handleCompare}
            aria-label="Compare product"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg shadow-sm backdrop-blur-sm transition-all hover:scale-110',
              isComparing
                ? 'bg-primary/15 text-primary border-primary/20 border'
                : 'text-foreground border-border/40 border bg-white/80 hover:bg-white dark:bg-black/50 dark:hover:bg-black/70'
            )}
          >
            <GitCompare className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => e.preventDefault()}
            aria-label="Quick view"
            className="text-foreground border-border/40 flex h-8 w-8 items-center justify-center rounded-lg border bg-white/80 shadow-sm backdrop-blur-sm transition-all hover:scale-110 hover:bg-white dark:bg-black/50 dark:hover:bg-black/70"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-3.5 pb-1 pt-2.5">
        {/* Product name */}
        <h3 className="text-foreground group-hover:text-primary line-clamp-2 min-h-[2.25rem] text-[13px] font-medium leading-snug transition-colors">
          {name}
        </h3>

        {/* Rating */}
        <div className="mt-1.5 flex items-center gap-1">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-3 w-3',
                  i < Math.floor(rating ?? 0)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground/20'
                )}
              />
            ))}
          </div>
          {reviewCount !== undefined && reviewCount > 0 && (
            <span className="text-muted-foreground text-[10px]">({reviewCount})</span>
          )}
        </div>

        {/* Price — compact single line */}
        <div className="mt-auto flex flex-col gap-x-1.5 gap-y-0.5 pt-2 text-xs sm:flex-row sm:flex-wrap sm:items-center">
          {discount > 0 && (
            <span className="mb-0.5 inline-flex self-start whitespace-nowrap rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 sm:mb-0 sm:inline">
              {tp('save')} {formatPrice(savedAmount)}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            {compareAtPrice && (
              <span className="text-red-500 line-through">{formatPrice(compareAtPrice)}</span>
            )}
            <span className="text-foreground text-base font-bold">{formatPrice(price)}</span>
          </span>
        </div>
      </div>

      {/* Footer — Add to Cart + Wishlist */}
      <div className="flex items-center gap-1 px-2 pb-2.5 pt-1 sm:gap-1.5 sm:px-3.5 sm:pb-3">
        <button
          onClick={inStock ? handleAddToCart : (e) => e.preventDefault()}
          disabled={!inStock || isAdded(id)}
          aria-label="Add to cart"
          className={cn(
            'flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-[10px] font-semibold transition-all duration-200 sm:gap-1.5 sm:px-2 sm:py-2 sm:text-[11px] md:text-xs',
            !inStock
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : isAdded(id)
                ? 'bg-success text-white'
                : 'bg-primary hover:bg-primary/90 hover:shadow-primary/20 text-white hover:shadow-md active:scale-[0.98]'
          )}
        >
          {isAdded(id) ? (
            <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          ) : (
            <ShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          )}
          <span className="truncate">{isAdded(id) ? tp('added') : tp('addToCart')}</span>
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist({ productId: id, slug, name, price, image, stock });
          }}
          aria-label="Toggle wishlist"
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 hover:scale-105 sm:h-9 sm:w-9',
            isWishlistedStore
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-border/60 bg-card text-muted-foreground hover:border-primary/30 hover:text-primary'
          )}
        >
          <Heart className={cn('h-3 w-3 sm:h-3.5 sm:w-3.5', isWishlistedStore && 'fill-destructive')} />
        </button>
      </div>

      {/* Low stock indicator */}
      {lowStock && (
        <div className="-mt-1 px-3.5 pb-2.5">
          <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
            <div
              className="to-destructive h-full rounded-full bg-gradient-to-r from-amber-500"
              style={{ width: `${Math.max(stock * 12, 12)}%` }}
            />
          </div>
          <p className="text-destructive/80 mt-0.5 text-[9px] font-medium">
            {tp('onlyLeft', { count: stock })}
          </p>
        </div>
      )}
    </Link>
  );
}
