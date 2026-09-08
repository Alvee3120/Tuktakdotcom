'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { ProductList } from '@/components/store/ProductList';
import {
  SectionDots,
  useCarouselPaging,
  useRowHighlight,
} from '@/components/store/SectionControls';
import { useCategories } from '@/hooks/useCatalog';
import { useProducts, useProductsByIds } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

import type { CategoryTabsTab, GridConfig } from '@/lib/home-config';

type BestSellersProps = {
  title?: string;
  titleBn?: string;
  subtitle?: string;
  subtitleBn?: string;
  titleAlign?: 'left' | 'center' | 'right';
  tabs: CategoryTabsTab[];
  showAllTab?: boolean;
  style?: 'split' | 'grid';
  cardVariant?: 'default' | 'compact';
  grid?: GridConfig;
};

type TabContentProps = {
  grid?: GridConfig;
  cardVariant?: 'default' | 'compact';
  isCarousel: boolean;
  carouselRef?: React.Ref<HTMLDivElement>;
  onRowRef?: (i: number) => (el: HTMLElement | null) => void;
  onRowsChange?: (rows: number) => void;
};

function TabBody({
  products,
  isLoading,
  grid,
  cardVariant,
  isCarousel,
  carouselRef,
  onRowRef,
  onRowsChange,
  emptyMessage,
}: TabContentProps & {
  products: { id: string }[];
  isLoading: boolean;
  emptyMessage?: string;
}) {
  const cols = grid?.columns ?? 4;
  return (
    <ProductList
      products={products}
      isLoading={isLoading}
      cols={cols}
      cardVariant={cardVariant}
      emptyMessage={emptyMessage}
      isCarousel={isCarousel}
      carouselRef={carouselRef}
      onRowRef={onRowRef}
      onRowsChange={onRowsChange}
    />
  );
}

function AllProductsTab(props: TabContentProps) {
  const cols = props.grid?.columns ?? 4;
  const rows = props.grid?.rows ?? 2;
  const { data, isLoading } = useProducts({ sort: 'rating', limit: Math.max(cols * rows * 2, 16) });
  const products = (data?.data ?? []).slice(0, cols * rows);
  return <TabBody {...props} products={products} isLoading={isLoading} />;
}

function CategoryTabContent({ categoryId, ...props }: TabContentProps & { categoryId: string }) {
  const cols = props.grid?.columns ?? 4;
  const rows = props.grid?.rows ?? 2;
  const { data, isLoading } = useProducts({
    category: categoryId,
    limit: Math.max(cols * rows * 2, 16),
  });
  const products = (data?.data ?? []).slice(0, cols * rows);
  return <TabBody {...props} products={products} isLoading={isLoading} />;
}

function CustomTabContent({ productIds, ...props }: TabContentProps & { productIds: string[] }) {
  const { products, isLoading } = useProductsByIds(productIds);
  return (
    <TabBody
      {...props}
      products={products}
      isLoading={isLoading}
      emptyMessage="No products in this collection yet."
    />
  );
}

export function BestSellers({
  title,
  titleBn,
  subtitle,
  subtitleBn,
  titleAlign = 'left',
  tabs = [],
  showAllTab = false,
  style = 'split',
  cardVariant = 'default',
  grid,
}: BestSellersProps) {
  const t = useTranslations('home');
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

  const displayTitle = isBn && titleBn ? titleBn : title || t('bestsellers');
  const displaySubtitle = isBn && subtitleBn ? subtitleBn : subtitle;
  const isCenter = titleAlign === 'center';

  const isCarousel = style !== 'grid';
  const hasArrows = displayTabs.length > 1;
  const goPrev = isCarousel
    ? paging.prev
    : () => setActiveIdx((i) => (i > 0 ? i - 1 : displayTabs.length - 1));
  const goNext = isCarousel
    ? paging.next
    : () => setActiveIdx((i) => (i < displayTabs.length - 1 ? i + 1 : 0));
  const dotCount = isCarousel ? paging.pages : rows;
  const dotActive = isCarousel ? paging.page : rowSpy.activeRow;

  const tabProps: TabContentProps = {
    grid,
    cardVariant,
    isCarousel,
    carouselRef: paging.viewportRef,
    onRowRef: rowSpy.setRowRef,
    onRowsChange: setRows,
  };

  return (
    <section className="bg-muted/30 dark:bg-card/30">
      <div className="mx-auto max-w-screen-2xl px-2 py-8 sm:px-3 sm:py-10 lg:px-4 lg:py-14">
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
                  {displayTabs.map((t2, i) => (
                    <button
                      key={t2.id}
                      onClick={() => setActiveIdx(i)}
                      className={cn(
                        'rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
                        i === safeIdx
                          ? 'bg-primary shadow-primary/20 text-white shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {t2.label}
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
                  {displayTabs.map((t2, i) => (
                    <button
                      key={t2.id}
                      onClick={() => setActiveIdx(i)}
                      className={cn(
                        'shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
                        i === safeIdx
                          ? 'bg-primary shadow-primary/20 text-white shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {t2.label}
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
        {active.kind === 'all' && <AllProductsTab key="__all__" {...tabProps} />}
        {active.kind === 'category' && active.categoryId && (
          <CategoryTabContent key={active.id} categoryId={active.categoryId} {...tabProps} />
        )}
        {active.kind === 'custom' && active.productIds && (
          <CustomTabContent key={active.id} productIds={active.productIds} {...tabProps} />
        )}

        {/* Footer: dots (left) + See More (right) */}
        <div className="mt-6 flex items-center justify-between">
          <SectionDots
            count={dotCount}
            active={dotActive}
            onSelect={
              isCarousel
                ? (p) => {
                    const el = paging.viewportRef.current;
                    if (el) el.scrollTo({ left: p * (el.clientWidth || 1), behavior: 'smooth' });
                  }
                : undefined
            }
          />
          <Link href="/products" className="text-primary hover:text-primary/80 text-sm font-medium">
            {t('seeMore')} →
          </Link>
        </div>
      </div>
    </section>
  );
}
