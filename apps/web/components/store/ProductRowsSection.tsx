'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

import { ProductList } from '@/components/store/ProductList';
import {
  SectionDots,
  useCarouselPaging,
  useRowHighlight,
} from '@/components/store/SectionControls';
import { useCategories } from '@/hooks/useCatalog';
import { useProducts } from '@/hooks/useProducts';

import type { CollectionSource, ProductRow, ProductRowSource } from '@/lib/home-config';

const SOURCE_SORT: Record<CollectionSource, 'rating' | 'best_selling' | 'newest'> = {
  trending: 'rating',
  bestSelling: 'best_selling',
  newArrival: 'newest',
};

const SOURCE_LABEL: Record<CollectionSource, string> = {
  trending: 'Trending',
  bestSelling: 'Best Selling',
  newArrival: 'New Arrival',
};

type ProductRowsSectionProps = {
  rows: ProductRow[];
  cardVariant?: 'default' | 'compact';
};

function Row({ row, cardVariant }: { row: ProductRow; cardVariant?: 'default' | 'compact' }) {
  const locale = useLocale();
  const isBn = locale === 'bn';

  const cols = row.grid?.columns ?? 4;
  const gridRows = row.grid?.rows ?? 1;
  const isCarousel = (row.style ?? 'carousel') !== 'grid';
  const limit = isCarousel ? cols * 3 : cols * gridRows;

  // Older rows may have no `source`; infer category when a category is set.
  const source: ProductRowSource = row.source ?? (row.categoryId ? 'category' : 'trending');
  const isCategory = source === 'category';
  const hasCategory = isCategory && !!row.categoryId;

  const { data, isLoading } = useProducts({
    category: hasCategory ? row.categoryId : undefined,
    // A parent category (e.g. Smartphones) has no direct products — include its
    // sub-categories so the row isn't empty.
    includeDescendants: hasCategory,
    sort: hasCategory ? undefined : isCategory ? 'newest' : SOURCE_SORT[source],
    limit,
  });
  const products = data?.data ?? [];

  const paging = useCarouselPaging({ activeIdx: 0, onChangeActive: () => {}, tabCount: 1 });
  const rowSpy = useRowHighlight(gridRows);

  // Title: manual override → category name → collection label.
  const { data: catData } = useCategories();
  const categoryName = hasCategory
    ? catData?.data.find((c) => c.id === row.categoryId)?.name
    : undefined;
  const title =
    (isBn && row.titleBn ? row.titleBn : row.title) ||
    categoryName ||
    (isCategory ? '' : SOURCE_LABEL[source]);

  // `pages` counts scroll steps past the first, so +1 gives the total pages
  // (dots). Arrows only make sense when there's more than one page — i.e. more
  // products than fit (4 on desktop, 3 on tablet, 2 on mobile).
  const dotCount = isCarousel ? paging.pages + 1 : Math.max(1, Math.ceil(products.length / cols));
  const activeDot = isCarousel ? paging.page : rowSpy.activeRow;
  const href = hasCategory ? `/products?category=${row.categoryId}` : '/products';
  const showArrows = isCarousel && paging.pages > 0;

  return (
    <div>
      {/* Title centered; paging arrows pinned right (shown on mobile too). */}
      <div className="relative mb-6 flex min-h-9 items-center justify-center">
        {title && (
          <h2 className="text-heading-md text-foreground relative pb-3 text-center font-bold">
            {title}
            <span className="bg-primary absolute bottom-0 left-1/2 h-0.5 w-16 -translate-x-1/2" />
          </h2>
        )}
        {showArrows && (
          <div className="absolute bottom-1 right-0 flex items-center gap-2">
            <button
              onClick={paging.prev}
              aria-label="Previous"
              className="border-border text-muted-foreground hover:border-primary hover:text-primary flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={paging.next}
              aria-label="Next"
              className="border-border text-muted-foreground hover:border-primary hover:text-primary flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <ProductList
        products={products}
        isLoading={isLoading}
        cols={cols}
        cardVariant={cardVariant}
        isCarousel={isCarousel}
        carouselRef={paging.viewportRef}
        onRowRef={rowSpy.setRowRef}
        emptyMessage="No products found."
      />

      <div className="mt-7 flex flex-col items-center gap-4">
        <SectionDots
          count={dotCount}
          active={activeDot}
          onSelect={
            isCarousel
              ? (p) => {
                  const el = paging.viewportRef.current;
                  if (el) el.scrollTo({ left: p * (el.clientWidth || 1), behavior: 'smooth' });
                }
              : undefined
          }
        />
        <Link
          href={href}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 inline-flex items-center justify-center rounded-md px-10 py-3 text-sm font-bold uppercase tracking-wide shadow-sm transition-colors"
        >
          {isBn ? 'আরও দেখুন' : 'See More'}
        </Link>
      </div>
    </div>
  );
}

export function ProductRowsSection({ rows, cardVariant }: ProductRowsSectionProps) {
  const validRows = (rows ?? []).filter(Boolean);
  if (validRows.length === 0) return null;

  return (
    <section className="mx-auto max-w-screen-2xl space-y-12 px-2 py-8 sm:px-3 sm:py-10 lg:space-y-16 lg:px-4 lg:py-14">
      {validRows.map((row) => (
        <Row key={row.id} row={row} cardVariant={cardVariant} />
      ))}
    </section>
  );
}
