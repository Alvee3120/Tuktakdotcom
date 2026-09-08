'use client';

import { AlertTriangle, Package } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { AreaChart } from '@/components/dashboard/AreaChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { useDashboardStats } from '@/hooks/useAdmin';
import { formatPrice } from '@/lib/utils';

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-amber-400',
  confirmed: 'bg-sky-400',
  processing: 'bg-blue-400',
  shipped: 'bg-indigo-400',
  delivered: 'bg-emerald-500',
  cancelled: 'bg-red-500',
  refunded: 'bg-purple-400',
};

const KNOWN_STATUSES = new Set([
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
  'paid',
  'failed',
]);

export default function AdminDashboardPage() {
  const locale = useLocale();
  const t = useTranslations('admin.dashboard');
  const tc = useTranslations('admin.common');
  const ts = useTranslations('admin.status');

  const { data, isLoading, isError, refetch } = useDashboardStats();
  const stats = data?.data;

  const statusLabel = (status: string) => (KNOWN_STATUSES.has(status) ? ts(status) : status);

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-muted/50 h-32 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="bg-muted/50 h-72 animate-pulse rounded-xl" />
            <div className="bg-muted/50 h-64 animate-pulse rounded-xl" />
          </div>
          <div className="space-y-6">
            <div className="bg-muted/50 h-48 animate-pulse rounded-xl" />
            <div className="bg-muted/50 h-48 animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border py-20">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="text-muted-foreground mt-3 text-sm">{tc('noData')}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
        >
          {tc('retry')}
        </button>
      </div>
    );
  }

  const weekRevenue = stats.weeklySeries.reduce((sum, d) => sum + d.revenue, 0);
  const weekOrders = stats.weeklySeries.reduce((sum, d) => sum + d.orders, 0);
  const chartData = stats.weeklySeries.map((d) => d.revenue);
  const chartLabels = stats.weeklySeries.map((d) => dayFmt.format(new Date(`${d.day}T00:00:00Z`)));
  const maxStatusCount = Math.max(1, ...Object.values(stats.statusCounts));

  return (
    <div className="space-y-6">
      {/* Stats cards row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('totalSales')}
          value={formatPrice(stats.totalRevenue)}
          subtitle={t('deliveredRevenue')}
          percentageLabel={tc('allTime')}
        />
        <StatCard
          title={t('totalOrders')}
          value={stats.totalOrders.toLocaleString()}
          subtitle={tc('allTime')}
          secondaryValue={weekOrders.toLocaleString()}
          secondaryLabel={tc('last7Days')}
        />
        <StatCard
          title={t('pendingOrders')}
          value={(stats.statusCounts.pending ?? 0).toLocaleString()}
          subtitle={tc('allTime')}
        />
        <StatCard
          title={t('cancelledOrders')}
          value={(stats.statusCounts.cancelled ?? 0).toLocaleString()}
          subtitle={tc('allTime')}
        />
      </div>

      {/* Main content - two columns */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Weekly report */}
          <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-foreground text-base font-semibold">{t('weeklyReport')}</h2>
              <span className="text-muted-foreground/70 text-xs">{tc('last7Days')}</span>
            </div>

            {/* Mini stats */}
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
              {[
                { label: t('customers'), value: stats.totalUsers.toLocaleString() },
                { label: t('totalProducts'), value: stats.totalProducts.toLocaleString() },
                { label: t('outOfStock'), value: stats.outOfStockCount.toLocaleString() },
                { label: t('revenue'), value: formatPrice(weekRevenue) },
                { label: t('orders'), value: weekOrders.toLocaleString() },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-foreground text-xl font-bold">{stat.value}</p>
                  <p className="text-muted-foreground/70 text-[11px]">{stat.label}</p>
                </div>
              ))}
            </div>

            {chartData.some((v) => v > 0) ? (
              <AreaChart data={chartData} labels={chartLabels} height={160} maxHeight={180} />
            ) : (
              <p className="text-muted-foreground/70 py-10 text-center text-sm">
                {t('noSalesYet')}
              </p>
            )}
          </div>

          {/* Recent transactions */}
          <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-foreground text-base font-semibold">{t('recentTransactions')}</h2>
              <Link
                href="/admin/transactions"
                className="border-border text-muted-foreground hover:bg-muted/50 rounded-lg border px-4 py-1.5 text-xs font-medium"
              >
                {tc('viewAll')}
              </Link>
            </div>
            {stats.recentTransactions.length === 0 ? (
              <p className="text-muted-foreground/70 py-8 text-center text-sm">
                {t('noOrdersYet')}
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-muted-foreground pb-3 text-left text-xs font-medium">
                      {tc('customer')}
                    </th>
                    <th className="text-muted-foreground pb-3 text-left text-xs font-medium">
                      {tc('date')}
                    </th>
                    <th className="text-muted-foreground pb-3 text-left text-xs font-medium">
                      {tc('status')}
                    </th>
                    <th className="text-muted-foreground pb-3 text-right text-xs font-medium">
                      {tc('amount')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentTransactions.map((tx) => (
                    <tr key={tx.id} className="border-border/60 border-b last:border-0">
                      <td className="py-3">
                        <p className="text-foreground text-sm font-medium">
                          {tx.customerName ?? '—'}
                        </p>
                        <p className="text-muted-foreground/70 text-[11px]">{tx.orderNumber}</p>
                      </td>
                      <td className="text-muted-foreground py-3 text-sm">
                        {dateFmt.format(new Date(tx.createdAt))}
                      </td>
                      <td className="py-3">
                        <span className="text-foreground flex items-center gap-1.5 text-sm">
                          <span
                            className={`h-2 w-2 rounded-full ${STATUS_DOT[tx.status] ?? 'bg-gray-400'}`}
                          />
                          {statusLabel(tx.status)}
                        </span>
                      </td>
                      <td className="text-foreground py-3 text-right text-sm font-medium">
                        {formatPrice(tx.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Best selling products */}
          <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-foreground text-base font-semibold">{t('bestSellers')}</h2>
              <Link
                href="/admin/products"
                className="border-border text-muted-foreground hover:bg-muted/50 rounded-lg border px-4 py-1.5 text-xs font-medium"
              >
                {tc('viewAll')}
              </Link>
            </div>
            {stats.bestSellers.length === 0 ? (
              <p className="text-muted-foreground/70 py-8 text-center text-sm">{t('noSalesYet')}</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-muted-foreground pb-3 text-left text-xs font-medium uppercase">
                      {tc('name')}
                    </th>
                    <th className="text-muted-foreground pb-3 text-left text-xs font-medium uppercase">
                      {t('sold')}
                    </th>
                    <th className="text-muted-foreground pb-3 text-left text-xs font-medium uppercase">
                      {tc('stock')}
                    </th>
                    <th className="text-muted-foreground pb-3 text-right text-xs font-medium uppercase">
                      {t('revenue')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.bestSellers.map((p) => (
                    <tr key={p.productId} className="border-border/60 border-b last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted border-border relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border">
                            {p.image ? (
                              <Image
                                src={p.image}
                                alt={p.name}
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            ) : (
                              <Package className="text-muted-foreground/40 m-2.5 h-4 w-4" />
                            )}
                          </div>
                          <span className="text-foreground text-sm font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="text-muted-foreground py-3 text-sm">{p.sold}</td>
                      <td className="py-3">
                        <span className="flex items-center gap-1.5 text-sm">
                          <span
                            className={`h-2 w-2 rounded-full ${p.stock > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                          />
                          <span
                            className={
                              p.stock > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-500'
                            }
                          >
                            {p.stock > 0 ? p.stock : t('outOfStock')}
                          </span>
                        </span>
                      </td>
                      <td className="text-foreground py-3 text-right text-sm font-semibold">
                        {formatPrice(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Orders by status */}
          <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
            <p className="text-foreground mb-4 text-sm font-semibold">
              {t('orderStatusBreakdown')}
            </p>
            {Object.keys(stats.statusCounts).length === 0 ? (
              <p className="text-muted-foreground/70 py-6 text-center text-sm">
                {t('noOrdersYet')}
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.statusCounts).map(([status, count]) => (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${STATUS_DOT[status] ?? 'bg-gray-400'}`}
                        />
                        {statusLabel(status)}
                      </span>
                      <span className="text-foreground font-medium">{count}</span>
                    </div>
                    <div className="bg-muted mt-1 h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.round((count / maxStatusCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Store snapshot */}
          <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
            <p className="text-foreground mb-4 text-sm font-semibold">{t('storeSnapshot')}</p>
            <div className="space-y-3">
              {[
                { label: t('customers'), value: stats.totalUsers.toLocaleString() },
                {
                  label: t('newCustomersThisWeek'),
                  value: stats.newCustomersThisWeek.toLocaleString(),
                },
                {
                  label: t('newsletterSubscribers'),
                  value: stats.newsletterCount.toLocaleString(),
                },
                { label: t('outOfStock'), value: stats.outOfStockCount.toLocaleString() },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{row.label}</span>
                  <span className="text-foreground text-sm font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Low stock alert */}
          <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-foreground text-sm font-semibold">{t('lowStockTitle')}</p>
              <Link
                href="/admin/products"
                className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
              >
                {tc('viewAll')}
              </Link>
            </div>
            {stats.lowStockProducts.length === 0 ? (
              <p className="text-muted-foreground/70 py-4 text-center text-sm">{tc('noData')}</p>
            ) : (
              <div className="space-y-3">
                {stats.lowStockProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/products/${p.id}/edit`}
                    className="group flex items-center gap-3"
                  >
                    <div className="bg-muted border-border relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border">
                      {p.image ? (
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      ) : (
                        <Package className="text-muted-foreground/40 m-2.5 h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        {p.name}
                      </p>
                      <p className="text-muted-foreground/70 text-[10px]">{formatPrice(p.price)}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold ${p.stock === 0 ? 'text-red-500' : 'text-amber-500'}`}
                    >
                      {p.stock}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
