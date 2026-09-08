import { Skeleton } from '@/components/ui/skeleton';

function ProductCardSkeleton() {
  return (
    <div className="rounded-card-lg border-border bg-card overflow-hidden border">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function SectionGridSkeleton({ cols = 4 }: { cols?: number }) {
  const colClasses =
    cols === 6
      ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
      : cols === 5
        ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  return (
    <div className={`grid gap-3 sm:gap-4 ${colClasses}`}>
      {Array.from({ length: cols }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function StoreLoading() {
  return (
    <div className="mx-auto w-full max-w-screen-2xl px-2 sm:px-3 lg:px-4">
      {/* Hero */}
      <div className="pt-4">
        <Skeleton className="h-[360px] w-full rounded-3xl sm:h-[420px] lg:h-[470px]" />
      </div>

      {/* Category circles */}
      <div className="flex items-center gap-3 py-8 sm:py-10">
        <Skeleton className="hidden h-9 w-9 rounded-full md:block" />
        <div className="flex flex-1 justify-between gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex w-1/6 flex-col items-center gap-1.5">
              <Skeleton className="aspect-square w-full max-w-[100px] rounded-full" />
              <Skeleton className="h-3 w-3/4 rounded-full" />
            </div>
          ))}
        </div>
        <Skeleton className="hidden h-9 w-9 rounded-full md:block" />
      </div>

      {/* Product sections */}
      <div className="space-y-10 pb-8 sm:space-y-14">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="mb-6 space-y-2">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-3 w-36" />
            </div>
            <SectionGridSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
