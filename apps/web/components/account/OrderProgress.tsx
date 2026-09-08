'use client';

import { useTranslations } from 'next-intl';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; step: number }> = {
  pending: {
    label: 'Pending',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    step: 0,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    step: 1,
  },
  processing: {
    label: 'Processing',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10',
    step: 2,
  },
  shipped: {
    label: 'Shipped',
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-500/10',
    step: 3,
  },
  delivered: {
    label: 'Delivered',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    step: 4,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10',
    step: -1,
  },
  refunded: {
    label: 'Refunded',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10',
    step: -1,
  },
};

export const statusConfig = STATUS_CONFIG;

export function OrderProgress({ status }: { status: string }) {
  const t = useTranslations('account');
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const stepIdx = cfg.step;
  const progress = stepIdx >= 0 ? ((stepIdx + 1) / 5) * 100 : 0;

  const translatedLabel = t(`status.${status}`);
  const steps = [
    t('status.pending'),
    t('status.confirmed'),
    t('status.processing'),
    t('status.shipped'),
    t('status.delivered'),
  ];

  if (stepIdx < 0) {
    return (
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'h-2 w-2 rounded-full',
            status === 'cancelled' ? 'bg-red-500' : 'bg-orange-500'
          )}
        />
        <span className={cn('text-xs font-medium', cfg.color)}>{translatedLabel}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={cn('text-xs font-semibold', cfg.color)}>{translatedLabel}</span>
        <span className="text-muted-foreground text-[10px]">
          {stepIdx + 1}/{steps.length}
        </span>
      </div>
      <Progress value={progress} className="h-1.5" />
      <div className="flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded-full border-2 text-[8px] font-bold transition-all',
                i <= stepIdx
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/20 bg-background text-muted-foreground/40'
              )}
            >
              {i <= stepIdx && (i < stepIdx ? '✓' : stepIdx + 1)}
            </div>
            <span
              className={cn(
                'mt-1 hidden text-[9px] sm:block',
                i <= stepIdx ? 'text-foreground font-medium' : 'text-muted-foreground/50'
              )}
            >
              {s}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
