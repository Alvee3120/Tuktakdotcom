'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import type { DashboardPeriod } from '@/hooks/useAdmin';

export const PERIODS: DashboardPeriod[] = ['24h', '7d', '30d', 'all'];

/** Segmented "last 24 hours / 7 days / 30 days / all time" filter. */
export function PeriodFilter({
  value,
  onChange,
  className,
}: {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
  className?: string;
}) {
  const tc = useTranslations('admin.common');
  const labels: Record<DashboardPeriod, string> = {
    '24h': tc('last24Hours'),
    '7d': tc('last7Days'),
    '30d': tc('last30Days'),
    all: tc('allTime'),
  };

  return (
    <div
      className={cn(
        'border-border bg-card inline-flex items-center gap-1 rounded-lg border p-1',
        className
      )}
    >
      {PERIODS.map((key) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            value === key ? 'bg-emerald-500 text-white' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {labels[key]}
        </button>
      ))}
    </div>
  );
}
