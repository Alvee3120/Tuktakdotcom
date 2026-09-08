'use client';

import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

import { PremiumButton } from '@/components/ui/PremiumButton';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      {/* Error Icon */}
      <div className="bg-destructive/10 flex h-20 w-20 items-center justify-center rounded-full">
        <AlertTriangle className="text-destructive h-10 w-10" />
      </div>

      {/* Title */}
      <h1 className="text-heading-lg text-foreground mt-6 font-bold">Something went wrong</h1>

      {/* Description */}
      <p className="text-body-md text-muted-foreground mt-2 max-w-md">
        An unexpected error occurred. Please try again or return to the homepage.
      </p>

      {/* Error details (dev only) */}
      {process.env.NODE_ENV === 'development' && error.message && (
        <pre className="bg-muted text-muted-foreground mt-4 max-w-lg overflow-auto rounded-lg p-4 text-left text-xs">
          {error.message}
        </pre>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <PremiumButton variant="primary" className="gap-2" onClick={reset}>
          <RefreshCw className="h-4 w-4" />
          Try Again
        </PremiumButton>
        <Link href="/">
          <PremiumButton variant="ghost" className="gap-2">
            <Home className="h-4 w-4" />
            Go Home
          </PremiumButton>
        </Link>
      </div>
    </div>
  );
}
