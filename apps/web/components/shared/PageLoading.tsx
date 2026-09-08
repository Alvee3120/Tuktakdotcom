'use client';

import { useEffect, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { CreativeLoader, SLOW_THRESHOLD_MS } from './CreativeLoader';

interface PageLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  className?: string;
}

export function PageLoading({ loading, children, skeleton, className }: PageLoadingProps) {
  const [showCreative, setShowCreative] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowCreative(false);
      return;
    }
    const timer = setTimeout(() => setShowCreative(true), SLOW_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  if (!loading) return <>{children}</>;

  return (
    <div className={cn('relative', className)}>
      {skeleton ?? (
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      )}
      {showCreative && (
        <div className="bg-background/60 absolute inset-0 flex items-center justify-center backdrop-blur-sm">
          <CreativeLoader loading={true} />
        </div>
      )}
    </div>
  );
}

export { SLOW_THRESHOLD_MS as PAGE_LOADING_THRESHOLD };
