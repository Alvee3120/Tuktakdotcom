'use client';

import { MoreVertical } from 'lucide-react';

import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  percentage?: number;
  percentageLabel?: string;
  secondaryValue?: string | number;
  secondaryLabel?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle = 'Last 7 days',
  percentage,
  percentageLabel,
  secondaryValue,
  secondaryLabel,
  className,
}: StatCardProps) {
  const isPositive = percentage !== undefined && percentage >= 0;

  return (
    <div className={cn('border-border bg-card rounded-xl border p-5 shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <p className="text-muted-foreground text-sm font-medium">{title}</p>
        <button className="text-muted-foreground/70 hover:text-muted-foreground">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-foreground text-3xl font-bold">{value}</span>
        {percentageLabel && (
          <span className="text-muted-foreground text-sm">{percentageLabel}</span>
        )}
        {percentage !== undefined && (
          <span
            className={cn('text-sm font-medium', isPositive ? 'text-emerald-500' : 'text-red-500')}
          >
            {isPositive ? '↑' : '↓'} {Math.abs(percentage)}%
          </span>
        )}
      </div>
      {secondaryValue && (
        <p className="text-muted-foreground mt-1 text-sm">
          {secondaryLabel}{' '}
          <span className="text-emerald-600 dark:text-emerald-400">({secondaryValue})</span>
        </p>
      )}
      {subtitle && <p className="text-muted-foreground/70 mt-1 text-xs">{subtitle}</p>}
    </div>
  );
}
