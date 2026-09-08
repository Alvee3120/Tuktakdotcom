import { Container, Section } from '@/components/shared/Layout';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductDetailLoading() {
  return (
    <Section>
      <Container>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </Container>
    </Section>
  );
}
