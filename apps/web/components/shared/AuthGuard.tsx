'use client';

import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';

type AuthGuardProps = {
  children: React.ReactNode;
  /** Optional role restriction — only allow users with this role */
  requiredRole?: 'admin' | 'moderator' | 'customer';
};

/**
 * Auth Guard — wraps pages that require authentication.
 * Redirects to login if the user isn't authenticated.
 * Preserves the current locale and the original URL for post-login redirect.
 */
export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Preserve locale: /en/checkout → /en/login?redirect=/en/checkout
      // `useLocale()` is used instead of parsing the pathname because
      // `localePrefix: 'as-needed'` drops the prefix for the default locale
      // (e.g. `/account`, not `/en/account`) — parsing would misread the first
      // segment and build a broken `/account/login` URL.
      router.push(`/${locale}/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (requiredRole && user && user.role !== requiredRole && user.role !== 'admin') {
      router.push(`/${locale}`);
      return;
    }
  }, [isAuthenticated, isLoading, user, requiredRole, router, pathname, locale]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-body-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-body-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (requiredRole && user && user.role !== requiredRole && user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-heading-md font-semibold">Access Denied</p>
        <p className="text-body-md text-muted-foreground mt-2">
          You don&apos;t have permission to access this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
