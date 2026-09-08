import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';

import { MotionProvider, QueryProvider, ThemeProviderWrapper } from '@/components/providers';
import { OrganizationJsonLd } from '@/components/shared/BreadcrumbJsonLd';
import { PWAInstallPrompt } from '@/components/shared/PWAInstallPrompt';
import { ServiceWorkerRegistration } from '@/components/shared/ServiceWorkerRegistration';
import { CustomSnippets } from '@/components/tracking/CustomSnippets';
import { TrackingPageView } from '@/components/tracking/TrackingPageView';
import { TrackingScripts } from '@/components/tracking/TrackingScripts';
import { APP_URL } from '@/lib/constants';
import { getHomeConfig } from '@/lib/home-config';
import { routing } from '@/routing';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await getHomeConfig();
  const meta: Metadata = {
    title: {
      default: 'Tuktak — Premium Electronics & Gadgets',
      template: '%s | Tuktak',
    },
    description:
      'Discover premium electronics and gadgets at unbeatable prices. Shop smartphones, laptops, audio, smartwatches and more.',
    keywords: ['electronics', 'gadgets', 'smartphones', 'laptops', 'online shopping', 'Bangladesh'],
    openGraph: {
      type: 'website',
      siteName: 'Tuktak',
      title: 'Tuktak — Premium Electronics & Gadgets',
      description: 'Discover premium electronics and gadgets at unbeatable prices.',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Tuktak — Premium Electronics & Gadgets',
      description: 'Discover premium electronics and gadgets at unbeatable prices.',
    },
    robots: {
      index: true,
      follow: true,
    },
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Tuktak',
    },
  };
  // Admin-configured favicon overrides the file-convention favicon.ico
  if (branding.favicon) {
    meta.icons = { icon: branding.favicon, apple: branding.favicon };
  }
  return {
    ...meta,
    metadataBase: new URL(APP_URL),
    alternates: {
      // Hreflang: each supported locale plus an `x-default` fallback to the default locale.
      languages: {
        en: '/en',
        bn: '/bn',
        'x-default': '/en',
      },
    },
  };
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <>
      <OrganizationJsonLd url={APP_URL} logo={`${APP_URL}/logo/logo_light_mode.png`} />
      <ServiceWorkerRegistration />
      <TrackingScripts />
      <CustomSnippets />
      <TrackingPageView />
      <ThemeProviderWrapper>
        <MotionProvider>
          <QueryProvider>
            <NextIntlClientProvider messages={messages}>
              {children}
              <Toaster
                position="bottom-right"
                // Keep toasts clear of the floating cart button (and mobile bottom nav)
                // so the "added to cart" toast slides in right above the cart icon.
                offset={{ bottom: 88, right: 16 }}
                mobileOffset={{ bottom: 168, right: 12 }}
                toastOptions={{
                  style: {
                    background: 'var(--popover)',
                    color: 'var(--popover-foreground)',
                    border: '1px solid var(--border)',
                  },
                }}
              />
              <PWAInstallPrompt />
            </NextIntlClientProvider>
          </QueryProvider>
        </MotionProvider>
      </ThemeProviderWrapper>
    </>
  );
}
