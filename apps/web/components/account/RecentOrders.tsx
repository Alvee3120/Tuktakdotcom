'use client';

import { motion } from 'framer-motion';
import { Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { formatPrice, cn } from '@/lib/utils';

import { statusConfig } from './OrderProgress';

import type { Order } from '@/hooks/useOrders';

export function RecentOrders({ orders }: { orders: Order[] }) {
  const locale = useLocale();
  const t = useTranslations('account');

  if (orders.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="border-border bg-card space-y-3 rounded-2xl border p-4 sm:p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-sm font-bold">{t('recentOrders')}</h2>
        <Link
          href="/account/orders"
          className="text-primary hover:text-primary/80 text-xs font-medium transition-colors"
        >
          {t('viewAll')} →
        </Link>
      </div>

      <div className="space-y-2">
        {orders.slice(0, 4).map((order) => {
          const cfg = statusConfig[order.status] ?? statusConfig.pending;
          return (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="border-border bg-background hover:border-primary/20 group flex items-center justify-between rounded-xl border p-3 transition-all duration-200 hover:shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-foreground truncate text-sm font-semibold">
                    {order.orderNumber}
                  </p>
                  <Badge
                    className={cn('shrink-0 text-[9px] capitalize', cfg.color)}
                    variant="outline"
                  >
                    {cfg.label}
                  </Badge>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {formatDate(order.createdAt, locale, { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-foreground text-xs font-bold">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
              <ChevronRight className="text-muted-foreground/30 group-hover:text-primary h-4 w-4 shrink-0 transition-colors" />
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
