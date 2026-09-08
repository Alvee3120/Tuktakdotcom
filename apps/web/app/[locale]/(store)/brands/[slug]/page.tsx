'use client';

import { ArrowLeft, Package, SlidersHorizontal } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Container, Section } from '@/components/shared/Layout';
import { ProductCard } from '@/components/store/ProductCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Skeleton } from '@/components/ui/skeleton';
import { useBrand } from '@/hooks/useCatalog';
import { useProducts } from '@/hooks/useProducts';

export default function BrandPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';

  const { data: brandRes, isLoading: loadingBrand, isError: brandError } = useBrand(slug);
  const { data: productsRes, isLoading: loadingProducts } = useProducts({ brand: slug, limit: 24 });

  const brand = brandRes?.data;
  const products = productsRes?.data ?? [];
  const total = productsRes?.meta?.total ?? 0;

  if (brandError) {
    return (
      <Section>
        <Container>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="text-muted-foreground/40 h-12 w-12" />
            <p className="text-heading-md mt-3 font-semibold">Brand not found</p>
            <Link href="/products">
              <PremiumButton variant="outline" className="mt-4">
                Browse all products
              </PremiumButton>
            </Link>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section>
      <Container>
        {/* Breadcrumb */}
        <Link
          href="/products"
          className="text-body-xs text-muted-foreground hover:text-primary mb-4 inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          All products
        </Link>

        {/* Brand header */}
        <div className="border-border bg-card mb-8 flex items-center gap-4 rounded-2xl border p-6">
          {loadingBrand ? (
            <>
              <Skeleton className="h-16 w-16 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </>
          ) : (
            <>
              <div className="bg-muted relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl">
                {brand?.logo ? (
                  <Image src={brand.logo} alt={brand.name} fill className="object-contain p-2" />
                ) : (
                  <span className="text-heading-md text-primary font-bold">
                    {brand?.name?.charAt(0) ?? '?'}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-heading-lg font-bold">{brand?.name}</h1>
                <p className="text-body-sm text-muted-foreground">
                  {total} product{total === 1 ? '' : 's'} available
                </p>
              </div>
              <Link href={`/products?brand=${slug}`} className="ml-auto hidden sm:block">
                <PremiumButton variant="outline" size="sm">
                  <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                  Filter & sort
                </PremiumButton>
              </Link>
            </>
          )}
        </div>

        {/* Product grid */}
        {loadingProducts ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="text-muted-foreground/40 h-10 w-10" />
            <p className="text-body-sm mt-3 font-medium">No products from this brand yet</p>
            <Link href="/products">
              <PremiumButton variant="outline" size="sm" className="mt-4">
                Browse all products
              </PremiumButton>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </Container>
    </Section>
  );
}
