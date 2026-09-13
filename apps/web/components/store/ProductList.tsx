'use client';

import { LayoutGrid } from 'lucide-react';
import { useEffect } from 'react';

import { ProductCard } from '@/components/store/ProductCard';
import { cn } from '@/lib/utils';

/** Number of columns that fit per view depends on the breakpoint; the width
 *  classes below express that per `cols`. */
function carouselItemClass(cols: number) {
  return cn(
    'w-[calc(50%-6px)] shrink-0 sm:w-[calc(33.333%-11px)] lg:w-[calc(25%-12px)]',
    cols === 2 && 'sm:w-[calc(50%-8px)] lg:w-[calc(50%-8px)]',
    cols === 3 && 'sm:w-[calc(33.333%-11px)] lg:w-[calc(33.333%-11px)]',
    cols === 5 && 'sm:w-[calc(33.333%-11px)] md:w-[calc(25%-12px)] lg:w-[calc(20%-13px)]',
    cols === 6 && 'sm:w-[calc(33.333%-11px)] md:w-[calc(25%-12px)] lg:w-[calc(16.667%-14px)]'
  );
}

function gridClass(cols: number) {
  return cn(
    'grid gap-3 sm:gap-4',
    cols === 2 && 'grid-cols-2',
    cols === 3 && 'grid-cols-2 sm:grid-cols-3',
    cols === 4 && 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    cols === 5 && 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    cols === 6 && 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
  );
}

/** Shared renderer: horizontal scroll strip (carousel) or multi-column grid. */
export function ProductList({
  products,
  isLoading,
  cols,
  cardVariant,
  emptyMessage,
  isCarousel,
  carouselRef,
  onRowRef,
  onRowsChange,
}: {
  products: { id: string }[];
  isLoading: boolean;
  cols: number;
  cardVariant?: 'default' | 'compact';
  emptyMessage?: string;
  isCarousel: boolean;
  carouselRef?: React.Ref<HTMLDivElement>;
  onRowRef?: (i: number) => (el: HTMLElement | null) => void;
  onRowsChange?: (rows: number) => void;
}) {
  const rows = Math.max(1, Math.ceil(products.length / cols));

  useEffect(() => {
    onRowsChange?.(rows);
  }, [rows, onRowsChange]);

  const skeletonCount = Math.min(cols * 2, 8);

  if (!isLoading && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <LayoutGrid className="text-muted-foreground/40 mb-3 h-10 w-10" />
        <p className="text-muted-foreground text-sm">{emptyMessage ?? 'No products found.'}</p>
      </div>
    );
  }

  // The carousel track is rendered while loading too, so the scroll container
  // (and the ref the paging hook observes) exists on first paint. Otherwise the
  // hook attaches its observers to a null ref and never learns the scroll
  // width, leaving pages at 0 — so dots/arrows stay hidden until a re-mount.
  if (isCarousel) {
    return (
      <div
        ref={carouselRef}
        className="scrollbar-hide overflow-x-auto scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {/* `w-full` (not `min-w-max`): the track must have the container's
            definite width so the items' percentage widths resolve against the
            viewport — with `min-w-max` they resolve against the content-sized
            track, doubling each card so only ~2 fit on desktop. */}
        <div className="flex w-full gap-3 sm:gap-4">
          {isLoading
            ? [...Array(skeletonCount)].map((_, i) => (
                <div key={i} className={carouselItemClass(cols)}>
                  <div className="bg-muted h-72 animate-pulse rounded-xl" />
                </div>
              ))
            : products.map((product) => (
                <div
                  key={product.id}
                  style={{ scrollSnapAlign: 'start' }}
                  className={carouselItemClass(cols)}
                >
                  <ProductCard product={product as never} variant={cardVariant} />
                </div>
              ))}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={gridClass(cols)}>
        {[...Array(skeletonCount)].map((_, i) => (
          <div key={i} className="bg-muted h-72 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={gridClass(cols)}>
      {products.map((product, i) => (
        <div
          key={product.id}
          data-row={Math.floor(i / cols)}
          ref={onRowRef?.(Math.floor(i / cols))}
        >
          <ProductCard product={product as never} variant={cardVariant} />
        </div>
      ))}
    </div>
  );
}
