'use client';

import { Package } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { PremiumButton } from '@/components/ui/PremiumButton';

import { RecentlyViewed } from './RecentlyViewed';
import { RecentOrders } from './RecentOrders';
import { RunningOrders } from './RunningOrders';

import type { Order } from '@/hooks/useOrders';

export function OverviewTab({
  orders,
  activeOrders,
  ordersLoading,
}: {
  orders: Order[];
  activeOrders: Order[];
  ordersLoading: boolean;
}) {
  if (ordersLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-muted h-32 animate-pulse rounded-2xl" />
        <div className="bg-muted h-40 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RunningOrders orders={activeOrders} />

      <RecentlyViewed />

      {orders.length > 0 && activeOrders.length === 0 && <RecentOrders orders={orders} />}
    </div>
  );
}

export function OrdersTab({
  orders,
  ordersLoading,
  activeCount,
  deliveredCount,
}: {
  orders: Order[];
  ordersLoading: boolean;
  activeCount: number;
  deliveredCount: number;
}) {
  const t = useTranslations('account');

  if (ordersLoading) {
    return (
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-muted h-16 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="border-border bg-card rounded-2xl border p-10 text-center">
        <div className="bg-muted mx-auto flex h-12 w-12 items-center justify-center rounded-2xl">
          <Package className="text-muted-foreground/30 h-5 w-5" />
        </div>
        <h3 className="text-foreground mt-3 text-sm font-bold">{t('noOrdersYet')}</h3>
        <p className="text-muted-foreground mt-1 text-xs">{t('orderHistoryEmpty')}</p>
        <Link href="/products" className="mt-3 inline-block">
          <PremiumButton variant="primary" size="md">
            {t('startShopping')}
          </PremiumButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="border-border bg-card flex items-center justify-between rounded-xl border p-3.5">
        <p className="text-muted-foreground text-sm font-medium">
          {orders.length} {t('ordersTotal')}
        </p>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <div className="bg-primary h-2 w-2 rounded-full" />
            {activeCount} {t('activeOrdersShort')}
          </span>
          <span className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            {deliveredCount} {t('deliveredShort')}
          </span>
        </div>
      </div>

      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/account/orders/${order.id}`}
          className="border-border bg-card hover:border-primary/20 group block rounded-xl border p-3.5 transition-all duration-200 hover:shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-foreground truncate text-sm font-bold">{order.orderNumber}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">{t(`status.${order.status}`)}</p>
            </div>
            <p className="text-foreground text-sm font-bold">৳{order.total.toLocaleString()}</p>
          </div>
          {order.items && order.items.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {order.items.slice(0, 3).map((item) => (
                <span
                  key={item.id}
                  className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                >
                  {item.name}
                  {item.quantity > 1 && (
                    <span className="text-muted-foreground/60 ml-0.5">×{item.quantity}</span>
                  )}
                </span>
              ))}
              {order.items.length > 3 && (
                <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium">
                  +{order.items.length - 3} {t('more')}
                </span>
              )}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
