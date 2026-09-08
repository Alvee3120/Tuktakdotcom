import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Container } from '@/components/shared/Layout';
import { getHomeConfig } from '@/lib/home-config';
import { getMenuConfig } from '@/lib/menu-config';

import type { CSSProperties, ReactNode } from 'react';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const config = await getHomeConfig();
  const menuCfg = await getMenuConfig();
  const { branding } = config;
  const brandStyle = branding.primaryColor
    ? ({ ['--primary']: branding.primaryColor } as CSSProperties)
    : undefined;

  return (
    <div className="flex min-h-screen flex-col" style={brandStyle}>
      <Header
        variant={config.headerStyle}
        logoLight={branding.logoLight}
        logoDark={branding.logoDark}
      />
      <main className="section-padding flex flex-1 items-center justify-center">
        <Container size="sm">
          <div className="mx-auto max-w-md space-y-6">
            {/* Auth form card */}
            <div className="border-border bg-card rounded-2xl border p-5 shadow-sm sm:p-8">
              {children}
            </div>
          </div>
        </Container>
      </main>
      <Footer logoLight={branding.logoLight} logoDark={branding.logoDark} menuConfig={menuCfg} />
    </div>
  );
}
