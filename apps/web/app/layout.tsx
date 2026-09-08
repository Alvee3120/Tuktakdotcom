import Script from 'next/script';
import { getLocale } from 'next-intl/server';

import './fonts.css';
import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Default favicon for the whole app. A custom favicon (uploaded in Admin →
// Appearance → Branding) overrides this from the `[locale]` layout.
//
// The defaults below point at the build-derived PWA/app icons in `/public`
// (generated from `logo/logo-dark.png` on the Tuktak brand green). There is
// also a `/favicon.ico` in `/public` copied from `logo/favicon.ico` for
// browsers that request it directly.
//
// NOTE: there is intentionally no `app/favicon.ico` file. Next.js always
// unshifts a file-convention `favicon.ico` (with `sizes="256x256"`) to the
// FRONT of the icon list emitted in `<head>`, so browsers would keep using the
// default icon and the admin-uploaded brand favicon would never show. Defining
// a metadata default here (and overriding from the locale layout) lets the
// brand favicon be the only icon rendered.
export const metadata: Metadata = {
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#10b981" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="bg-background min-h-screen font-sans antialiased">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('tuktak-theme');
                  // Default is LIGHT — dark is secondary and only applied when explicitly chosen
                  if (!theme) theme = 'light';
                  if (theme === 'dark') document.documentElement.classList.add('dark');
                  else document.documentElement.classList.remove('dark');
                } catch(e) {}
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
