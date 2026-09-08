'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { useCategories } from '@/hooks/useCatalog';
import { cn } from '@/lib/utils';

type Circle = {
  name: string;
  slug: string;
  image: string;
};

const FALLBACK: Circle[] = [
  { name: 'Smartphones', slug: 'smartphones', image: '/categories/smartphones.svg' },
  { name: 'Laptops', slug: 'laptops', image: '/categories/laptops.svg' },
  { name: 'Audio', slug: 'audio', image: '/categories/audio.svg' },
  { name: 'Tablets', slug: 'tablets', image: '/categories/tablets.svg' },
  { name: 'Smartwatches', slug: 'smartwatches', image: '/categories/smartwatches.svg' },
  { name: 'Accessories', slug: 'accessories', image: '/categories/accessories.svg' },
];

export function CategoryCircles({
  style = 'circle',
  visibleCount = 6,
}: {
  style?: 'circle' | 'card';
  visibleCount?: number;
}) {
  const { data } = useCategories();
  const apiCategories = data?.data ?? [];
  const isCard = style === 'card';

  const circles: Circle[] =
    apiCategories.length > 0
      ? apiCategories
          .filter((c) => !c.parentId)
          .slice(0, 20)
          .map((c) => ({
            name: c.name,
            slug: c.slug,
            image: c.image ?? `/categories/${c.slug}.svg`,
          }))
      : FALLBACK;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    slidesToScroll: 1,
    containScroll: 'trimSnaps',
    loop: circles.length > visibleCount,
  });
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

  // Visible per view: derives slide width from admin setting so changes actually resize
  const getSlideClass = (count: number) => {
    // Mobile always 2, tablet 3, desktop respects count
    const map: Record<number, string> = {
      3: 'w-1/2 sm:w-1/3 md:w-1/3 lg:w-1/3 xl:w-1/3',
      4: 'w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/4 xl:w-1/4',
      5: 'w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 xl:w-1/5',
      6: 'w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 xl:w-1/6',
      7: 'w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 xl:w-[14.2857%]',
      8: 'w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 xl:w-[12.5%]',
    };
    return map[count] ?? map[6];
  };
  const slideClass = getSlideClass(Math.max(3, Math.min(8, visibleCount)));

  return (
    <section className="mx-auto max-w-screen-2xl px-2 py-8 sm:px-3 sm:py-10 lg:px-4 lg:py-14">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Prev arrow - hidden on mobile */}
        {circles.length > visibleCount && (
          <button
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!hasPrev}
            aria-label="Previous categories"
            className="border-border bg-background text-muted-foreground hover:border-primary hover:text-primary hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-md transition-colors disabled:opacity-30 md:flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Carousel */}
        <div className="min-w-0 flex-1 overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {circles.map((cat) => (
              <div
                key={cat.slug}
                className={cn('min-w-0 shrink-0 grow-0 px-1.5 sm:px-2', slideClass)}
              >
                <Link
                  href={`/products?category=${cat.slug}`}
                  className={cn(
                    'group flex',
                    isCard
                      ? 'border-border bg-card flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md'
                      : 'flex-col items-center gap-1.5 text-center sm:gap-2'
                  )}
                >
                  {isCard ? (
                    <>
                      <div className="bg-muted relative aspect-[4/3] w-full overflow-hidden">
                        <Image
                          src={cat.image}
                          alt={cat.name}
                          fill
                          sizes="128px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <span className="text-foreground group-hover:text-primary truncate px-2 py-2 text-center text-xs font-semibold sm:py-2.5 sm:text-sm">
                        {cat.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="bg-muted group-hover:ring-primary/30 relative mx-auto aspect-square w-full max-w-[80px] items-center justify-center overflow-hidden rounded-full transition-transform duration-300 group-hover:scale-105 group-hover:ring-2 sm:max-w-[100px] md:max-w-[120px] lg:max-w-[140px]">
                        <Image
                          src={cat.image}
                          alt={cat.name}
                          fill
                          sizes="140px"
                          className="object-cover"
                        />
                      </div>
                      <span className="text-foreground group-hover:text-primary mt-0.5 line-clamp-1 text-xs font-semibold sm:mt-1 sm:text-sm">
                        {cat.name}
                      </span>
                    </>
                  )}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Next arrow - hidden on mobile */}
        {circles.length > visibleCount && (
          <button
            onClick={() => emblaApi?.scrollNext()}
            disabled={!hasNext}
            aria-label="Next categories"
            className="border-border bg-background text-muted-foreground hover:border-primary hover:text-primary hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-md transition-colors disabled:opacity-30 md:flex"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}
