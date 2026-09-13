'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useState } from 'react';

import { ProductList } from '@/components/store/ProductList';
import { useCarouselPaging } from '@/components/store/SectionControls';
import { useProducts } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

import type { CollectionSource, CollectionTab, GridConfig } from '@/lib/home-config';

/** Which product sort each auto-populated collection resolves to. */
const SOURCE_SORT: Record<CollectionSource, 'rating' | 'best_selling' | 'newest'> = {
  trending: 'rating',
  bestSelling: 'best_selling',
  newArrival: 'newest',
};

type CollectionTabsShowcaseProps = {
  title?: string;
  titleBn?: string;
  tabs: CollectionTab[];
  style?: 'carousel' | 'grid';
  grid?: GridConfig;
  cardVariant?: 'default' | 'compact';
};

function TabProducts({
  source,
  cols,
  rows,
  cardVariant,
  isCarousel,
  carouselRef,
}: {
  source: CollectionSource;
  cols: number;
  rows: number;
  cardVariant?: 'default' | 'compact';
  isCarousel: boolean;
  carouselRef?: React.Ref<HTMLDivElement>;
}) {
  // Carousel shows a single row but fetches extra pages to scroll through.
  const limit = isCarousel ? cols * 3 : cols * rows;
  const { data, isLoading } = useProducts({ sort: SOURCE_SORT[source], limit });
  const products = data?.data ?? [];

  return (
    <ProductList
      products={products}
      isLoading={isLoading}
      cols={cols}
      cardVariant={cardVariant}
      isCarousel={isCarousel}
      carouselRef={carouselRef}
      emptyMessage="No products found."
    />
  );
}

export function CollectionTabsShowcase({
  title,
  titleBn,
  tabs,
  style = 'carousel',
  grid,
  cardVariant,
}: CollectionTabsShowcaseProps) {
  const locale = useLocale();
  const isBn = locale === 'bn';
  const validTabs = tabs ?? [];
  const [activeIdx, setActiveIdx] = useState(0);

  const cols = grid?.columns ?? 4;
  const rows = grid?.rows ?? 1;
  const isCarousel = style !== 'grid';

  const paging = useCarouselPaging({
    activeIdx,
    onChangeActive: setActiveIdx,
    tabCount: validTabs.length,
  });

  if (validTabs.length === 0) return null;

  const safeIdx = activeIdx < validTabs.length ? activeIdx : 0;
  const active = validTabs[safeIdx];
  const displayTitle = isBn && titleBn ? titleBn : title;

  const goPrev = isCarousel
    ? paging.prev
    : () => setActiveIdx((i) => (i > 0 ? i - 1 : validTabs.length - 1));
  const goNext = isCarousel
    ? paging.next
    : () => setActiveIdx((i) => (i < validTabs.length - 1 ? i + 1 : 0));

  return (
    <section className="mx-auto max-w-screen-2xl px-2 py-8 sm:px-3 sm:py-10 lg:px-4 lg:py-14">
      {displayTitle && (
        <h2 className="text-heading-md text-foreground mb-4 font-bold">{displayTitle}</h2>
      )}

      {/* Tab bar — centered tabs, paging arrows pinned to the right edge */}
      <div className="border-border relative mb-5 border-b">
        <div className="scrollbar-hide flex justify-center gap-5 overflow-x-auto">
          {validTabs.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActiveIdx(i)}
              className={cn(
                'relative shrink-0 whitespace-nowrap pb-3 text-sm font-semibold transition-colors',
                i === safeIdx ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isBn && tab.labelBn ? tab.labelBn : tab.label}
              {i === safeIdx && (
                <span className="bg-primary absolute inset-x-0 -bottom-px h-0.5 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {validTabs.length > 1 && (
          <div className="absolute bottom-2 right-0 hidden items-center gap-2 sm:flex">
            <button
              onClick={goPrev}
              aria-label="Previous"
              className="border-border text-muted-foreground hover:border-primary hover:text-primary flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goNext}
              aria-label="Next"
              className="border-border text-muted-foreground hover:border-primary hover:text-primary flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <TabProducts
        key={active.id}
        source={active.source}
        cols={cols}
        rows={rows}
        cardVariant={cardVariant}
        isCarousel={isCarousel}
        carouselRef={paging.viewportRef}
      />
    </section>
  );
}
