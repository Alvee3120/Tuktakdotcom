'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, ShoppingCart, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAddToCart } from '@/hooks/useAddToCart';
import { useCategories } from '@/hooks/useCatalog';
import { useProductsByIds, type Product } from '@/hooks/useProducts';
import { cn, formatPrice } from '@/lib/utils';

import type { ShowcaseTab } from '@/lib/home-config';

type CategoryShowcaseProps = {
  title?: string;
  titleBn?: string;
  subtitle?: string;
  subtitleBn?: string;
  featureImage?: string;
  featureTitle?: string;
  featureTitleBn?: string;
  featureDesc?: string;
  featureDescBn?: string;
  featureCta?: string;
  featureCtaBn?: string;
  featureLink?: string;
  tabs: ShowcaseTab[];
  productIds: string[];
  style?: 'spotlight' | 'carousel';
};

function chunkFour(products: Product[]): Product[][] {
  const groups: Product[][] = [];
  for (let i = 0; i < products.length; i += 4) groups.push(products.slice(i, i + 4));
  return groups;
}

function ProductRow({ product }: { product: Product }) {
  const { add, isAdded } = useAddToCart();
  return (
    <Link
      href={`/products/${product.slug}`}
      className="hover:bg-muted/40 group flex items-center gap-4 px-4 py-3 transition-all"
    >
      <div className="bg-muted relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="80px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h4 className="text-foreground group-hover:text-primary line-clamp-2 text-sm font-semibold leading-snug">
          {product.name}
        </h4>
        <div className="flex items-center gap-2">
          {product.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-muted-foreground text-xs font-medium">
                {product.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-foreground text-sm font-bold">{formatPrice(product.price)}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-muted-foreground text-xs line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
      {product.stock > 0 && (
        <button
          onClick={(e) =>
            add(
              {
                productId: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                image: product.image,
              },
              e
            )
          }
          aria-label="Add to cart"
          className={cn(
            'flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all',
            isAdded(product.id)
              ? 'bg-success text-white'
              : 'bg-primary hover:bg-primary/90 text-white'
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">Add</span>
        </button>
      )}
    </Link>
  );
}

function ProductColumn({ title, productIds }: { title: string; productIds: string[] }) {
  const { products, isLoading } = useProductsByIds(productIds);
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', loop: products.length > 3 });
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setHasPrev(emblaApi.canScrollPrev());
    setHasNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  if (productIds.length === 0) return null;

  return (
    <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
      <div className="border-border flex items-center justify-between border-b px-5 py-3">
        <h3 className="text-foreground text-base font-bold">{title}</h3>
        <div className="hidden items-center gap-1.5 sm:flex">
          <button
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!hasPrev}
            aria-label="Previous"
            className="border-border text-muted-foreground hover:border-primary hover:text-primary flex h-7 w-7 items-center justify-center rounded-full border transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            disabled={!hasNext}
            aria-label="Next"
            className="border-border text-muted-foreground hover:border-primary hover:text-primary flex h-7 w-7 items-center justify-center rounded-full border transition-colors disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex flex-col">
          {isLoading
            ? [...Array(Math.min(productIds.length, 3))].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <div className="bg-muted h-20 w-20 shrink-0 animate-pulse rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
                    <div className="bg-muted h-3 w-1/2 animate-pulse rounded" />
                  </div>
                </div>
              ))
            : products.map((product) => (
                <div key={product.id} className="min-w-0 shrink-0 grow-0 basis-full">
                  <ProductRow product={product} />
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

export function CategoryShowcase({
  title,
  titleBn,
  subtitle,
  subtitleBn,
  featureImage,
  featureTitle,
  featureTitleBn,
  featureDesc,
  featureDescBn,
  featureCta,
  featureCtaBn,
  featureLink,
  tabs = [],
  productIds,
  style = 'spotlight',
}: CategoryShowcaseProps) {
  const t = useTranslations('home');
  const locale = useLocale();
  const isBn = locale === 'bn';
  const { products, isLoading } = useProductsByIds(productIds);
  const { data: catData } = useCategories();
  const categoryMap = useMemo(
    () => new Map((catData?.data ?? []).map((c) => [c.id, c.name])),
    [catData]
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start' });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const sync = () => {
      setSnaps(emblaApi.scrollSnapList());
      onSelect();
    };
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', sync);
    const raf = requestAnimationFrame(sync);
    return () => {
      cancelAnimationFrame(raf);
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', sync);
    };
  }, [emblaApi, onSelect]);

  if (productIds.length === 0) return null;
  if (!isLoading && products.length === 0) return null;

  const displayTitle = isBn && titleBn ? titleBn : title;
  const displaySubtitle = isBn && subtitleBn ? subtitleBn : subtitle;

  const heading = (
    <h2 className="text-heading-md text-foreground relative inline-block font-bold">
      {displayTitle || t('showcase')}
      <span className="from-primary to-primary/60 absolute -bottom-2 left-0 h-1 w-24 rounded-full bg-gradient-to-r" />
    </h2>
  );

  // ── Carousel variant: feature hero + custom tab columns ──
  if (style === 'carousel') {
    const displayFeatureTitle = isBn && featureTitleBn ? featureTitleBn : featureTitle;
    const displayFeatureDesc = isBn && featureDescBn ? featureDescBn : featureDesc;
    const displayFeatureCta = isBn && featureCtaBn ? featureCtaBn : featureCta;

    // Use admin tabs if configured, otherwise fall back to splitting productIds
    const validTabs = tabs.filter((tab) => tab.productIds.length > 0);
    const fallbackTabs =
      validTabs.length > 0
        ? validTabs
        : productIds.length > 0
          ? [
              {
                id: 'col1',
                label: isBn ? 'শীর্ষ রেটিং' : 'Top Rated',
                productIds: productIds.slice(0, Math.ceil(productIds.length / 2)),
              },
              {
                id: 'col2',
                label: isBn ? 'শীর্ষ পণ্য' : 'Top Items',
                productIds: productIds.slice(Math.ceil(productIds.length / 2)),
              },
            ]
          : [];

    return (
      <section className="from-muted/30 to-background dark:from-card/30 relative overflow-hidden bg-gradient-to-b">
        <div className="mx-auto max-w-screen-2xl px-2 py-8 sm:px-3 sm:py-10 lg:px-4 lg:py-14">
          <div className="mb-8">
            {heading}
            {displaySubtitle && (
              <p className="text-muted-foreground mt-2 text-sm">{displaySubtitle}</p>
            )}
          </div>

          {isLoading ? (
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="bg-muted h-96 animate-pulse rounded-2xl lg:col-span-2" />
              <div className="grid grid-cols-2 gap-4 lg:col-span-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-muted h-28 animate-pulse rounded-xl" />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-5">
              {/* Left: Feature hero card */}
              <div className="bg-primary relative overflow-hidden rounded-2xl lg:col-span-2">
                <div className="relative aspect-[4/5] w-full sm:aspect-[3/4]">
                  {featureImage ? (
                    <Image
                      src={featureImage}
                      alt={displayFeatureTitle ?? ''}
                      fill
                      sizes="(max-width:1024px) 90vw, 40vw"
                      className="object-cover"
                    />
                  ) : products[0] ? (
                    <Image
                      src={products[0].image}
                      alt={products[0].name}
                      fill
                      sizes="(max-width:1024px) 90vw, 40vw"
                      className="object-cover"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center p-6 text-center text-white sm:p-8">
                  <h3 className="text-2xl font-bold sm:text-3xl">
                    {displayFeatureTitle ||
                      (isBn ? 'স্বাস্থ্যবিধি মেনে চলুন' : 'Stay Fit. Stay Healthy.')}
                  </h3>
                  {displayFeatureDesc && (
                    <p className="mt-2 max-w-xs text-sm text-white/80">{displayFeatureDesc}</p>
                  )}
                  <Link
                    href={featureLink || '/products'}
                    className="text-foreground mt-4 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-white/90"
                  >
                    {displayFeatureCta || (isBn ? 'এখনই কিনুন' : 'Explore Now')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Right: custom tab columns */}
              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3">
                {fallbackTabs.map((tab) => (
                  <ProductColumn
                    key={tab.id}
                    title={isBn && tab.labelBn ? tab.labelBn : tab.label}
                    productIds={tab.productIds}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  // ── Spotlight variant (default) ──
  const spotlight = products[0];
  const rest = products.slice(1);
  const groups = chunkFour(rest);

  return (
    <section className="from-muted/30 to-background dark:from-card/30 relative overflow-hidden bg-gradient-to-b">
      <div className="bg-primary/10 pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl" />
      <div className="bg-primary/10 pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-screen-2xl px-2 py-8 sm:px-3 sm:py-10 lg:px-4 lg:py-14">
        <div className="mb-8">{heading}</div>

        {isLoading ? (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="bg-muted h-96 animate-pulse rounded-2xl lg:col-span-2" />
            <div className="grid grid-cols-2 gap-4 lg:col-span-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-muted h-28 animate-pulse rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-5">
            {spotlight ? (
              <Spotlight product={spotlight} />
            ) : featureImage ? (
              <div className="relative overflow-hidden rounded-2xl lg:col-span-2">
                <div className="relative aspect-[4/5] w-full">
                  <Image
                    src={featureImage}
                    alt={title ?? 'Featured'}
                    fill
                    sizes="(max-width:1024px) 90vw, 40vw"
                    className="object-cover"
                  />
                </div>
              </div>
            ) : null}

            {rest.length > 0 && (
              <div className="lg:col-span-3">
                <div className="overflow-hidden" ref={emblaRef}>
                  <div className="flex">
                    {groups.map((group) => (
                      <div key={group[0].id} className="min-w-0 shrink-0 grow-0 basis-full">
                        <div className="grid gap-4 sm:grid-cols-2">
                          {group.map((product) => (
                            <ShowcaseCell
                              key={product.id}
                              product={product}
                              category={
                                product.categoryId ? categoryMap.get(product.categoryId) : undefined
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {snaps.length > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-1.5">
                    {snaps.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => emblaApi?.scrollTo(i)}
                        aria-label={`Go to page ${i + 1}`}
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          i === selectedIndex ? 'bg-primary w-5' : 'bg-muted-foreground/30 w-1.5'
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Spotlight({ product }: { product: Product }) {
  const { add, isAdded } = useAddToCart();
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="border-border bg-card group relative flex flex-col overflow-hidden rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl lg:col-span-2"
    >
      <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-xl">
        <div className="bg-primary/10 pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl" />
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width:1024px) 90vw, 40vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.rating > 0 && (
          <div className="border-border/60 bg-background/85 text-foreground absolute left-3 top-3 flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur-md">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            {product.rating.toFixed(1)}
          </div>
        )}
        {discount > 0 && (
          <div className="bg-primary absolute right-3 top-3 flex h-12 w-12 flex-col items-center justify-center rounded-full text-white shadow-md">
            <span className="text-xs font-extrabold leading-none">{discount}%</span>
            <span className="text-[8px] font-medium leading-tight">off</span>
          </div>
        )}
      </div>
      <h3 className="text-foreground group-hover:text-primary mt-4 line-clamp-2 text-base font-bold">
        {product.name}
      </h3>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-foreground text-lg font-bold">{formatPrice(product.price)}</span>
        {product.compareAtPrice && product.compareAtPrice > product.price && (
          <span className="text-muted-foreground text-sm line-through">
            {formatPrice(product.compareAtPrice)}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="bg-primary group-hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors">
          View <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
        {product.stock > 0 && (
          <button
            onClick={(e) =>
              add(
                {
                  productId: product.id,
                  slug: product.slug,
                  name: product.name,
                  price: product.price,
                  image: product.image,
                },
                e
              )
            }
            aria-label="Add to cart"
            className={cn(
              'border-border flex h-10 w-10 items-center justify-center rounded-lg border transition-all',
              isAdded(product.id)
                ? 'bg-success text-white'
                : 'text-muted-foreground hover:border-primary hover:text-primary'
            )}
          >
            {isAdded(product.id) ? (
              <Check className="h-4 w-4" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </Link>
  );
}

function ShowcaseCell({ product, category }: { product: Product; category?: string }) {
  const { add, isAdded } = useAddToCart();

  return (
    <Link
      href={`/products/${product.slug}`}
      className="border-border bg-card hover:border-primary/40 group relative flex items-center gap-3 overflow-hidden rounded-xl border p-3 pl-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="bg-primary/60 absolute left-0 top-0 h-full w-1 transition-all group-hover:w-1.5" />
      <div className="bg-muted relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="64px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {category && (
          <span className="text-muted-foreground truncate text-[10px] uppercase tracking-wide">
            {category}
          </span>
        )}
        <h3 className="text-primary line-clamp-2 text-xs font-semibold leading-snug">
          {product.name}
        </h3>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="text-foreground text-sm font-bold">{formatPrice(product.price)}</span>
          {product.stock > 0 && (
            <button
              onClick={(e) =>
                add(
                  {
                    productId: product.id,
                    slug: product.slug,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                  },
                  e
                )
              }
              aria-label="Add to cart"
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all',
                isAdded(product.id)
                  ? 'bg-success text-white'
                  : 'bg-muted text-muted-foreground hover:bg-primary hover:text-white'
              )}
            >
              {isAdded(product.id) ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <ShoppingCart className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
