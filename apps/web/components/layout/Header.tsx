'use client';

import { Heart, Menu, ShoppingCart, User, ChevronRight, Package } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { MegaMenuItem } from '@/components/layout/MegaMenu';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { Logo } from '@/components/shared/Logo';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCatalog';
import { ICON_MAP } from '@/lib/icon-map';
import { type MenuItem, DEFAULT_MENU_CONFIG } from '@/lib/menu-config';
import { cn } from '@/lib/utils';
import { useCartCount } from '@/stores/useCartStore';
import { useUIStore } from '@/stores/useUIStore';

const SearchCommand = dynamic(
  () => import('@/components/store/SearchCommand').then((mod) => ({ default: mod.SearchCommand })),
  { ssr: false }
);

type MenuConfig = { mainMenu: MenuItem[]; mobileMenu: MenuItem[] };

export function Header({
  variant = 'floating',
  logoLight,
  logoDark,
  menuConfig,
  locale = 'en',
}: {
  variant?: 'floating' | 'full';
  logoLight?: string;
  logoDark?: string;
  menuConfig?: MenuConfig;
  locale?: string;
} = {}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cartCount = useCartCount();
  const openCart = useUIStore((s) => s.openCart);
  const { user } = useAuth();
  const isFull = variant === 'full';

  const mainMenu = menuConfig?.mainMenu ?? DEFAULT_MENU_CONFIG.mainMenu;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    const [path, query] = href.split('?');
    if (query) return false;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <>
      <div className="relative z-50">
        <div
          className={
            isFull
              ? 'border-primary/10 bg-primary/5 dark:bg-primary/10 w-full border-b backdrop-blur-md'
              : 'mx-auto max-w-screen-2xl px-2 pt-1 sm:px-3 lg:px-4'
          }
        >
          <header
            className={cn(
              'flex items-center justify-between px-3 py-1 transition-all duration-300',
              isFull ? 'mx-auto max-w-screen-2xl sm:px-3 lg:px-4' : 'rounded-[24px] border',
              !isFull && scrolled
                ? 'bg-background/80 border-white/20 shadow-lg shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:shadow-black/20'
                : !isFull
                  ? 'bg-background/60 border-white/10 backdrop-blur-md dark:border-white/5'
                  : ''
            )}
          >
            {/* Left: Logo + Desktop Nav — no extra padding around logo for compact look */}
            <div className="flex items-center gap-1 sm:gap-3 lg:gap-6">
              <Logo size="sm" className="" lightSrc={logoLight} darkSrc={logoDark} />

              {/* Desktop Navigation — configurable menu items */}
              <nav className="hidden items-center gap-1 lg:flex">
                {mainMenu.map((item) => {
                  const hasChildren = (item.children?.length ?? 0) > 0;
                  const itemLabel = locale === 'bn' && item.labelBn ? item.labelBn : item.label;

                  // Simple link items
                  if (!hasChildren) {
                    const href =
                      item.type === 'category' && item.categoryId
                        ? `/products?category=${item.categoryId}`
                        : item.href || '#';
                    const active = isActive(href);
                    const NavIcon = ICON_MAP[item.icon ?? ''];
                    return (
                      <Link
                        key={item.id}
                        href={href}
                        target={item.openInNewTab ? '_blank' : undefined}
                        className={cn(
                          'flex items-center gap-1 rounded-full px-4 py-1 text-sm font-medium transition-all duration-200',
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                        )}
                      >
                        {NavIcon && <NavIcon className="h-4 w-4" />}
                        {itemLabel}
                      </Link>
                    );
                  }

                  // Items with children → MegaMenu dropdown
                  return (
                    <MegaMenuItem
                      key={item.id}
                      item={item}
                      isActive={isActive(item.href || '#')}
                      locale={locale}
                    />
                  );
                })}
              </nav>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              {/* Search — single mount; internal styles are responsive for all breakpoints */}
              <SearchCommand />

              {/* Track Order — desktop (hidden below md/768px to keep header compact on mobile) */}
              <Link
                href="/tracking"
                className="border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground hidden items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors md:flex"
              >
                <Package className="h-3.5 w-3.5" />
                Track Order
              </Link>

              {/* Wishlist — desktop only (bottom nav has it on mobile) */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden rounded-full md:flex"
                aria-label="Wishlist"
                asChild
              >
                <Link href="/wishlist">
                  <Heart className="h-3.5 w-3.5" />
                </Link>
              </Button>

              {/* Cart — desktop only (bottom nav + FloatingCart handle it on mobile) */}
              <Button
                variant="ghost"
                size="icon"
                className="relative hidden rounded-full md:flex"
                aria-label="Cart"
                onClick={openCart}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                {cartCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground absolute -right-0.5 -top-0.5 flex h-4 w-4 min-w-0 items-center justify-center rounded-full p-0 text-[10px]">
                    {cartCount > 99 ? '99+' : cartCount}
                  </Badge>
                )}
              </Button>

              {/* Language + Theme — desktop */}
              <div className="hidden items-center gap-1 md:flex">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>

              {/* Account — Sign In button (desktop) */}
              <Link
                href={user ? '/account' : '/login'}
                className="border-border bg-muted/30 text-foreground hover:bg-accent/50 hover:text-foreground hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all md:flex"
              >
                {user ? (
                  <>
                    <UserAvatar image={user.image} name={user.name} size="sm" />
                    <span className="max-w-[80px] truncate">{user.name.split(' ')[0]}</span>
                  </>
                ) : (
                  <>
                    <User className="h-3.5 w-3.5" />
                    <span>Sign In</span>
                  </>
                )}
              </Link>

              {/* Language + Theme — mobile */}
              <div className="flex items-center gap-0.5 sm:hidden">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>

              {/* Mobile Menu Trigger */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full lg:hidden"
                    aria-label="Menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <MobileNav
                    onClose={() => setMobileMenuOpen(false)}
                    menuConfig={menuConfig}
                    locale={locale}
                    logoLight={logoLight}
                    logoDark={logoDark}
                  />
                </SheetContent>
              </Sheet>
            </div>
          </header>
        </div>
      </div>
    </>
  );
}

/* ──────────── Mobile Navigation (off-canvas) ──────────── */
function MobileNav({
  onClose,
  menuConfig,
  locale = 'en',
  logoLight,
  logoDark,
}: {
  onClose: () => void;
  menuConfig?: MenuConfig;
  locale?: string;
  logoLight?: string;
  logoDark?: string;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'moderator';
  const { data } = useCategories();
  const allCategories = data?.data ?? [];

  const mobileMenu = menuConfig?.mobileMenu ?? DEFAULT_MENU_CONFIG.mobileMenu;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    const [path, query] = href.split('?');
    if (query) return false;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const resolveHref = (item: MenuItem): string => {
    if (item.type === 'category' && item.categoryId) {
      const cat = allCategories.find((c) => c.id === item.categoryId);
      return cat ? `/products?category=${cat.slug}` : '#';
    }
    return item.href || '#';
  };

  const resolveLabel = (item: MenuItem): string => {
    if (item.type === 'category' && item.categoryId) {
      const cat = allCategories.find((c) => c.id === item.categoryId);
      if (cat) return cat.name;
    }
    if (locale === 'bn' && item.labelBn) return item.labelBn;
    return item.label;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header — Sheet provides its own close button, no duplicate needed */}
      <div className="border-border flex items-center border-b px-3 py-2">
        <Link href="/" onClick={onClose} className="text-foreground text-lg font-bold">
          <Logo size="sm" href="" lightSrc={logoLight} darkSrc={logoDark} />
        </Link>
      </div>

      {/* Menu items */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {mobileMenu.map((item) => (
            <MobileMenuItem
              key={item.id}
              item={item}
              locale={locale}
              onClose={onClose}
              resolveHref={resolveHref}
              resolveLabel={resolveLabel}
              isActive={isActive}
              allCategories={allCategories}
              depth={0}
            />
          ))}
        </div>
      </nav>

      {/* User info */}
      {user && (
        <div className="border-border border-t px-4 py-3">
          <div className="flex items-center gap-3">
            <UserAvatar image={user.image} name={user.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="text-muted-foreground truncate text-xs">{user.email}</p>
            </div>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={onClose}
                className="bg-primary/10 text-primary shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="border-border border-t p-4">
        <div className="flex flex-col gap-2">
          <Link
            href={user ? '/account' : '/login'}
            onClick={onClose}
            className="text-foreground hover:bg-accent flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
          >
            <User className="h-4 w-4" />
            {user ? 'My Account' : 'Sign In'}
          </Link>
          <Link
            href="/wishlist"
            onClick={onClose}
            className="text-foreground hover:bg-accent flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
          >
            <Heart className="h-4 w-4" />
            Wishlist
          </Link>
          <Link
            href="/tracking"
            onClick={onClose}
            className="text-foreground hover:bg-accent flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
          >
            <Package className="h-4 w-4" />
            Track Order
          </Link>
          <div className="flex items-center gap-2 px-3 pt-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────── Mobile Menu Item (accordion for dropdowns) ──────────── */
function MobileMenuItem({
  item,
  locale,
  onClose,
  resolveHref,
  resolveLabel,
  isActive,
  allCategories,
  depth,
}: {
  item: MenuItem;
  locale: string;
  onClose: () => void;
  resolveHref: (item: MenuItem) => string;
  resolveLabel: (item: MenuItem) => string;
  isActive: (href: string) => boolean;
  allCategories: Array<{ id: string; name: string; slug: string; image: string | null }>;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = (item.children?.length ?? 0) > 0;
  const label = resolveLabel(item);
  const href = resolveHref(item);
  const active = isActive(href);
  const MenuIcon = ICON_MAP[item.icon ?? ''];

  if (!hasChildren) {
    return (
      <Link
        href={href}
        target={item.openInNewTab ? '_blank' : undefined}
        onClick={onClose}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          depth > 0 && 'ml-4',
          active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent'
        )}
      >
        {MenuIcon && <MenuIcon className="h-4 w-4 shrink-0" />}
        <span>{label}</span>
      </Link>
    );
  }

  // Has children → accordion
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
          depth > 0 && 'ml-4',
          'text-foreground hover:bg-accent'
        )}
      >
        {MenuIcon && <MenuIcon className="h-4 w-4 shrink-0" />}
        <span className="flex-1">{label}</span>
        <ChevronRight
          className={cn(
            'text-muted-foreground h-4 w-4 transition-transform duration-200',
            expanded && 'rotate-90'
          )}
        />
      </button>
      {expanded && (
        <div className="border-border ml-3 mt-0.5 space-y-0.5 border-l pl-3">
          {item.children!.map((child) => (
            <MobileMenuItem
              key={child.id}
              item={child}
              locale={locale}
              onClose={onClose}
              resolveHref={resolveHref}
              resolveLabel={resolveLabel}
              isActive={isActive}
              allCategories={allCategories}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
