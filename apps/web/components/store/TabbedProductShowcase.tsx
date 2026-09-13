'use client';

import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { ProductCard } from '@/components/store/ProductCard';
import {
  SectionDots,
  useCarouselPaging,
  useRowHighlight,
} from '@/components/store/SectionControls';
import { useProductsByIds } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

import type { GridConfig, TabbedShowcaseTab } from '@/lib/home-config';

type TabbedProductShowcaseProps = {
  title?: string;
  titleBn?: string;
  subtitle?: string;
  subtitleBn?: string;
  titleAlign?: 'left' | 'center' | 'right';
  tabs: TabbedShowcaseTab[];
  style?: 'grid' | 'carousel';
  grid?: GridConfig;
  cardVariant?: 'default' | 'compact';
};

function TabbedGrid({
  productIds,
  grid,
  cardVariant,
  style,
  carouselRef,
  onRowRef,
  onRowsChange,
}: {
  productIds: string[];
  grid?: GridConfig;
  cardVariant?: 'default' | 'compact';
  style?: 'grid' | 'carousel';
  carouselRef?: React.Ref<HTMLDivElement>;
  onRowRef?: (i: number) => (el: HTMLElement | null) => void;
  onRowsChange?: (rows: number) => void;
}) {
  const cols = grid?.columns ?? 4;
  const { products, isLoading } = useProductsByIds(productIds);
  const rows = Math.max(1, Math.ceil(products.length / cols));

  useEffect(() => {
    onRowsChange?.(rows);
  }, [rows, onRowsChange]);

  if (isLoading) {
    return (
      <div
        className={cn(
          'grid gap-3 sm:gap-4',
          cols === 2 && 'grid-cols-2',
          cols === 3 && 'grid-cols-2 sm:grid-cols-3',
          cols === 4 && 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
          cols === 5 && 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
          cols === 6 && 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
        )}
      >
        {[...Array(Math.min(productIds.length || cols, 8))].map((_, i) => (
          <div key={i} className="bg-muted h-72 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <LayoutGrid className="text-muted-foreground/40 mb-3 h-10 w-10" />
        <p className="text-muted-foreground text-sm">No products in this collection yet.</p>
      </div>
    );
  }

  if (style === 'carousel') {
    return (
      <div
        ref={carouselRef}
        className="scrollbar-hide overflow-x-auto scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        <div className="flex w-full gap-3 sm:gap-4">
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
              <ProductCard product={product} variant={cardVariant} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-3 sm:gap-4',
        cols === 2 && 'grid-cols-2',
        cols === 3 && 'grid-cols-2 sm:grid-cols-3',
        cols === 4 && 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
        cols === 5 && 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
        cols === 6 && 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
      )}
    >
      {products.map((product, i) => (
        <div
          key={product.id}
          data-row={Math.floor(i / cols)}
          ref={onRowRef?.(Math.floor(i / cols))}
        >
          <ProductCard product={product} variant={cardVariant} />
        </div>
      ))}
    </div>
  );
}

export function TabbedProductShowcase({
  title,
  titleBn,
  subtitle,
  subtitleBn,
  titleAlign = 'left',
  tabs,
  style = 'grid',
  grid,
  cardVariant = 'default',
}: TabbedProductShowcaseProps) {
  const locale = useLocale();
  const isBn = locale === 'bn';
  const t = useTranslations('home');
  const validTabs = tabs.filter((tab) => tab.productIds.length > 0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [rows, setRows] = useState(0);

  const paging = useCarouselPaging({
    activeIdx,
    onChangeActive: setActiveIdx,
    tabCount: validTabs.length,
  });
  const rowSpy = useRowHighlight(rows);

  if (validTabs.length === 0) return null;

  const activeTab = validTabs[activeIdx] ?? validTabs[0];

  const alignClass =
    titleAlign === 'center' ? 'text-center' : titleAlign === 'right' ? 'text-right' : 'text-left';
  const underlinePos =
    titleAlign === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : titleAlign === 'right'
        ? 'right-0'
        : 'left-0';

  const displayTitle = isBn && titleBn ? titleBn : title;
  const displaySubtitle = isBn && subtitleBn ? subtitleBn : subtitle;
  const isCenter = titleAlign === 'center';
  const hasArrows = validTabs.length > 1;

  const goPrev =
    style === 'carousel'
      ? paging.prev
      : () => setActiveIdx((i) => (i > 0 ? i - 1 : validTabs.length - 1));
  const goNext =
    style === 'carousel'
      ? paging.next
      : () => setActiveIdx((i) => (i < validTabs.length - 1 ? i + 1 : 0));
  const dotCount = style === 'carousel' ? paging.pages : rows;
  const dotActive = style === 'carousel' ? paging.page : rowSpy.activeRow;

  return (
    <section className="mx-auto max-w-screen-2xl px-2 py-8 sm:px-3 sm:py-10 lg:px-4 lg:py-14">
      {/* Header */}
      <div className="border-border mb-6 border-b pb-3">
        {/* Center layout: title centered, no arrows */}
        {isCenter ? (
          <div className="flex flex-col items-center">
            {displayTitle && (
              <div className="text-center">
                <h2 className="text-heading-md text-foreground relative pb-3 text-center font-bold">
                  {displayTitle}
                  <span className="bg-primary absolute bottom-0 left-1/2 h-0.5 w-16 -translate-x-1/2" />
                </h2>
                {displaySubtitle && (
                  <p className="text-muted-foreground mt-1 text-sm">{displaySubtitle}</p>
                )}
              </div>
            )}
            {validTabs.length > 1 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {validTabs.map((tab, i) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveIdx(i)}
                    className={cn(
                      'rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
                      i === activeIdx
                        ? 'bg-primary shadow-primary/20 text-white shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {isBn && tab.labelBn ? tab.labelBn : tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Left/Right layout: title | scrollable tabs | arrows — no overlap on mobile */
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            {/* Title */}
            {displayTitle && (
              <div className={cn('shrink-0', alignClass)}>
                <h2
                  className={cn(
                    'text-heading-md text-foreground relative pb-3 font-bold',
                    alignClass
                  )}
                >
                  {displayTitle}
                  <span className={cn('bg-primary absolute bottom-0 h-0.5 w-16', underlinePos)} />
                </h2>
                {displaySubtitle && (
                  <p className="text-muted-foreground mt-1 max-w-[32ch] text-sm lg:max-w-none">{displaySubtitle}</p>
                )}
              </div>
            )}

            {/* Tabs (middle) — single-line scroll on mobile, centered wrap on desktop */}
            {validTabs.length > 1 && (
              <div
                className={cn(
                  'flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-4 px-4 lg:mx-0 lg:flex-1 lg:flex-wrap lg:justify-center lg:overflow-visible lg:px-0',
                  titleAlign === 'right' && 'lg:justify-end'
                )}
                style={{ scrollbarWidth: 'none' }}
              >
                {validTabs.map((tab, i) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveIdx(i)}
                    className={cn(
                      'shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
                      i === activeIdx
                        ? 'bg-primary shadow-primary/20 text-white shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {isBn && tab.labelBn ? tab.labelBn : tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Arrows (right) — keep on one line, hide on very small screens if needed */}
            {hasArrows && (
              <div className="flex shrink-0 items-center gap-2 self-start lg:self-center">
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
        )}
      </div>

      {/* Products */}
      <TabbedGrid
        key={activeTab.id}
        productIds={activeTab.productIds}
        grid={grid}
        cardVariant={cardVariant}
        style={style}
        carouselRef={paging.viewportRef}
        onRowRef={rowSpy.setRowRef}
        onRowsChange={setRows}
      />

      {/* Footer: dots (left) + See More (right) */}
      <div className="mt-6 flex items-center justify-between">
        <SectionDots
          count={dotCount}
          active={dotActive}
          onSelect={
            style === 'carousel'
              ? (p) => {
                  paging.viewportRef.current?.scrollTo({
                    left: p * (paging.viewportRef.current.clientWidth || 1),
                    behavior: 'smooth',
                  });
                }
              : undefined
          }
        />
        <Link href="/products" className="text-primary hover:text-primary/80 text-sm font-medium">
          {t('seeMore')} →
        </Link>
      </div>
    </section>
  );
}
