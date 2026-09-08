'use client';

import { ChevronRight, ChevronLeft, Package, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { DashboardErrorBoundary } from '@/components/account/ErrorBoundary';
import { Badge } from '@/components/ui/badge';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrders } from '@/hooks/useOrders';
import { formatDate } from '@/lib/format';
import { formatPrice, cn } from '@/lib/utils';

function OrdersSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border-border bg-card rounded-xl border p-3.5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const locale = useLocale();
  const t = useTranslations('account');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { data, isLoading } = useOrders({
    page,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const orders = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  const filteredOrders = search
    ? orders.filter((o) => o.orderNumber.toLowerCase().includes(search.toLowerCase()))
    : orders;

  return (
    <DashboardErrorBoundary>
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-foreground text-lg font-bold">{t('orderHistory')}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="border-border bg-card flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5">
            <Filter className="text-muted-foreground h-3 w-3" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-muted-foreground cursor-pointer bg-transparent text-xs outline-none"
            >
              <option value="all">{t('allStatus')}</option>
              <option value="pending">{t('status.pending')}</option>
              <option value="confirmed">{t('status.confirmed')}</option>
              <option value="processing">{t('status.processing')}</option>
              <option value="shipped">{t('status.shipped')}</option>
              <option value="delivered">{t('status.delivered')}</option>
              <option value="cancelled">{t('status.cancelled')}</option>
            </select>
          </div>

          <div className="relative min-w-[180px] flex-1">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchOrder')}
              className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary/40 w-full rounded-lg border py-1.5 pl-8 pr-2.5 text-xs outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <OrdersSkeleton />
        ) : filteredOrders.length === 0 ? (
          <div className="border-border flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center">
            <Package className="text-muted-foreground/30 h-8 w-8" />
            <p className="text-foreground mt-3 text-sm font-bold">{t('noOrdersYet')}</p>
            <p className="text-muted-foreground mt-1 text-xs">{t('startShopping')}</p>
            <Link href="/products" className="mt-3">
              <PremiumButton variant="primary" size="md">
                {t('browseProducts')}
              </PremiumButton>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {filteredOrders.map((order) => {
                const status = {
                  label: t(`status.${order.status}`),
                  color:
                    order.status === 'delivered'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : order.status === 'cancelled'
                        ? 'text-destructive'
                        : order.status === 'shipped'
                          ? 'text-blue-600 dark:text-blue-400'
                          : order.status === 'processing'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-muted-foreground',
                };
                return (
                  <Link
                    key={order.id}
                    href={`/account/orders/${order.id}`}
                    className="border-border bg-card hover:border-primary/20 group flex items-center justify-between rounded-xl border p-3.5 transition-all duration-200 hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground truncate text-sm font-semibold">
                          {order.orderNumber}
                        </span>
                        <Badge
                          className={cn('shrink-0 text-[10px] capitalize', status.color)}
                          variant="outline"
                        >
                          {status.label}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {formatDate(order.createdAt, locale)} · {order.items?.length ?? 0}{' '}
                        {t('items')}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-foreground text-sm font-bold">
                        {formatPrice(order.total)}
                      </span>
                      <ChevronRight className="text-muted-foreground/30 group-hover:text-primary h-4 w-4 transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-muted-foreground text-xs">
                  {t('page')} {page} / {totalPages}
                </p>
                <div className="flex items-center gap-1.5">
                  <PremiumButton
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-3 w-3" /> {t('prev')}
                  </PremiumButton>
                  <PremiumButton
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="gap-1"
                  >
                    {t('next')} <ChevronRight className="h-3 w-3" />
                  </PremiumButton>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardErrorBoundary>
  );
}
