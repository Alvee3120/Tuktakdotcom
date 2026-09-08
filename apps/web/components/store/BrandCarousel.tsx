'use client';

import Image from 'next/image';
import Link from 'next/link';

import { useBrands } from '@/hooks/useCatalog';

import type { BrandCarouselItem } from '@/lib/home-config';

const FALLBACK = ['Apple', 'Samsung', 'Sony', 'Xiaomi', 'Dell', 'HP', 'Asus', 'Logitech'];

type Brand = { key: string; name: string; slug: string; logo: string | null; href?: string };

export function BrandCarousel({
  style = 'carousel',
  adminBrands = [],
}: { style?: 'carousel' | 'grid'; adminBrands?: BrandCarouselItem[] } = {}) {
  const { data } = useBrands();
  const brands = data?.data ?? [];

  let items: Brand[];
  if (adminBrands.length > 0) {
    items = adminBrands.map((b) => ({
      key: b.id,
      name: b.name,
      slug: b.slug,
      logo: b.logo || null,
      href: b.href,
    }));
  } else if (brands.length > 0) {
    items = brands.map((b) => ({ key: b.id, name: b.name, slug: b.slug, logo: b.logo }));
  } else {
    items = FALLBACK.map((name) => ({ key: name, name, slug: name.toLowerCase(), logo: null }));
  }

  const brandHref = (brand: Brand) => brand.href || `/products?brand=${brand.slug}`;

  // Duplicate items for seamless marquee loop (3x for wide screens)
  const tripled = [...items, ...items, ...items];

  const brandInner = (brand: Brand, idx: number) =>
    brand.logo ? (
      <div key={`${brand.key}-${idx}`} className="relative h-8 w-24 shrink-0 sm:h-10 sm:w-28">
        <Image src={brand.logo} alt={brand.name} fill sizes="112px" className="object-contain" />
      </div>
    ) : (
      <span
        key={`${brand.key}-${idx}`}
        className="text-muted-foreground shrink-0 text-lg font-bold tracking-tight"
      >
        {brand.name}
      </span>
    );

  // Static grid variant
  if (style === 'grid') {
    return (
      <section className="border-border border-t">
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-center gap-x-10 gap-y-6 px-2 py-8 sm:px-3 sm:py-10 lg:px-4 lg:py-14">
          {items.map((brand) => (
            <Link
              key={brand.key}
              href={brandHref(brand)}
              className="flex items-center justify-center opacity-50 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
            >
              {brandInner(brand, 0)}
            </Link>
          ))}
        </div>
      </section>
    );
  }

  // Marquee variant — full width infinite loop with fade on both sides
  return (
    <section className="border-border overflow-hidden border-t">
      <div className="relative px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        {/* Left fade */}
        <div className="from-background pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r to-transparent sm:w-24" />
        {/* Right fade */}
        <div className="from-background pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l to-transparent sm:w-24" />

        <div className="animate-marquee flex w-max">
          {tripled.map((brand, i) => (
            <Link
              key={`${brand.key}-marquee-${i}`}
              href={brandHref(brand)}
              className="flex shrink-0 items-center justify-center px-5 opacity-40 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 sm:px-8"
            >
              {brandInner(brand, i)}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
