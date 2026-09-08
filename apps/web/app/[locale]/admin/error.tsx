'use client';

import { RefreshCw, LayoutDashboard, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    console.error('[ADMIN] Page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="bg-destructive/10 flex h-14 w-14 items-center justify-center rounded-full">
        <AlertTriangle className="text-destructive h-7 w-7" />
      </div>
      <h2 className="text-foreground text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground max-w-sm text-sm">
        An unexpected error occurred while loading this page. Try again or return to the dashboard.
      </p>
      <div className="flex items-center gap-2 pt-2">
        <Button variant="default" onClick={reset}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
        <Button variant="outline" onClick={() => router.push(`/${locale}/admin`)}>
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Button>
      </div>
    </div>
  );
}
