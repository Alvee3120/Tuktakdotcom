'use client';

import { useTranslations } from 'next-intl';

import { Container, Section } from '@/components/shared/Layout';
import { ProductCard } from '@/components/store/ProductCard';
import { useRecentlyViewedStore } from '@/stores/useRecentlyViewedStore';

export function RecentlyViewedSection() {
  const t = useTranslations('recentlyViewed');
  const items = useRecentlyViewedStore((s) => s.items);

  if (items.length === 0) return null;

  return (
    <Section className="bg-muted/20">
      <Container>
        <h2 className="text-heading-md mb-6 font-bold">{t('title')}</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.slice(0, 4).map((item) => (
            <ProductCard
              key={item.id}
              product={{
                id: item.id,
                slug: item.slug,
                name: item.name,
                price: item.price,
                image: item.image ?? '/placeholder-product.svg',
                compareAtPrice: null,
                rating: 0,
                reviewCount: 0,
                stock: 1,
              }}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}
