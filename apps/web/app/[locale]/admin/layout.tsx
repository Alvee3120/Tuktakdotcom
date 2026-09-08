'use client';

import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Tag,
  FolderTree,
  Receipt,
  Star as StarIcon,
  PlusCircle,
  Image as ImageIcon,
  List,
  MessageSquareText,
  UserCircle,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  Search,
  LogOut,
  ExternalLink,
  FileText,
  Mail,
  Layers,
  Send,
  Warehouse,
  ShieldAlert,
  Calculator,
  LayoutTemplate,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { useTheme } from '@/components/providers/ThemeProviderWrapper';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { Logo } from '@/components/shared/Logo';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth, useSignOut } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// `permission` maps a menu item to a moderator permission key (MODERATOR_PAGES).
// '*' = visible to admin AND moderator; missing = admin-only (hidden for moderators).
type SidebarLink = {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  accent: string;
  permission?: string;
};
const sidebarSections: { titleKey: string; links: SidebarLink[] }[] = [
  {
    titleKey: 'overview',
    links: [
      {
        href: '/admin',
        labelKey: 'dashboard',
        icon: LayoutDashboard,
        accent: 'emerald',
        permission: '*',
      },
    ],
  },
  {
    titleKey: 'catalog',
    links: [
      {
        href: '/admin/products',
        labelKey: 'productList',
        icon: List,
        accent: 'blue',
        permission: 'products',
      },
      {
        href: '/admin/products/add',
        labelKey: 'addProducts',
        icon: PlusCircle,
        accent: 'lime',
        permission: 'products',
      },
      {
        href: '/admin/products/media',
        labelKey: 'productMedia',
        icon: ImageIcon,
        accent: 'pink',
        permission: 'products',
      },
      {
        href: '/admin/categories',
        labelKey: 'categories',
        icon: FolderTree,
        accent: 'rose',
        permission: 'categories',
      },
      { href: '/admin/brands', labelKey: 'brand', icon: StarIcon, accent: 'fuchsia' },
      {
        href: '/admin/reviews',
        labelKey: 'productReviews',
        icon: MessageSquareText,
        accent: 'orange',
        permission: 'reviews',
      },
    ],
  },
  {
    titleKey: 'sales',
    links: [
      {
        href: '/admin/orders',
        labelKey: 'orderManagement',
        icon: ShoppingCart,
        accent: 'sky',
        permission: 'orders',
      },
      {
        href: '/admin/transactions',
        labelKey: 'transaction',
        icon: Receipt,
        accent: 'cyan',
        permission: 'transactions',
      },
      {
        href: '/admin/coupon',
        labelKey: 'couponCode',
        icon: Tag,
        accent: 'amber',
        permission: 'coupon',
      },
      { href: '/admin/fraud', labelKey: 'fraudProtection', icon: ShieldAlert, accent: 'red' },
    ],
  },
  {
    titleKey: 'people',
    links: [
      {
        href: '/admin/customers',
        labelKey: 'customers',
        icon: Users,
        accent: 'violet',
        permission: 'customers',
      },
      {
        href: '/admin/contact',
        labelKey: 'messages',
        icon: Mail,
        accent: 'indigo',
        permission: 'contact',
      },
      { href: '/admin/newsletter', labelKey: 'newsletter', icon: Send, accent: 'sky' },
    ],
  },
  {
    titleKey: 'operations',
    links: [
      {
        href: '/admin/inventory',
        labelKey: 'inventoryManagement',
        icon: Warehouse,
        accent: 'teal',
        permission: 'inventory',
      },
      { href: '/admin/accounting', labelKey: 'accounting', icon: Calculator, accent: 'lime' },
    ],
  },
  {
    titleKey: 'content',
    links: [
      { href: '/admin/appearance', labelKey: 'appearance', icon: LayoutTemplate, accent: 'purple' },
      { href: '/admin/hero', labelKey: 'heroSlides', icon: Layers, accent: 'violet' },
      {
        href: '/admin/blog',
        labelKey: 'blogPosts',
        icon: FileText,
        accent: 'indigo',
        permission: 'blog',
      },
    ],
  },
  {
    titleKey: 'system',
    links: [
      { href: '/admin/moderators', labelKey: 'moderators', icon: Shield, accent: 'orange' },
      { href: '/admin/admin-role', labelKey: 'adminRole', icon: UserCircle, accent: 'fuchsia', permission: '*' },
      { href: '/admin/settings', labelKey: 'controlAuthority', icon: Settings, accent: 'slate' },
    ],
  },
];

/**
 * Per-accent styles (static class strings so Tailwind can see them).
 * active  — gradient pill behind the current page's menu item
 * icon    — colorful icon tint for inactive items (pops in dark mode)
 * hover   — soft tinted hover background matching the accent
 */
const ACCENTS: Record<string, { active: string; icon: string; hover: string }> = {
  emerald: {
    active:
      'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30 dark:shadow-emerald-500/20',
    icon: 'text-emerald-500 dark:text-emerald-400',
    hover: 'hover:bg-emerald-500/10',
  },
  sky: {
    active:
      'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-md shadow-sky-500/30 dark:shadow-sky-500/20',
    icon: 'text-sky-500 dark:text-sky-400',
    hover: 'hover:bg-sky-500/10',
  },
  violet: {
    active:
      'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md shadow-violet-500/30 dark:shadow-violet-500/20',
    icon: 'text-violet-500 dark:text-violet-400',
    hover: 'hover:bg-violet-500/10',
  },
  amber: {
    active:
      'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 dark:shadow-amber-500/20',
    icon: 'text-amber-500 dark:text-amber-400',
    hover: 'hover:bg-amber-500/10',
  },
  rose: {
    active:
      'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/30 dark:shadow-rose-500/20',
    icon: 'text-rose-500 dark:text-rose-400',
    hover: 'hover:bg-rose-500/10',
  },
  cyan: {
    active:
      'bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-md shadow-cyan-500/30 dark:shadow-cyan-500/20',
    icon: 'text-cyan-500 dark:text-cyan-400',
    hover: 'hover:bg-cyan-500/10',
  },
  fuchsia: {
    active:
      'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-md shadow-fuchsia-500/30 dark:shadow-fuchsia-500/20',
    icon: 'text-fuchsia-500 dark:text-fuchsia-400',
    hover: 'hover:bg-fuchsia-500/10',
  },
  lime: {
    active:
      'bg-gradient-to-r from-lime-500 to-green-500 text-white shadow-md shadow-lime-500/30 dark:shadow-lime-500/20',
    icon: 'text-lime-600 dark:text-lime-400',
    hover: 'hover:bg-lime-500/10',
  },
  pink: {
    active:
      'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/30 dark:shadow-pink-500/20',
    icon: 'text-pink-500 dark:text-pink-400',
    hover: 'hover:bg-pink-500/10',
  },
  blue: {
    active:
      'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/30 dark:shadow-blue-500/20',
    icon: 'text-blue-500 dark:text-blue-400',
    hover: 'hover:bg-blue-500/10',
  },
  orange: {
    active:
      'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30 dark:shadow-orange-500/20',
    icon: 'text-orange-500 dark:text-orange-400',
    hover: 'hover:bg-orange-500/10',
  },
  teal: {
    active:
      'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/30 dark:shadow-teal-500/20',
    icon: 'text-teal-500 dark:text-teal-400',
    hover: 'hover:bg-teal-500/10',
  },
  indigo: {
    active:
      'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30 dark:shadow-indigo-500/20',
    icon: 'text-indigo-500 dark:text-indigo-400',
    hover: 'hover:bg-indigo-500/10',
  },
  purple: {
    active:
      'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-md shadow-purple-500/30 dark:shadow-purple-500/20',
    icon: 'text-purple-500 dark:text-purple-400',
    hover: 'hover:bg-purple-500/10',
  },
  red: {
    active:
      'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md shadow-red-500/30 dark:shadow-red-500/20',
    icon: 'text-red-500 dark:text-red-400',
    hover: 'hover:bg-red-500/10',
  },
  slate: {
    active:
      'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-md shadow-slate-500/30 dark:shadow-slate-500/20',
    icon: 'text-slate-500 dark:text-slate-400',
    hover: 'hover:bg-slate-500/10',
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const t = useTranslations('admin.nav');
  const tHeader = useTranslations('admin.header');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const handleSignOut = useSignOut(`/${locale}/login`);

  const isStaff = !!user && (user.role === 'admin' || user.role === 'moderator');

  // Moderator granted permission keys (from /api/admin/me). Admins need none.
  const { data: me } = useQuery({
    queryKey: ['admin', 'me'],
    queryFn: async () => {
      const res = await fetch('/api/admin/me', { credentials: 'include' });
      if (!res.ok) return null;
      const json = (await res.json().catch(() => null)) as {
        data?: { permissions?: string[] };
      } | null;
      return json?.data ?? null;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Server-side-esque access control: redirect anonymous users to login and
  // non-staff accounts back to the storefront. The API independently enforces
  // role + permissions (requireRole/requirePermission), so this is UX hardening.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(`/${locale}/login`);
      return;
    }
    if (!isStaff) {
      router.replace(`/${locale}`);
    }
  }, [isLoading, isAuthenticated, isStaff, locale, router]);

  const granted = user?.role === 'admin' ? null : new Set(me?.permissions ?? []);
  const canSee = (link: SidebarLink) => {
    if (user?.role === 'admin') return true;
    // '*' = visible to both admin AND moderator (e.g. Dashboard)
    if (link.permission === '*') return true;
    if (!link.permission) return false;
    return granted?.has(link.permission) ?? false;
  };

  if (isLoading || !isStaff) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <span className="border-border border-t-primary h-8 w-8 animate-spin rounded-full border-2" />
      </div>
    );
  }

  const isActiveLink = (href: string) => {
    const cleanPath = pathname.replace(/^\/[a-z]{2}/, '');
    if (href === '/admin') return cleanPath === '/admin' || cleanPath === '/admin/';
    return cleanPath.startsWith(href);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    router.push(q ? `/admin/products?search=${encodeURIComponent(q)}` : '/admin/products');
  };

  const sidebar = (
    <aside className="bg-card border-border flex h-full w-[220px] flex-col border-r">
      {/* Logo */}
      <div className="border-border flex h-14 items-center gap-2 border-b px-5">
        <Logo size="sm" showText={false} href="/admin" />
        <button
          className="text-muted-foreground/70 hover:text-muted-foreground ml-auto hidden lg:block"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sidebarSections.map((section) => {
          const visibleLinks = section.links.filter(canSee);
          if (visibleLinks.length === 0) return null;
          return (
            <div key={section.titleKey}>
              <p className="text-muted-foreground/70 mb-2 px-3 text-[11px] font-medium uppercase tracking-wider">
                {t(section.titleKey)}
              </p>
              <div className="space-y-0.5">
                {visibleLinks.map((link) => {
                  const isActive = isActiveLink(link.href);
                  const Icon = link.icon;
                  const accent = ACCENTS[link.accent] ?? ACCENTS.emerald;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all',
                        isActive
                          ? accent.active
                          : cn('text-muted-foreground hover:text-foreground', accent.hover)
                      )}
                    >
                      <Icon
                        className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : accent.icon)}
                      />
                      <span className="truncate">{t(link.labelKey)}</span>
                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-white/80" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User profile at bottom */}
      <div className="border-border space-y-2 border-t px-3 py-3">
        <div className="flex items-center gap-2.5 px-2">
          <UserAvatar image={user?.image} name={user?.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-xs font-medium">{user?.name || 'Tuktak'}</p>
            <p className="text-muted-foreground/70 truncate text-[10px]">
              {user?.email || 'admin@tuktak.com'}
            </p>
          </div>
          <button
            className="text-muted-foreground/70 hover:text-red-500"
            onClick={handleSignOut}
            aria-label={t('logout')}
            title={t('logout')}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
        <Link
          href="/"
          className="text-muted-foreground hover:bg-muted/50 hover:text-foreground flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>{t('yourShop')}</span>
          <ExternalLink className="ml-auto h-3 w-3" />
        </Link>
      </div>
    </aside>
  );

  // Get page title from pathname
  const getPageTitle = () => {
    for (const section of sidebarSections) {
      for (const link of section.links) {
        if (isActiveLink(link.href)) return t(link.labelKey);
      }
    }
    return t('dashboard');
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Top header bar */}
      <header
        className={cn(
          'border-border bg-card sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 sm:gap-4 sm:px-6',
          !collapsed && 'lg:pl-[232px]'
        )}
      >
        {/* Mobile menu button */}
        <button
          className="text-muted-foreground lg:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Desktop expand button when collapsed */}
        {collapsed && (
          <button
            className="text-muted-foreground hidden lg:block"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Page title */}
        <h1 className="text-foreground hidden text-lg font-semibold sm:block">{getPageTitle()}</h1>

        {/* Search bar — submits to the product list */}
        <form className="mx-auto min-w-0 max-w-md flex-1" onSubmit={handleSearch}>
          <div className="relative">
            <Search className="text-muted-foreground/70 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={tHeader('searchPlaceholder')}
              className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/70 w-full rounded-full border py-2 pl-10 pr-4 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
            />
          </div>
        </form>

        {/* Right icons */}
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <button
            className="border-border text-muted-foreground hover:bg-muted rounded-full border p-1.5"
            onClick={toggleTheme}
            aria-label={tHeader('toggleTheme')}
            title={tHeader('toggleTheme')}
          >
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <UserAvatar image={user?.image} name={user?.name} size="md" />
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar — fixed */}
        {!collapsed && (
          <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-[220px]">{sidebar}</div>
        )}

        {/* Mobile sidebar — overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <div className="animate-slide-in-from-left absolute left-0 top-0 h-full w-[220px] shadow-xl">
              {sidebar}
            </div>
          </div>
        )}

        {/* Main content */}
        <main className={cn('min-w-0 flex-1 p-4 sm:p-6', !collapsed && 'lg:ml-[220px]')}>
          {children}
        </main>
      </div>
    </div>
  );
}
