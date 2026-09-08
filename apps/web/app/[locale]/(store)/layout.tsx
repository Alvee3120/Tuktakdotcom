import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { AnnouncementBar } from '@/components/store/AnnouncementBar';
import { CartPanel } from '@/components/store/CartPanel';
import { CompareBarLazy } from '@/components/store/CompareBarLazy';
import { FeatureBar } from '@/components/store/FeatureBar';
import { FloatingCart } from '@/components/store/FloatingCart';
import { FloatingChatIcons } from '@/components/store/FloatingChatIcons';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getHomeConfig } from '@/lib/home-config';
import { getMenuConfig } from '@/lib/menu-config';
import { getNewsTicker } from '@/lib/news-ticker';

import type { CSSProperties, ReactNode } from 'react';

export default async function StoreLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const [config, ticker, menuCfg, { locale: rawLocale }] = await Promise.all([
    getHomeConfig(),
    getNewsTicker(),
    getMenuConfig(),
    params,
  ]);
  const locale = rawLocale === 'bn' ? 'bn' : 'en';
  const { sections, branding } = config;
  // Brand color overrides the theme --primary for the whole storefront subtree.
  const brandStyle = branding.primaryColor
    ? ({ ['--primary']: branding.primaryColor } as CSSProperties)
    : undefined;

  return (
    <TooltipProvider>
      <div className="flex min-h-screen flex-col overflow-x-hidden" style={brandStyle}>
        <AnnouncementBar config={ticker} locale={locale} />
        <Header
          variant={config.headerStyle}
          logoLight={branding.logoLight}
          logoDark={branding.logoDark}
          menuConfig={menuCfg}
          locale={locale}
        />
        <main className="has-mobile-bottom-nav flex-1">{children}</main>
        {/* Trust badges sit just above the footer on every store page (admin-configurable) */}
        <FeatureBar enabled={sections.featureBar.enabled} items={sections.featureBar.items} />
        <Footer logoLight={branding.logoLight} logoDark={branding.logoDark} menuConfig={menuCfg} />
        <MobileBottomNav />
        <CartPanel />
        <FloatingCart />
        <FloatingChatIcons />
        <CompareBarLazy />
      </div>
    </TooltipProvider>
  );
}
