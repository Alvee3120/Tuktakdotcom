import Script from 'next/script';

import { API_URL } from '@/lib/constants';

/**
 * Third-party tracking scripts (GTM / GA4 / Meta Pixel / MS Clarity).
 *
 * Settings-driven: IDs live in the admin settings table and are fetched
 * server-side from the public /api/tracking-config endpoint (whitelisted,
 * secret-free) with the `tracking-config` ISR tag so an admin save
 * triggers on-demand revalidation — changes appear instantly.
 * Only the trackers whose IDs are configured get rendered.
 */

type TrackingConfig = {
  trackingEnabled?: string;
  gtmId?: string;
  ga4Id?: string;
  metaPixelId?: string;
  clarityId?: string;
};

async function getTrackingConfig(): Promise<TrackingConfig> {
  try {
    const res = await fetch(`${API_URL}/api/tracking-config`, {
      next: { tags: ['tracking-config'], revalidate: 0 },
    });
    if (!res.ok) return {};
    const body = (await res.json()) as { success?: boolean; data?: TrackingConfig };
    return body.success && body.data ? body.data : {};
  } catch {
    return {};
  }
}

export async function TrackingScripts() {
  const config = await getTrackingConfig();
  if (config.trackingEnabled === 'false') return null;

  const { gtmId, ga4Id, metaPixelId, clarityId } = config;
  if (!gtmId && !ga4Id && !metaPixelId && !clarityId) return null;

  return (
    <>
      {/* Google Tag Manager */}
      {gtmId && (
        <>
          <Script id="gtm-init" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
          </Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        </>
      )}

      {/* Google Analytics 4 (direct gtag.js — leave ga4Id empty if GA4 runs inside GTM) */}
      {ga4Id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga4Id}',{send_page_view:true,currency:'BDT'});`}
          </Script>
        </>
      )}

      {/* Meta Pixel */}
      {metaPixelId && (
        <>
          <Script id="meta-pixel-init" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              alt=""
              src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}

      {/* Microsoft Clarity (lazy — behavior analysis is not time-critical) */}
      {clarityId && (
        <Script id="ms-clarity-init" strategy="lazyOnload">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityId}");`}
        </Script>
      )}
    </>
  );
}
