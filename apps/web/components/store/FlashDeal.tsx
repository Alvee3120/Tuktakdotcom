'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Zap, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, useCallback } from 'react';

import { SectionDots, useRowHighlight } from '@/components/store/SectionControls';
import { useFlashDealProducts, type FlashDealProduct } from '@/hooks/useProducts';
import { cn, formatPrice } from '@/lib/utils';

import type { GridConfig, FlashDealTab } from '@/lib/home-config';

type FlashDealProps = {
  title?: string;
  titleBn?: string;
  endsAt?: string;
  tabs?: FlashDealTab[];
  productIds: string[];
  style?: 'grid' | 'carousel';
  grid?: GridConfig;
};

type Remaining = { days: number; hours: number; minutes: number; seconds: number } | null;

function computeRemaining(endsAt?: string): Remaining {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

/* ─── Flash Deal Product Card ─── */
function FlashDealCard({ product }: { product: FlashDealProduct }) {
  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;
  const savedAmount = product.compareAtPrice ? product.compareAtPrice - product.price : 0;
  const inStock = product.stock > 0;
  const lowStock = inStock && product.stock <= 5;
  const totalCapacity = product.stock + product.sold;
  const stockPercent = totalCapacity > 0 ? Math.round((product.sold / totalCapacity) * 100) : 0;

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="border-border bg-card relative overflow-hidden rounded-xl border transition-shadow hover:shadow-md">
        {/* Image + Discount badge */}
        <div className="from-muted/30 via-muted/50 to-muted/80 relative aspect-square overflow-hidden bg-gradient-to-br">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 480px) 45vw, (max-width: 768px) 30vw, 200px"
            quality={92}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {discount > 0 && (
            <span className="bg-destructive absolute left-2 top-2 z-10 inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-bold text-white shadow-md">
              -{discount}%
            </span>
          )}
          {lowStock && (
            <span className="absolute right-2 top-2 z-10 rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
              Low Stock
            </span>
          )}
        </div>

        {/* Info */}
        <div className="space-y-1.5 p-3">
          <h3 className="text-foreground group-hover:text-primary line-clamp-2 text-[13px] font-medium leading-snug">
            {product.name}
          </h3>

          {/* Price — single line */}
          <div className="flex flex-col gap-x-1.5 gap-y-0.5 text-xs sm:flex-row sm:items-center">
            {discount > 0 && (
              <span className="mb-0.5 inline-flex self-start font-semibold text-emerald-600 sm:mb-0 sm:inline">
                Save {formatPrice(savedAmount)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              {product.compareAtPrice && (
                <span className="text-red-500 line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
              <span className="text-foreground text-base font-bold">
                {formatPrice(product.price)}
              </span>
            </span>
          </div>

          {/* Stock bar */}
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">{product.sold} sold</span>
              <span
                className={cn('font-medium', lowStock ? 'text-destructive' : 'text-emerald-600')}
              >
                {product.stock} left
              </span>
            </div>
            <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  lowStock ? 'bg-destructive' : 'bg-primary'
                )}
                style={{ width: `${stockPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Capsule Countdown Timer ─── */
function CapsuleTimer({ remaining }: { remaining: Remaining }) {
  if (!remaining) return null;
  const units = [
    { v: remaining.days, l: 'D' },
    { v: remaining.hours, l: 'H' },
    { v: remaining.minutes, l: 'M' },
    { v: remaining.seconds, l: 'S' },
  ];

  return (
    <div className="border-primary/20 bg-primary/5 flex items-center gap-1 rounded-full border px-2 py-1 sm:px-3 sm:py-1.5">
      {units.map((unit, i) => (
        <div key={i} className="flex items-center gap-0.5 sm:gap-1">
          <span className="bg-primary min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums text-white sm:min-w-[1.75rem] sm:px-2 sm:text-xs">
            {String(unit.v).padStart(2, '0')}
          </span>
          <span className="text-muted-foreground text-[9px] font-medium sm:text-[10px]">
            {unit.l}
          </span>
          {i < units.length - 1 && <span className="text-primary/40">:</span>}
        </div>
      ))}
    </div>
  );
}

/* ─── Main FlashDeal Component ─── */
export function FlashDeal({
  title,
  titleBn,
  endsAt,
  tabs = [],
  productIds,
  style = 'grid',
  grid,
}: FlashDealProps) {
  const t = useTranslations('home');
  const locale = useLocale();
  const isBn = locale === 'bn';
  const cols = grid?.columns ?? 6;

  // Determine which products to show: active tab or flat list
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const hasTabs = tabs.length > 0;
  const effectiveTabId = activeTab ?? tabs[0]?.id ?? null;
  const effectiveProductIds = hasTabs
    ? (tabs.find((tab) => tab.id === effectiveTabId)?.productIds ?? tabs[0]?.productIds ?? [])
    : productIds;

  const { products, isLoading } = useFlashDealProducts(effectiveProductIds);

  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', slidesToScroll: 2 });
  const isCarousel = style === 'carousel';

  const [remaining, setRemaining] = useState<Remaining>(null);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setRemaining(computeRemaining(endsAt));
    const raf = requestAnimationFrame(tick);
    const timer = setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
    };
  }, [endsAt]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIdx(emblaApi.selectedScrollSnap());
      setSnapCount(emblaApi.scrollSnapList().length);
    };
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi]);

  const rows = Math.max(1, Math.ceil(products.length / cols));
  const rowSpy = useRowHighlight(rows);

  const tabIds = tabs.map((t) => t.id);
  const goPrev = isCarousel
    ? scrollPrev
    : () => {
        if (!hasTabs) return;
        const idx = tabIds.indexOf(effectiveTabId ?? '');
        setActiveTab(idx > 0 ? tabIds[idx - 1] : tabIds[tabIds.length - 1]);
      };
  const goNext = isCarousel
    ? scrollNext
    : () => {
        if (!hasTabs) return;
        const idx = tabIds.indexOf(effectiveTabId ?? '');
        setActiveTab(idx < tabIds.length - 1 ? tabIds[idx + 1] : tabIds[0]);
      };

  // Hide when nothing to show or the deal has expired
  const expired = endsAt
    ? remaining !== null &&
      remaining.days === 0 &&
      remaining.hours === 0 &&
      remaining.minutes === 0 &&
      remaining.seconds === 0
    : false;
  if (effectiveProductIds.length === 0 || expired) return null;
  if (!isLoading && products.length === 0) return null;

  return (
    <section className="bg-muted/20 dark:bg-card/20">
      <div className="mx-auto max-w-screen-2xl px-2 py-8 sm:px-3 sm:py-10 lg:px-4 lg:py-14">
        {/* Header row */}
        <div className="border-border mb-6 border-b pb-3">
          {/* Top: Title + Timer */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
            <h2 className="text-heading-md text-foreground relative flex items-center gap-2 font-bold">
              <Zap className="fill-primary text-primary h-5 w-5" />
              {isBn && titleBn ? titleBn : title || t('flashDeal')}
              <span className="bg-primary absolute -bottom-[13px] left-0 h-0.5 w-16" />
            </h2>
            <div className="flex items-center gap-2 sm:gap-3">
              <CapsuleTimer remaining={remaining} />
              <div className="flex items-center gap-1.5 sm:gap-2">
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
            </div>
          </div>

          {/* Tabs below title — scrollable on mobile */}
          {hasTabs && (
            <div className="mt-3 flex gap-1.5 overflow-x-auto scrollbar-hide py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    (activeTab ?? tabs[0].id) === tab.id
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isBn && tab.labelBn ? tab.labelBn : tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Products */}
        {isLoading ? (
          <div
            className={cn(
              'grid gap-3',
              cols === 2 && 'grid-cols-2',
              cols === 3 && 'grid-cols-2 sm:grid-cols-3',
              cols === 4 && 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
              cols === 5 && 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
              cols === 6 && 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
            )}
          >
            {[...Array(Math.min(cols, 6))].map((_, i) => (
              <div key={i} className="bg-muted h-72 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : isCarousel ? (
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="min-w-0 shrink-0 grow-0 basis-1/2 pr-3 sm:basis-1/3 lg:basis-1/5"
                >
                  <FlashDealCard product={product} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'grid gap-3',
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
                ref={rowSpy.setRowRef(Math.floor(i / cols))}
              >
                <FlashDealCard product={product} />
              </div>
            ))}
          </div>
        )}

        {/* Footer: dots (left) + See More (right) */}
        <div className="mt-6 flex items-center justify-between">
          <SectionDots
            count={isCarousel ? snapCount : rows}
            active={isCarousel ? selectedIdx : rowSpy.activeRow}
            onSelect={isCarousel ? (p) => emblaApi?.scrollTo(p) : undefined}
          />
          <Link
            href="/flash-deals"
            className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
          >
            {t('seeMore')}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
