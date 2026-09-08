import { Container, Section } from '@/components/shared/Layout';
import { Skeleton } from '@/components/ui/skeleton';

function ProductSkeleton() {
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

export default function ProductsLoading() {
  return (
    <Section>
      <Container>
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48" />
              <div className="mt-2">
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-10 w-40 rounded-lg" />
          </div>

          {/* Grid skeleton */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
