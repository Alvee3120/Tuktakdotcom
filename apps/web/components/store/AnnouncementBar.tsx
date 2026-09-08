import { Phone, Sparkles, Zap } from 'lucide-react';

import { DEFAULT_NEWS_TICKER, type NewsTickerConfig } from '@/lib/news-ticker';

/**
 * Site-wide top-bar news ticker — rendered ABOVE the Header on every store page.
 * Deep gradient strip using the primary brand color.
 *
 * Config-driven from the admin "Top Bar News Ticker" form. The store layout
 * fetches the config server-side (ISR, tag `news-ticker`) and passes it in, so
 * an admin save + on-demand revalidation reflects immediately on the storefront
 * — no client-side config fetch and the revalidate secret never reaches the
 * browser. Falls back to `DEFAULT_NEWS_TICKER` values when the admin hasn't
 * configured a given field.
 */
export function AnnouncementBar({
  config,
  locale,
}: {
  config: NewsTickerConfig;
  locale: 'en' | 'bn';
}) {
  if (!config.enabled) return null;

  // Phone: prefer admin-configured value, fall back to the seeded default.
  const phone = config.phone || DEFAULT_NEWS_TICKER.phone;
  // tel: URIs need ASCII digits — convert any Bengali-numeral digits so the
  // link actually dials on mobile even if the admin typed BN numerals.
  const telHref = `tel:${phone.replace(/[\u09e6-\u09ef]/g, (d) => String(d.charCodeAt(0) - 0x09e6))}`;

  // Marquee phrases: prefer admin entries per locale, fall back to defaults.
  const annEn = config.announcements?.length
    ? config.announcements
    : DEFAULT_NEWS_TICKER.announcements;
  const annBn = config.announcementsBn?.length
    ? config.announcementsBn
    : DEFAULT_NEWS_TICKER.announcementsBn;
  const phrases = locale === 'bn' && annBn.length ? annBn : annEn;
  // Duplicated once so the -50% marquee translate loops seamlessly.
  const strip = [...phrases, ...phrases];

  if (!strip.length) return null;

  return (
    <div className="from-primary/95 via-primary/90 to-primary/95 relative w-full overflow-hidden bg-gradient-to-r text-white">
      {/* Subtle glow accents */}
      <div className="bg-primary/20 pointer-events-none absolute -left-20 top-1/2 h-24 w-64 -translate-y-1/2 rounded-full blur-3xl" />
      <div className="bg-primary/15 pointer-events-none absolute -right-20 top-1/2 h-24 w-64 -translate-y-1/2 rounded-full blur-3xl" />

      <div className="relative mx-auto flex max-w-screen-2xl items-center gap-3 px-2 py-1 sm:gap-4 sm:px-3 lg:px-4">
        {/* Phone pill */}
        <a
          href={telHref}
          className="group flex shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/90 transition-colors hover:bg-white/20"
        >
          <span className="h-4.5 w-4.5 text-primary flex items-center justify-center rounded-full bg-white">
            <Phone className="h-2.5 w-2.5" />
          </span>
          <span className="hidden sm:inline">{phone}</span>
          <span className="sm:hidden">Call</span>
        </a>

        {/* Marquee promo strip */}
        <div className="marquee-pause relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="animate-marquee flex items-center gap-5">
            {strip.map((phrase, i) => (
              <span
                key={i}
                className="inline-flex items-center text-[11px] font-medium text-white/90 sm:text-xs"
              >
                <Sparkles className="mr-2 h-3 w-3 shrink-0 text-white/70" aria-hidden />
                {phrase}
                <span className="mx-5 text-white/30" aria-hidden>
                  •
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Flash-deal chip (desktop only) */}
        <span className="text-primary hidden shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-[0_0_12px_var(--primary)/0.4] md:inline-flex">
          <Zap className="h-3 w-3 fill-current" />
          Flash Deals
        </span>
      </div>
    </div>
  );
}
