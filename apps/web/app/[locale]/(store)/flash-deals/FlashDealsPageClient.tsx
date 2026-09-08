'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Zap, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, useCallback } from 'react';

import { useFlashDealProducts, type FlashDealProduct } from '@/hooks/useProducts';
import { cn, formatPrice } from '@/lib/utils';

import type { FlashDealTab } from '@/lib/home-config';

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
        <div className="from-muted/30 via-muted/50 to-muted/80 relative aspect-square overflow-hidden bg-gradient-to-br">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
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
        <div className="space-y-1.5 p-3">
          <h3 className="text-foreground group-hover:text-primary line-clamp-2 text-[13px] font-medium leading-snug">
            {product.name}
          </h3>
          <div className="flex items-center gap-1.5 text-xs">
            {product.compareAtPrice && (
              <span className="text-red-500 line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
            <span className="text-foreground text-base font-bold">
              {formatPrice(product.price)}
            </span>
            {discount > 0 && (
              <span className="font-semibold text-emerald-600">
                Save {formatPrice(savedAmount)}
              </span>
            )}
          </div>
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

function CapsuleTimer({ remaining }: { remaining: Remaining }) {
  if (!remaining) return null;
  const units = [
    { v: remaining.days, l: 'Days' },
    { v: remaining.hours, l: 'Hours' },
    { v: remaining.minutes, l: 'Min' },
    { v: remaining.seconds, l: 'Sec' },
  ];

  return (
    <div className="border-primary/20 bg-primary/5 flex items-center gap-1.5 rounded-full border px-3 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
      {units.map((unit, i) => (
        <div key={i} className="flex items-center gap-1 sm:gap-1.5">
          <span className="bg-primary min-w-[1.75rem] rounded-full px-2 py-0.5 text-center text-xs font-bold tabular-nums text-white sm:min-w-[2rem] sm:px-2.5 sm:py-1 sm:text-sm">
            {String(unit.v).padStart(2, '0')}
          </span>
          <span className="text-muted-foreground text-[10px] font-medium sm:text-xs">{unit.l}</span>
          {i < units.length - 1 && <span className="text-primary/40">:</span>}
        </div>
      ))}
    </div>
  );
}

type FlashDealsPageClientProps = {
  title: string;
  titleBn: string;
  endsAt: string;
  tabs: FlashDealTab[];
  productIds: string[];
};

export function FlashDealsPageClient({
  title,
  titleBn,
  endsAt,
  tabs,
  productIds,
}: FlashDealsPageClientProps) {
  const t = useTranslations('home');
  const locale = useLocale();
  const isBn = locale === 'bn';

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const hasTabs = tabs.length > 0;
  const effectiveTabId = activeTab ?? tabs[0]?.id ?? null;
  const effectiveProductIds = hasTabs
    ? (tabs.find((tab) => tab.id === effectiveTabId)?.productIds ?? tabs[0]?.productIds ?? [])
    : productIds;

  const { products, isLoading } = useFlashDealProducts(effectiveProductIds);

  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', slidesToScroll: 4 });
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

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

  return (
    <div className="mx-auto max-w-screen-2xl px-2 py-8 sm:px-3 lg:px-4">
      {/* Back link */}
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      {/* Header */}
      <div className="border-border mb-8 border-b pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-foreground flex items-center gap-2 text-xl font-bold sm:text-2xl">
              <Zap className="fill-primary text-primary h-5 w-5 sm:h-6 sm:w-6" />
              {isBn && titleBn ? titleBn : title || t('flashDeal')}
            </h1>

            {hasTabs && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors sm:px-4 sm:py-1.5 sm:text-sm',
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

          <div className="flex items-center gap-2 sm:gap-3">
            <CapsuleTimer remaining={remaining} />
            <div className="hidden items-center gap-1.5 sm:flex">
              <button
                onClick={scrollPrev}
                aria-label="Previous"
                className="border-border text-muted-foreground hover:border-primary hover:text-primary flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={scrollNext}
                aria-label="Next"
                className="border-border text-muted-foreground hover:border-primary hover:text-primary flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-muted h-72 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-muted-foreground py-20 text-center">
          No flash deal products available.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {products.map((product) => (
            <FlashDealCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
