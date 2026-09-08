import Link from 'next/link';

import { type NewsTickerConfig } from '@/lib/news-ticker';

import styles from './TopBarNewsTicker.module.css';

/**
 * Site-wide top-bar news ticker. Rendered by the store layout above the
 * AnnouncementBar. Server-rendered from the ISR-tagged `news-ticker` fetch so
 * `revalidateTag('news-ticker')` (triggered from the admin) refreshes it with
 * no client-side config fetch.
 */
export function TopBarNewsTicker({
  config,
  locale,
}: {
  config: NewsTickerConfig;
  locale: 'en' | 'bn';
}) {
  if (!config.enabled) return null;

  const message = (locale === 'bn' && config.textBn) || config.text || '';
  if (!message) return null;

  // Repeat the message so the marquee is never half-empty as it scrolls.
  const items = [0, 1, 2];

  return (
    <div className={styles.ticker} aria-label="News ticker">
      <span aria-hidden="true">📢</span>
      <div className={styles.track}>
        {items.map((i) => (
          <span key={i} className="flex items-center gap-3 whitespace-nowrap">
            <span>{message}</span>
            {config.link && config.linkLabel ? (
              <Link href={config.link} className={styles.link}>
                {config.linkLabel}
              </Link>
            ) : null}
            <span aria-hidden="true">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}
