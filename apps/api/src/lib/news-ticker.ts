import type { Database } from '@/db';
import { getCachedSetting } from '@/lib/settings-cache';
import { DEFAULT_NEWS_TICKER, type NewsTickerConfig } from '@/types/news-ticker';

/** Read the news-ticker config, falling back to defaults and tolerating corruption. */
export async function getNewsTickerConfig(db: Database): Promise<NewsTickerConfig> {
  const value = await getCachedSetting(db, 'newsTicker');
  if (!value) return DEFAULT_NEWS_TICKER;
  try {
    return { ...DEFAULT_NEWS_TICKER, ...(JSON.parse(value) as Partial<NewsTickerConfig>) };
  } catch {
    return DEFAULT_NEWS_TICKER;
  }
}
