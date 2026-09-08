'use client';

import {
  Menu,
  User,
  Package,
  MapPin,
  Heart,
  LogOut,
  Truck,
  Settings,
  LayoutDashboard,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { DashboardErrorBoundary } from '@/components/account/ErrorBoundary';
import { ProfileHero } from '@/components/account/ProfileHero';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { Container } from '@/components/shared/Layout';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth, useSignOut } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import { cn } from '@/lib/utils';

function AccountSidebar({
  pathname,
  onSignOut,
  role,
}: {
  pathname: string;
  onSignOut: () => void;
  role?: string;
}) {
  const t = useTranslations('account');
  const links = [
    { href: '/account', label: t('overview'), icon: User },
    { href: '/account/orders', label: t('orders'), icon: Package },
    { href: '/account/addresses', label: t('addresses'), icon: MapPin },
    { href: '/wishlist', label: t('wishlist'), icon: Heart },
    { href: '/account/settings', label: t('settings'), icon: Settings },
    { href: '/tracking', label: t('trackOrder'), icon: Truck },
    ...(role === 'admin'
      ? [{ href: '/admin', label: t('adminDashboard'), icon: LayoutDashboard }]
      : []),
  ];

  return (
    <nav className="space-y-0.5">
      {links.map((link) => {
        const isActive =
          link.href === '/account'
            ? pathname === '/account' || pathname === '/en/account'
            : pathname.startsWith(link.href) || pathname.startsWith(`/en${link.href}`);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{link.label}</span>
          </Link>
        );
      })}

      <div className="bg-border my-2 h-px" />

      <button
        className="text-muted-foreground hover:bg-destructive/5 hover:text-destructive flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        onClick={onSignOut}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span>{t('signOut')}</span>
      </button>
    </nav>
  );
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('account');
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: ordersRes } = useOrders();
  const handleSignOut = useSignOut('/');
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <AuthGuard>
      <section className="section-padding from-background to-muted/20 bg-gradient-to-b">
        <Container size="xl">
          {/* Mobile Header */}
          <div className="mb-3 flex items-center justify-end lg:hidden">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <button
                  className="border-border bg-card text-muted-foreground hover:bg-muted flex h-9 w-9 items-center justify-center rounded-lg border transition-colors"
                  aria-label="Open navigation"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4">
                <SheetHeader className="p-0 pb-3">
                  <SheetTitle className="text-left text-sm">{t('accountMenu')}</SheetTitle>
                </SheetHeader>
                <AccountSidebar
                  pathname={pathname}
                  onSignOut={() => {
                    setSheetOpen(false);
                    handleSignOut();
                  }}
                  role={user?.role}
                />
              </SheetContent>
            </Sheet>
          </div>

          {/* ProfileHero spans full width above sidebar+content grid */}
          <ProfileHero />

          <div className="mt-4 flex flex-col gap-6 lg:grid lg:grid-cols-[200px_1fr]">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <AccountSidebar pathname={pathname} onSignOut={handleSignOut} role={user?.role} />
              </div>
            </aside>

            {/* Main Content */}
            <div className="min-w-0">
              <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
            </div>
          </div>
        </Container>
      </section>
    </AuthGuard>
  );
}
