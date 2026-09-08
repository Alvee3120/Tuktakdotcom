'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, Box } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { formatPrice, cn } from '@/lib/utils';

import { statusConfig } from './OrderProgress';

import type { Order } from '@/hooks/useOrders';

function CircularProgress({
  value,
  size = 32,
  strokeWidth = 2.5,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="shrink-0 rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground text-[8px] font-bold"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
      >
        {value}%
      </text>
    </svg>
  );
}

const STEP_PROGRESS: Record<string, number> = {
  pending: 10,
  confirmed: 30,
  processing: 60,
  shipped: 80,
  delivered: 100,
};

export function RunningOrders({ orders }: { orders: Order[] }) {
  const locale = useLocale();
  const t = useTranslations('account');

  if (orders.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="border-border bg-card overflow-hidden rounded-2xl border"
    >
      <div className="flex items-center justify-between p-4 pb-0 sm:p-5">
        <h2 className="text-foreground text-sm font-bold">{t('runningOrders')}</h2>
        <Link
          href="/account/orders"
          className="text-primary hover:text-primary/80 text-xs font-medium transition-colors"
        >
          {t('viewAll')}
        </Link>
      </div>

      <div className="space-y-2 p-4 pt-3 sm:p-5">
        {orders.slice(0, 3).map((order) => {
          const cfg = statusConfig[order.status] ?? statusConfig.pending;
          const progress = STEP_PROGRESS[order.status] ?? 0;
          const firstItem = order.items?.[0];

          return (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="border-border bg-background hover:border-primary/20 group flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 hover:shadow-sm"
            >
              <div className="bg-muted relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
                {firstItem?.image ? (
                  <Image
                    src={firstItem.image}
                    alt={firstItem.name}
                    fill
                    className="object-cover"
                    sizes="36px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Box className="text-muted-foreground/40 h-3.5 w-3.5" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-xs font-bold">{order.orderNumber}</p>
                <p className="text-muted-foreground truncate text-[10px]">
                  {firstItem?.name ?? `${order.items?.length ?? 0} ${t('items')}`}
                </p>
              </div>

              <Badge className={cn('shrink-0 text-[9px] capitalize', cfg.color)} variant="outline">
                {cfg.label}
              </Badge>

              <CircularProgress value={progress} />
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
