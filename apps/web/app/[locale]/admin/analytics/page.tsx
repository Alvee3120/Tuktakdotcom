'use client';

import { TrendingUp, ShoppingCart, Users, DollarSign } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import { cn, formatPrice } from '@/lib/utils';

type AnalyticsData = {
  summary: {
    total_orders: number;
    total_revenue: number;
    avg_order_value: number;
    unique_customers: number;
  };
  revenueOverTime: { day: string; revenue: number; orders: number }[];
  topProducts: { product_id: string; name: string; image: string; sold: number; revenue: number }[];
  ordersByStatus: { status: string; count: number; total: number }[];
  paymentMethods: { payment_method: string; count: number; total: number }[];
  categoryBreakdown: { name: string; items_sold: number; revenue: number }[];
};

const PERIODS = [
  { key: 'week', label: '7 Days' },
  { key: 'month', label: '30 Days' },
  { key: 'year', label: '12 Months' },
  { key: 'all', label: 'All Time' },
];

// ── Simple inline bar chart ──
function Bar({
  value,
  max,
  label,
  color = 'bg-primary',
}: {
  value: number;
  max: number;
  label: string;
  color?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground w-24 truncate text-right text-xs">{label}</span>
      <div className="bg-muted h-5 flex-1 overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="w-20 text-right text-xs font-medium">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

// ── Simple inline chart (sparkline using divs) ──
function Sparkline({
  data,
  height = 40,
}: {
  data: { value: number; label: string }[];
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="group relative flex-1">
          <div
            className="bg-primary/20 hover:bg-primary/40 w-full cursor-pointer rounded-t-sm transition-colors"
            style={{ height: `${(d.value / max) * 100}%` }}
          />
          <div className="bg-popover text-popover-foreground absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] opacity-0 transition-opacity group-hover:opacity-100">
            {d.label}: {d.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [error, setError] = useState(false);

  const fetchAnalytics = useCallback(async (p: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get<{ success: boolean; data: AnalyticsData }>(
        `/api/admin/analytics/overview?period=${p}`
      );
      setData(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  const summaryCards = data
    ? [
        {
          label: 'Total Revenue',
          value: formatPrice(data.summary.total_revenue),
          icon: DollarSign,
          color: 'text-success',
          bg: 'bg-success/10',
        },
        {
          label: 'Orders',
          value: data.summary.total_orders.toLocaleString(),
          icon: ShoppingCart,
          color: 'text-primary',
          bg: 'bg-primary/10',
        },
        {
          label: 'Avg Order Value',
          value: formatPrice(data.summary.avg_order_value),
          icon: TrendingUp,
          color: 'text-blue-500',
          bg: 'bg-blue-500/10',
        },
        {
          label: 'Unique Customers',
          value: data.summary.unique_customers.toLocaleString(),
          icon: Users,
          color: 'text-purple-500',
          bg: 'bg-purple-500/10',
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-heading-xl font-bold">Analytics</h1>
          <p className="text-body-sm text-muted-foreground mt-0.5">
            Financial overview and performance metrics
          </p>
        </div>
        <div className="bg-muted flex items-center gap-1.5 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                period === p.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-muted-foreground text-sm font-medium">Failed to load analytics</p>
        </div>
      ) : loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="border-border bg-card rounded-xl border p-5 transition-all hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs">{card.label}</p>
                      <p className="mt-1 text-2xl font-bold">{card.value}</p>
                    </div>
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-xl',
                        card.bg
                      )}
                    >
                      <Icon className={cn('h-5 w-5', card.color)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue Chart */}
            <div className="border-border bg-card rounded-xl border p-6">
              <h2 className="mb-2 text-sm font-semibold">Revenue Over Time</h2>
              <p className="text-muted-foreground mb-4 text-xs">
                Daily revenue for selected period
              </p>
              {data.revenueOverTime.length > 0 ? (
                <Sparkline
                  data={data.revenueOverTime.map((d) => ({
                    value: d.revenue,
                    label: d.day?.slice(5) || '',
                  }))}
                  height={120}
                />
              ) : (
                <p className="text-muted-foreground py-8 text-center text-xs">
                  No revenue data for this period
                </p>
              )}
              {data.revenueOverTime.length > 0 && (
                <div className="text-muted-foreground mt-4 text-center text-xs">
                  {data.revenueOverTime[0]?.day?.slice(0, 10)} —{' '}
                  {data.revenueOverTime[data.revenueOverTime.length - 1]?.day?.slice(0, 10)}
                </div>
              )}
            </div>

            {/* Orders by Status */}
            <div className="border-border bg-card rounded-xl border p-6">
              <h2 className="mb-2 text-sm font-semibold">Orders by Status</h2>
              <p className="text-muted-foreground mb-4 text-xs">Distribution across order states</p>
              <div className="space-y-2.5">
                {data.ordersByStatus.map((s) => {
                  const total = data.ordersByStatus.reduce((a, b) => a + Number(b.count), 0);
                  return (
                    <Bar
                      key={s.status}
                      label={s.status}
                      value={Number(s.count)}
                      max={total}
                      color={
                        s.status === 'delivered'
                          ? 'bg-success'
                          : s.status === 'cancelled'
                            ? 'bg-destructive'
                            : 'bg-primary'
                      }
                    />
                  );
                })}
                {data.ordersByStatus.length === 0 && (
                  <p className="text-muted-foreground py-6 text-center text-xs">No orders</p>
                )}
              </div>
            </div>

            {/* Top Products */}
            <div className="border-border bg-card rounded-xl border p-6">
              <h2 className="mb-2 text-sm font-semibold">Top Selling Products</h2>
              <p className="text-muted-foreground mb-4 text-xs">By revenue generated</p>
              {data.topProducts.length > 0 ? (
                <div className="space-y-2">
                  {data.topProducts.map((p, i) => (
                    <div key={p.product_id} className="flex items-center gap-3">
                      <span className="text-muted-foreground w-5 font-mono text-xs">{i + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{p.name}</p>
                        <p className="text-muted-foreground text-[10px]">{p.sold} sold</p>
                      </div>
                      <span className="text-xs font-semibold">
                        {formatPrice(Number(p.revenue))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground py-6 text-center text-xs">
                  No products sold in this period
                </p>
              )}
            </div>

            {/* Payment Methods */}
            <div className="border-border bg-card rounded-xl border p-6">
              <h2 className="mb-2 text-sm font-semibold">Payment Methods</h2>
              <p className="text-muted-foreground mb-4 text-xs">Revenue by payment type</p>
              {data.paymentMethods.length > 0 ? (
                <div className="space-y-2.5">
                  {data.paymentMethods.map((pm) => {
                    const total = data.paymentMethods.reduce((a, b) => a + Number(b.total), 0);
                    return (
                      <Bar
                        key={pm.payment_method}
                        label={pm.payment_method}
                        value={Number(pm.total)}
                        max={total}
                        color="bg-primary"
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground py-6 text-center text-xs">No payment data</p>
              )}
            </div>

            {/* Category Breakdown */}
            <div className="border-border bg-card rounded-xl border p-6 lg:col-span-2">
              <h2 className="mb-2 text-sm font-semibold">Category Performance</h2>
              <p className="text-muted-foreground mb-4 text-xs">Revenue by product category</p>
              {data.categoryBreakdown.length > 0 ? (
                <div className="space-y-2.5">
                  {data.categoryBreakdown.map((c) => {
                    const total = data.categoryBreakdown.reduce((a, b) => a + Number(b.revenue), 0);
                    return (
                      <Bar key={c.name} label={c.name} value={Number(c.revenue)} max={total} />
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground py-6 text-center text-xs">
                  No category data for this period
                </p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
