import type { DashboardPeriod } from '@/hooks/useAdmin';

/**
 * X-axis labels for the revenue chart.
 *
 * Bucket keys come from the API in three shapes depending on the period:
 *  24h  → `2026-09-11T10:00:00` (hourly, UTC)
 *  7d/30d → `2026-09-11` (daily)
 *  all  → `2026-09-01` (monthly)
 *
 * 30 daily points would crowd the axis, so only every 5th label is kept.
 */
export function periodAxisLabels(
  buckets: string[],
  period: DashboardPeriod,
  locale: string
): string[] {
  const labels = buckets.map((bucket) => {
    if (period === '24h') {
      return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        hourCycle: 'h23',
        timeZone: 'UTC',
      }).format(new Date(`${bucket}Z`));
    }
    const date = new Date(`${bucket}T00:00:00Z`);
    if (period === 'all') {
      return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(date);
    }
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
      date
    );
  });

  if (period !== '30d') return labels;
  return labels.map((label, i) => (i % 5 === 0 || i === labels.length - 1 ? label : ''));
}
