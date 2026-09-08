'use client';

import { Filter, X, ChevronDown, Loader2, Search } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Container, Section } from '@/components/shared/Layout';
import { ProductCard } from '@/components/store/ProductCard';
import { ProductFilters } from '@/components/store/ProductFilters';
import { Button } from '@/components/ui/button';
import { PremiumButton } from '@/components/ui/PremiumButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useInfiniteProducts } from '@/hooks/useProducts';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
] as const;

const PER_PAGE = 20;

type Filters = {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
};

export function ProductsPageClient({
  cardStyle = 'default',
}: {
  cardStyle?: 'default' | 'compact';
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL is the single source of truth — links from the header/home update
  // searchParams, which re-derives filters here (no stale duplicated state).
  const filters = useMemo<Filters>(
    () => ({
      category: searchParams.get('category') ?? undefined,
      brand: searchParams.get('brand') ?? undefined,
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      sort: searchParams.get('sort') ?? undefined,
    }),
    [searchParams]
  );

  const search = searchParams.get('q') ?? undefined;
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteProducts({
      limit: PER_PAGE,
      category: filters.category,
      brand: filters.brand,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      sort: (filters.sort as 'newest' | 'price_asc' | 'price_desc' | 'rating') ?? undefined,
      search,
    });

  const visibleProducts = useMemo(() => (data?.pages ?? []).flatMap((page) => page.data), [data]);
  const total = data?.pages[0]?.meta?.total ?? 0;
  const hasMore = hasNextPage ?? false;
  const loadingMore = isFetchingNextPage;

  // Infinite scroll — fetch the next server page when the sentinel is visible
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, fetchNextPage]);

  const updateUrl = useCallback(
    (newFilters: Filters) => {
      const params = new URLSearchParams();
      if (newFilters.category) params.set('category', newFilters.category);
      if (newFilters.brand) params.set('brand', newFilters.brand);
      if (newFilters.minPrice) params.set('minPrice', String(newFilters.minPrice));
      if (newFilters.maxPrice) params.set('maxPrice', String(newFilters.maxPrice));
      if (newFilters.sort) params.set('sort', newFilters.sort);
      if (search) params.set('q', search);
      router.push(`/products?${params.toString()}`);
    },
    [router, search]
  );

  const handleFilterChange = (newFilters: Filters) => {
    updateUrl(newFilters);
  };

  const handleReset = () => {
    router.push('/products');
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) fetchNextPage();
  };

  return (
    <Section>
      <Container>
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-heading-xl font-bold">
              {search ? `Results for “${search}”` : 'All Products'}
            </h1>
            <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {total} items
            </span>
          </div>
          <div className="mt-2 h-1 w-16 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300" />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Desktop sidebar filters */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Filters</span>
                <button
                  onClick={handleReset}
                  className="text-muted-foreground hover:text-primary text-xs transition-colors"
                >
                  Clear all
                </button>
              </div>
              <ProductFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleReset}
              />
            </div>
          </aside>

          {/* Mobile filter sheet */}
          <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
            <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0">
              <SheetHeader className="border-border border-b px-5 py-4">
                <SheetTitle className="text-sm font-semibold">Filters</SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto p-5">
                <ProductFilters
                  filters={filters}
                  onFilterChange={(f) => {
                    handleFilterChange(f);
                    setMobileFilterOpen(false);
                  }}
                  onReset={() => {
                    handleReset();
                    setMobileFilterOpen(false);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Main */}
          <div className="min-w-0 flex-1">
            {/* Toolbar */}
            <div className="border-border/70 bg-card mb-6 flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 shadow-sm">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-full lg:hidden"
                  onClick={() => setMobileFilterOpen(true)}
                >
                  <Filter className="h-3.5 w-3.5" /> Filters
                </Button>
                {filters.category && (
                  <span className="hidden items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium capitalize text-emerald-600 sm:inline-flex dark:text-emerald-400">
                    {filters.category}{' '}
                    <button
                      aria-label="Remove category filter"
                      onClick={() => handleFilterChange({ ...filters, category: undefined })}
                    >
                      <X className="ml-0.5 h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.brand && (
                  <span className="hidden items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium capitalize text-emerald-600 sm:inline-flex dark:text-emerald-400">
                    {filters.brand}{' '}
                    <button
                      aria-label="Remove brand filter"
                      onClick={() => handleFilterChange({ ...filters, brand: undefined })}
                    >
                      <X className="ml-0.5 h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground hidden text-xs sm:inline">
                  {visibleProducts.length} of {total}
                </span>
                <Select
                  value={filters.sort ?? 'newest'}
                  onValueChange={(value) => handleFilterChange({ ...filters, sort: value })}
                >
                  <SelectTrigger className="h-9 w-[130px] rounded-full text-xs sm:w-[160px]">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product grid — 4 columns on desktop, 3 on tablet, 2 on mobile */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-lg font-semibold">Failed to load products</p>
                <p className="text-muted-foreground mt-2 text-sm">Please try again later.</p>
                <PremiumButton
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </PremiumButton>
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="text-muted-foreground/30 h-10 w-10" />
                <p className="mt-4 text-lg font-semibold">No products found</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Try adjusting your filters or search terms.
                </p>
                <PremiumButton variant="outline" className="mt-4" onClick={handleReset}>
                  Clear Filters
                </PremiumButton>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
                  {visibleProducts.map((product) => (
                    <ProductCard key={product.id} product={product} variant={cardStyle} />
                  ))}
                </div>

                {/* Load more trigger */}
                {hasMore && (
                  <div ref={sentinelRef} className="mt-8 flex flex-col items-center gap-3">
                    <PremiumButton
                      variant="outline"
                      size="sm"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="gap-2"
                    >
                      {loadingMore ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {loadingMore
                        ? 'Loading...'
                        : `Load More (${total - visibleProducts.length} remaining)`}
                    </PremiumButton>
                    <span className="text-muted-foreground text-[10px]">
                      Showing {visibleProducts.length} of {total} products
                    </span>
                  </div>
                )}

                {!hasMore && visibleProducts.length > PER_PAGE && (
                  <div className="mt-8 text-center">
                    <p className="text-muted-foreground text-xs">All {total} products loaded</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="bg-card overflow-hidden rounded-2xl border">
      <Skeleton className="aspect-square w-full" />
      <div className="space-y-2 p-3 sm:p-4">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      </div>
    </div>
  );
}
