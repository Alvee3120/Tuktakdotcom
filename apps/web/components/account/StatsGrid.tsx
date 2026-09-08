'use client';

import { motion } from 'framer-motion';
import { Heart, Package, ShoppingBag, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { useOrders } from '@/hooks/useOrders';
import { cn } from '@/lib/utils';
import { useWishlistStore } from '@/stores/useWishlistStore';

function AnimatedCounter({ value, prefix }: { value: number | string; prefix?: string }) {
  const [displayed, setDisplayed] = useState(0);
  const numericValue = typeof value === 'number' ? value : 0;
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (numericValue === 0) {
      setDisplayed(0);
      return;
    }
    const start = displayed;
    const diff = numericValue - start;
    const duration = 600;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + diff * eased));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    }

    ref.current = requestAnimationFrame(tick);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [numericValue]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span>
      {prefix}
      {typeof value === 'number' ? displayed.toLocaleString() : value}
    </span>
  );
}

export function StatsGrid() {
  const { data: ordersRes, isLoading } = useOrders({ limit: 50 });
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const orders = ordersRes?.data ?? [];
  const t = useTranslations('account');

  const activeOrders = orders.filter((o) =>
    ['pending', 'confirmed', 'processing', 'shipped'].includes(o.status)
  ).length;
  const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;
  const totalSpent = orders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + o.total, 0);

  const cards = [
    {
      label: t('activeOrders'),
      value: isLoading ? '—' : activeOrders,
      icon: Package,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: t('delivered'),
      value: isLoading ? '—' : deliveredOrders,
      icon: ShoppingBag,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: t('totalSpent'),
      value: isLoading ? '—' : totalSpent,
      icon: TrendingUp,
      color: 'text-primary',
      bg: 'bg-primary/10',
      prefix: '৳',
    },
    {
      label: t('wishlist'),
      value: wishlistCount,
      icon: Heart,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.07 }}
            className="border-border bg-card rounded-xl border p-3.5 transition-all duration-200 hover:shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', card.bg)}>
                <Icon className={cn('h-4 w-4', card.color)} />
              </div>
              <div>
                <p className="text-foreground text-lg font-bold tracking-tight">
                  {typeof card.value === 'number' && !isLoading ? (
                    <AnimatedCounter value={card.value} prefix={card.prefix} />
                  ) : (
                    card.value
                  )}
                </p>
                <p className="text-muted-foreground text-[11px] font-medium">{card.label}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
