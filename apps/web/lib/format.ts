/**
 * Locale-aware date formatting helpers.
 * Usage: formatDate(date, locale) — locale from useLocale() or params.
 */

const LOCALE_MAP: Record<string, string> = {
  bn: 'bn-BD',
  en: 'en-US',
};

function resolveLocale(locale?: string): string {
  return LOCALE_MAP[locale ?? 'en'] ?? 'en-US';
}

export function formatDate(
  date: string | Date,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(resolveLocale(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

export function formatDateLong(date: string | Date, locale?: string): string {
  return formatDate(date, locale, { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(date: string | Date, locale?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(resolveLocale(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date, locale?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  const rtf = new Intl.RelativeTimeFormat(resolveLocale(locale), { numeric: 'auto' });

  if (diffMin < 1) return rtf.format(0, 'second');
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');
  if (diffHr < 24) return rtf.format(-diffHr, 'hour');
  return rtf.format(-diffDay, 'day');
}
