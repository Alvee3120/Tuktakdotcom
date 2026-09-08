'use client';

import { useLocale, useTranslations } from 'next-intl';

import { ProductCard } from '@/components/store/ProductCard';
import { useRelatedProducts } from '@/hooks/useProducts';

type RelatedProductsProps = {
  slug: string;
  limit?: number;
};

export function RelatedProducts({ slug, limit = 8 }: RelatedProductsProps) {
  const t = useTranslations('products');
  const locale = useLocale();
  const { data, isLoading } = useRelatedProducts(slug, limit);
  const products = data?.data ?? [];

  if (isLoading || products.length === 0) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-heading-md text-foreground font-semibold">
        {locale === 'bn' ? 'আপনার পছন্দ হতে পারে' : 'You May Also Like'}
      </h2>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
