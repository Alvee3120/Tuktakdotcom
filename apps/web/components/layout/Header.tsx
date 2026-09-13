'use client';

import { ChevronRight, Heart, Menu, Package, ShoppingCart, User, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { MegaMenuItem } from '@/components/layout/MegaMenu';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { Logo } from '@/components/shared/Logo';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCatalog';
import { ICON_MAP } from '@/lib/icon-map';
import { type MenuItem, DEFAULT_MENU_CONFIG } from '@/lib/menu-config';
import { cn, formatPrice } from '@/lib/utils';
import { useCartCount, useCartTotal } from '@/stores/useCartStore';
import { useUIStore } from '@/stores/useUIStore';

const SearchCommand = dynamic(
  () => import('@/components/store/SearchCommand').then((mod) => ({ default: mod.SearchCommand })),
  { ssr: false }
);

type MenuConfig = { mainMenu: MenuItem[]; mobileMenu: MenuItem[] };

export function Header({
  logoLight,
  logoDark,
  menuConfig,
  locale = 'en',
}: {
  logoLight?: string;
  logoDark?: string;
  menuConfig?: MenuConfig;
  locale?: string;
} = {}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Desktop: nav re-opened via the hamburger while scrolled.
  const [navOpen, setNavOpen] = useState(false);
  const cartCount = useCartCount();
  const cartTotal = useCartTotal();
  const openCart = useUIStore((s) => s.openCart);
  const { user } = useAuth();

  const mainMenu = menuConfig?.mainMenu ?? DEFAULT_MENU_CONFIG.mainMenu;

  // Hysteresis: collapse after scrolling well past the top, but only re-expand
  // near it. A single threshold oscillates — collapsing the nav shrinks the
  // sticky header, which shifts the scroll anchor and nudges scrollY back under
  // the threshold, so the header blinks rapidly around it.
  useEffect(() => {
    const COLLAPSE_AT = 80;
    const EXPAND_AT = 24;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled((prev) => (prev ? y > EXPAND_AT : y > COLLAPSE_AT));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Navigating closes the re-opened nav so the next page starts collapsed.
  // Adjusted during render (React's recommended alternative to a syncing effect).
  const [navPath, setNavPath] = useState(pathname);
  if (navPath !== pathname) {
    setNavPath(pathname);
    setNavOpen(false);
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    const [path, query] = href.split('?');
    if (query) return false;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const showNav = !scrolled || navOpen;

  return (
    <div className="sticky top-0 z-50 [overflow-anchor:none]">
      {/* ── Bar 1: brand color ──
           Mobile: hamburger (left) · logo (center) · search icon + cart (right)
           Desktop: [hamburger] · logo · centered search box · account · wishlist · cart */}
      <div className="bg-primary text-white">
        <div className="relative mx-auto flex h-14 max-w-screen-2xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
          {/* Left group — mobile menu trigger, desktop nav toggle + logo */}
          <div className="flex shrink-0 items-center gap-1">
            {/* Mobile menu (hamburger) — left on phones/tablets */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  aria-label="Open menu"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
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

            {/* Desktop nav re-open toggle — only once scrolled */}
            {scrolled && (
              <button
                onClick={() => setNavOpen((v) => !v)}
                aria-label={navOpen ? 'Hide menu' : 'Show menu'}
                aria-expanded={navOpen}
                className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 lg:flex"
              >
                {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}

            {/* Desktop logo */}
            <div className="hidden shrink-0 lg:block">
              <Logo size="sm" onDark lightSrc={logoLight} darkSrc={logoDark} />
            </div>
          </div>

          {/* Mobile logo — absolutely centred in the bar */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:hidden">
            <Logo size="sm" onDark lightSrc={logoLight} darkSrc={logoDark} />
          </div>

          {/* Desktop: search box, centred between logo and actions */}
          <div className="hidden min-w-0 flex-1 justify-center px-4 lg:flex">
            <div className="w-full max-w-xl">
              <SearchCommand />
            </div>
          </div>

          {/* Right group — mobile: search icon + cart; desktop: account + wishlist + cart */}
          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5">
            {/* Mobile search icon — opens the search dialog (no box) */}
            <SearchCommand variant="icon" enableShortcut={false} className="lg:hidden" />

            {/* Account — desktop only */}
            <Link
              href={user ? '/account' : '/login'}
              className="hidden items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:px-2 lg:flex"
            >
              {user ? (
                <>
                  <UserAvatar image={user.image} name={user.name} size="sm" />
                  <span className="hidden max-w-[80px] truncate sm:inline">
                    {user.name.split(' ')[0]}
                  </span>
                </>
              ) : (
                <>
                  <User className="h-5 w-5" />
                  <span className="hidden sm:inline">Log in</span>
                </>
              )}
            </Link>

            {/* Wishlist — desktop only */}
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="hidden h-9 w-9 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 lg:flex"
            >
              <Heart className="h-5 w-5" />
            </Link>

            {/* Cart — icon (mobile) / icon + running total (desktop) */}
            <button
              onClick={openCart}
              aria-label="Cart"
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:px-2"
            >
              <span className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="bg-background text-primary absolute -right-1.5 -top-1.5 flex h-4 w-4 min-w-0 items-center justify-center rounded-full p-0 text-[10px]">
                    {cartCount > 99 ? '99+' : cartCount}
                  </Badge>
                )}
              </span>
              <span className="hidden whitespace-nowrap tabular-nums lg:inline">
                {formatPrice(cartTotal)}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Bar 2: light nav — desktop only, collapses once scrolled ── */}
      <div
        className={cn(
          'border-border bg-background hidden border-b transition-[grid-template-rows] duration-300 lg:grid',
          showNav ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <nav className="mx-auto flex max-w-screen-2xl items-center justify-center gap-1 px-4 py-1.5">
            {mainMenu.map((item) => {
              const hasChildren = (item.children?.length ?? 0) > 0;
              const itemLabel = locale === 'bn' && item.labelBn ? item.labelBn : item.label;

              if (!hasChildren) {
                const href =
                  item.type === 'category' && item.categoryId
                    ? `/products?category=${item.categoryId}`
                    : item.href || '#';
                const NavIcon = ICON_MAP[item.icon ?? ''];
                return (
                  <Link
                    key={item.id}
                    href={href}
                    target={item.openInNewTab ? '_blank' : undefined}
                    className={cn(
                      'flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200',
                      isActive(href)
                        ? 'text-primary'
                        : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {NavIcon && <NavIcon className="h-4 w-4" />}
                    {itemLabel}
                  </Link>
                );
              }

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
      </div>
    </div>
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
