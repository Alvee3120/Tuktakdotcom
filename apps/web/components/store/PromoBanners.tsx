import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { PromoBannerItem } from '@/lib/home-config';

type PromoBannersProps = {
  style?: 'twoCol' | 'stacked';
  items?: PromoBannerItem[];
};

export async function PromoBanners({ style = 'twoCol', items = [] }: PromoBannersProps) {
  const t = await getTranslations('home.promos');

  // Use admin-configured banners, fall back to i18n defaults if empty
  const banners =
    items.length > 0
      ? items.map((item) => ({
          title: item.title || t('one.title'),
          desc: item.desc || t('one.desc'),
          href: item.href || '/products',
          image: item.image || '/categories/laptops.svg',
          accentColor: item.accentColor,
        }))
      : [
          {
            title: t('one.title'),
            desc: t('one.desc'),
            href: '/products?category=laptops',
            image: '/categories/laptops.svg',
            accentColor: undefined,
          },
          {
            title: t('two.title'),
            desc: t('two.desc'),
            href: '/products?category=smartwatches',
            image: '/categories/smartwatches.svg',
            accentColor: undefined,
          },
        ];

  return (
    <section className="mx-auto max-w-screen-2xl px-2 py-8 sm:px-3 sm:py-10 lg:px-4 lg:py-14">
      <div className={style === 'stacked' ? 'grid grid-cols-1 gap-6' : 'grid gap-6 md:grid-cols-2'}>
        {banners.map((banner, idx) => (
          <Link
            key={`${banner.title}-${idx}`}
            href={banner.href}
            className={
              style === 'stacked'
                ? 'bg-muted group relative flex min-h-[260px] items-center overflow-hidden rounded-2xl p-10 sm:p-16'
                : 'bg-muted group relative flex min-h-[240px] items-center overflow-hidden rounded-xl p-8 sm:p-12'
            }
          >
            {/* Background image */}
            {banner.image && (
              <div className="absolute inset-0 z-0">
                <Image
                  src={banner.image}
                  alt={banner.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
                {/* Accent color overlay */}
                {banner.accentColor && (
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{ backgroundColor: banner.accentColor }}
                  />
                )}
              </div>
            )}

            {/* Content */}
            <div className="relative z-10 max-w-full sm:max-w-[60%]">
              <h3
                className={
                  style === 'stacked'
                    ? 'text-heading-md font-bold text-white'
                    : 'text-heading-sm font-bold text-white'
                }
              >
                {banner.title}
              </h3>
              <p className="mt-1 text-sm text-white/80">{banner.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-white group-hover:text-white/90">
                Shop Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
