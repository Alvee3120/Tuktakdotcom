'use client';

import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';

import { ProductCard } from '@/components/store/ProductCard';
import {
  SectionDots,
  useCarouselPaging,
  useRowHighlight,
} from '@/components/store/SectionControls';
import { useCategories } from '@/hooks/useCatalog';
import { useProducts, useProductsByIds } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

import type { CategoryTabsTab, GridConfig } from '@/lib/home-config';

type TrendingProductsProps = {
  title: string;
  titleBn?: string;
  subtitle?: string;
  subtitleBn?: string;
  titleAlign?: 'left' | 'center' | 'right';
  sort?: 'rating' | 'newest';
  viewAllHref?: string;
  tabs: CategoryTabsTab[];
  showAllTab?: boolean;
  style?: 'carousel' | 'grid';
  cardVariant?: 'default' | 'compact';
  grid?: GridConfig;
};

/* ─── Shared list renderer: carousel strip or grid ─── */
function ProductList({
  products,
  isLoading,
  cols,
  cardVariant,
  emptyMessage,
  style,
  carouselRef,
  onRowRef,
  onRowsChange,
}: {
  products: { id: string }[];
  isLoading: boolean;
  cols: number;
  cardVariant?: 'default' | 'compact';
  emptyMessage?: string;
  style?: 'carousel' | 'grid';
  carouselRef?: React.Ref<HTMLDivElement>;
  onRowRef?: (i: number) => (el: HTMLElement | null) => void;
  onRowsChange?: (rows: number) => void;
}) {
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

  if (style === 'carousel') {
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
          <ProductCard product={product as never} variant={cardVariant} />
        </div>
      ))}
    </div>
  );
}

function TabContent({
  products,
  isLoading,
  cols,
  cardVariant,
  emptyMessage,
  style,
  carouselRef,
  onRowRef,
  onRowsChange,
}: {
  products: { id: string }[];
  isLoading: boolean;
  cols: number;
  cardVariant?: 'default' | 'compact';
  emptyMessage?: string;
  style?: 'carousel' | 'grid';
  carouselRef?: React.Ref<HTMLDivElement>;
  onRowRef?: (i: number) => (el: HTMLElement | null) => void;
  onRowsChange?: (rows: number) => void;
}) {
  return (
    <ProductList
      products={products}
      isLoading={isLoading}
      cols={cols}
      cardVariant={cardVariant}
      emptyMessage={emptyMessage}
      style={style}
      carouselRef={carouselRef}
      onRowRef={onRowRef}
      onRowsChange={onRowsChange}
    />
  );
}

function AllProductsTab({
  sort,
  grid,
  cardVariant,
  style,
  carouselRef,
  onRowRef,
  onRowsChange,
}: {
  sort?: 'rating' | 'newest';
  grid?: GridConfig;
  cardVariant?: 'default' | 'compact';
  style?: 'carousel' | 'grid';
  carouselRef?: React.Ref<HTMLDivElement>;
  onRowRef?: (i: number) => (el: HTMLElement | null) => void;
  onRowsChange?: (rows: number) => void;
}) {
  const cols = grid?.columns ?? 4;
  const { data, isLoading } = useProducts({ sort, limit: cols * (grid?.rows ?? 2) });
  const products = data?.data ?? [];
  return (
    <TabContent
      products={products}
      isLoading={isLoading}
      cols={cols}
      cardVariant={cardVariant}
      emptyMessage="No trending products yet."
      style={style}
      carouselRef={carouselRef}
      onRowRef={onRowRef}
      onRowsChange={onRowsChange}
    />
  );
}

function CategoryTab({
  categoryId,
  grid,
  cardVariant,
  style,
  carouselRef,
  onRowRef,
  onRowsChange,
}: {
  categoryId: string;
  grid?: GridConfig;
  cardVariant?: 'default' | 'compact';
  style?: 'carousel' | 'grid';
  carouselRef?: React.Ref<HTMLDivElement>;
  onRowRef?: (i: number) => (el: HTMLElement | null) => void;
  onRowsChange?: (rows: number) => void;
}) {
  const cols = grid?.columns ?? 4;
  const { data, isLoading } = useProducts({
    category: categoryId,
    limit: cols * (grid?.rows ?? 2),
  });
  const products = data?.data ?? [];
  return (
    <TabContent
      products={products}
      isLoading={isLoading}
      cols={cols}
      cardVariant={cardVariant}
      style={style}
      carouselRef={carouselRef}
      onRowRef={onRowRef}
      onRowsChange={onRowsChange}
    />
  );
}

function CustomTab({
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
  style?: 'carousel' | 'grid';
  carouselRef?: React.Ref<HTMLDivElement>;
  onRowRef?: (i: number) => (el: HTMLElement | null) => void;
  onRowsChange?: (rows: number) => void;
}) {
  const cols = grid?.columns ?? 4;
  const { products, isLoading } = useProductsByIds(productIds);
  return (
    <TabContent
      products={products}
      isLoading={isLoading}
      cols={cols}
      cardVariant={cardVariant}
      emptyMessage="No products in this collection yet."
      style={style}
      carouselRef={carouselRef}
      onRowRef={onRowRef}
      onRowsChange={onRowsChange}
    />
  );
}

export function TrendingProducts({
  title,
  titleBn,
  subtitle,
  subtitleBn,
  titleAlign = 'left',
  sort = 'rating',
  viewAllHref = '/products',
  tabs = [],
  showAllTab = false,
  style = 'carousel',
  cardVariant = 'default',
  grid,
}: TrendingProductsProps) {
  const locale = useLocale();
  const isBn = locale === 'bn';

  const validTabs = tabs.filter((tab) => {
    if (tab.type === 'category') return !!tab.categoryId;
    if (tab.type === 'custom') return (tab.productIds?.length ?? 0) > 0;
    return false;
  });

  const { data: catData } = useCategories();
  const categoryMap = new Map((catData?.data ?? []).map((c) => [c.id, c.name]));

  const [activeIdx, setActiveIdx] = useState(0);
  const [rows, setRows] = useState(0);

  type DisplayTab = {
    id: string;
    label: string;
    kind: 'all' | 'category' | 'custom';
    categoryId?: string;
    productIds?: string[];
  };
  const displayTabs: DisplayTab[] = [];
  if (showAllTab) {
    displayTabs.push({ id: '__all__', label: isBn ? 'সব' : 'All', kind: 'all' });
  }
  for (const tab of validTabs) {
    const fallbackLabel =
      tab.type === 'category' && tab.categoryId
        ? (categoryMap.get(tab.categoryId) ?? 'Category')
        : 'Custom';
    displayTabs.push({
      id: tab.id,
      label: isBn && tab.labelBn ? tab.labelBn : tab.label || fallbackLabel,
      kind: tab.type,
      categoryId: tab.categoryId,
      productIds: tab.productIds,
    });
  }

  const paging = useCarouselPaging({
    activeIdx,
    onChangeActive: setActiveIdx,
    tabCount: displayTabs.length,
  });

  const rowSpy = useRowHighlight(rows);

  if (displayTabs.length === 0) return null;

  const safeIdx = activeIdx < displayTabs.length ? activeIdx : 0;
  const active = displayTabs[safeIdx];

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
  const hasArrows = displayTabs.length > 1;

  const goPrev =
    style === 'carousel'
      ? paging.prev
      : () => setActiveIdx((i) => (i > 0 ? i - 1 : displayTabs.length - 1));
  const goNext =
    style === 'carousel'
      ? paging.next
      : () => setActiveIdx((i) => (i < displayTabs.length - 1 ? i + 1 : 0));
  const dotCount = style === 'carousel' ? paging.pages : rows;
  const dotActive = style === 'carousel' ? paging.page : rowSpy.activeRow;

  return (
    <section className="mx-auto max-w-screen-2xl px-2 py-8 sm:px-3 sm:py-10 lg:px-4 lg:py-14">
      {/* Header */}
      <div className="border-border mb-6 border-b pb-3">
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
            {displayTabs.length > 1 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {displayTabs.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveIdx(i)}
                    className={cn(
                      'rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
                      i === safeIdx
                        ? 'bg-primary shadow-primary/20 text-white shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
            {hasArrows && (
              <div className="mt-4 flex items-center gap-2">
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
        ) : (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
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
            {displayTabs.length > 1 && (
              <div
                className={cn(
                  'flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-4 px-4 lg:mx-0 lg:flex-1 lg:flex-wrap lg:justify-center lg:overflow-visible lg:px-0',
                  titleAlign === 'right' && 'lg:justify-end'
                )}
                style={{ scrollbarWidth: 'none' }}
              >
                {displayTabs.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveIdx(i)}
                    className={cn(
                      'shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
                      i === safeIdx
                        ? 'bg-primary shadow-primary/20 text-white shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
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

      {/* Tab content */}
      {active.kind === 'all' && (
        <AllProductsTab
          key="__all__"
          sort={sort}
          grid={grid}
          cardVariant={cardVariant}
          style={style}
          carouselRef={paging.viewportRef}
          onRowRef={rowSpy.setRowRef}
          onRowsChange={setRows}
        />
      )}
      {active.kind === 'category' && active.categoryId && (
        <CategoryTab
          key={active.id}
          categoryId={active.categoryId}
          grid={grid}
          cardVariant={cardVariant}
          style={style}
          carouselRef={paging.viewportRef}
          onRowRef={rowSpy.setRowRef}
          onRowsChange={setRows}
        />
      )}
      {active.kind === 'custom' && active.productIds && (
        <CustomTab
          key={active.id}
          productIds={active.productIds}
          grid={grid}
          cardVariant={cardVariant}
          style={style}
          carouselRef={paging.viewportRef}
          onRowRef={rowSpy.setRowRef}
          onRowsChange={setRows}
        />
      )}

      {/* Footer: dots (left) + See More (right) */}
      <div className="mt-6 flex items-center justify-between">
        <SectionDots
          count={dotCount}
          active={dotActive}
          onSelect={
            style === 'carousel'
              ? (p) => {
                  const el = paging.viewportRef.current;
                  if (el) el.scrollTo({ left: p * (el.clientWidth || 1), behavior: 'smooth' });
                }
              : undefined
          }
        />
        {viewAllHref && (
          <a href={viewAllHref} className="text-primary hover:text-primary/80 text-sm font-medium">
            {displayTitle} →
          </a>
        )}
      </div>
    </section>
  );
}
