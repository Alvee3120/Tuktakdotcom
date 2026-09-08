'use client';

import { LayoutGrid } from 'lucide-react';
import { useEffect } from 'react';

import { ProductCard } from '@/components/store/ProductCard';
import { cn } from '@/lib/utils';

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

  const gridClasses = cn(
    'grid gap-3 sm:gap-4',
    cols === 2 && 'grid-cols-2',
    cols === 3 && 'grid-cols-2 sm:grid-cols-3',
    cols === 4 && 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    cols === 5 && 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    cols === 6 && 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
  );

  if (isLoading) {
    return (
      <div className={gridClasses}>
        {[...Array(Math.min(cols * 2, 8))].map((_, i) => (
          <div key={i} className="bg-muted h-72 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <LayoutGrid className="text-muted-foreground/40 mb-3 h-10 w-10" />
        <p className="text-muted-foreground text-sm">{emptyMessage ?? 'No products found.'}</p>
      </div>
    );
  }

  if (isCarousel) {
    return (
      <div
        ref={carouselRef}
        className="scrollbar-hide overflow-x-auto scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        <div className="flex min-w-max gap-3 sm:gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              style={{ scrollSnapAlign: 'start' }}
              className={cn(
                'w-[calc(50%-6px)] shrink-0 sm:w-[calc(33.333%-11px)] lg:w-[calc(25%-12px)]',
                cols === 2 && 'sm:w-[calc(50%-8px)] lg:w-[calc(50%-8px)]',
                cols === 3 && 'sm:w-[calc(33.333%-11px)] lg:w-[calc(33.333%-11px)]',
                cols === 5 &&
                  'sm:w-[calc(33.333%-11px)] md:w-[calc(25%-12px)] lg:w-[calc(20%-13px)]',
                cols === 6 &&
                  'sm:w-[calc(33.333%-11px)] md:w-[calc(25%-12px)] lg:w-[calc(16.667%-14px)]'
              )}
            >
              <ProductCard product={product as never} variant={cardVariant} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={gridClasses}>
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
