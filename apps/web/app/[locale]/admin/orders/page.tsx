'use client';

import { Search, Eye, Package, Edit3, X, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AreaChart } from '@/components/dashboard/AreaChart';
import { periodAxisLabels } from '@/components/dashboard/chart-labels';
import { OrderDetailDrawer } from '@/components/dashboard/OrderDetailDrawer';
import { Pagination } from '@/components/dashboard/Pagination';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import { StatCard } from '@/components/dashboard/StatCard';
import { TabFilter } from '@/components/dashboard/TabFilter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  useAdminOrders,
  useUpdateOrderStatus,
  useDashboardStats,
  type DashboardPeriod,
} from '@/hooks/useAdmin';
import { formatPrice } from '@/lib/utils';

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  pending: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  confirmed: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  processing: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    dot: 'bg-indigo-500',
  },
  shipped: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    text: 'text-purple-700 dark:text-purple-300',
    dot: 'bg-purple-500',
  },
  delivered: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
  },
  refunded: { bg: 'bg-muted/50', text: 'text-foreground', dot: 'bg-gray-400' },
};

const statusOptions = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

const tabDefs = [
  { value: 'all' },
  { value: 'pending' },
  { value: 'processing' },
  { value: 'shipped' },
  { value: 'delivered' },
  { value: 'cancelled' },
];

export default function OrderManagementPage() {
  const tc = useTranslations('admin.common');
  const tst = useTranslations('admin.status');
  const td = useTranslations('admin.dashboard');
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState('all');
  // Order management is a working list, so it opens on every order by default.
  const [period, setPeriod] = useState<DashboardPeriod>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<string | null>(null);

  // Debounce search to avoid a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data: statsData } = useDashboardStats(period);
  const stats = statsData?.data;
  const series = stats?.series ?? [];
  const weeklyData = series.map((d) => d.revenue);
  const weeklyLabels = periodAxisLabels(
    series.map((d) => d.bucket),
    period,
    locale
  );
  const { data, isLoading, isError, error, refetch } = useAdminOrders({
    page: currentPage,
    status: activeTab !== 'all' ? activeTab : undefined,
    search: debouncedSearch,
    period,
  });
  const updateStatus = useUpdateOrderStatus();

  const periodLabel = {
    '24h': tc('last24Hours'),
    '7d': tc('last7Days'),
    '30d': tc('last30Days'),
    all: tc('allTime'),
  }[period];

  const orders = data?.data ?? [];
  const meta = data?.meta;
  const statusCounts = meta?.statusCounts ?? {};
  const allCount = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);
  const tabs = tabDefs.map((t) => ({
    ...t,
    label: t.value === 'all' ? tc('all') : tst(t.value),
    count: t.value === 'all' ? allCount : (statusCounts[t.value] ?? 0),
  }));

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id: orderId, status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
      refetch();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats cards + Weekly report */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Total Orders"
            value={stats?.totalOrders?.toLocaleString() ?? '0'}
            percentageLabel={periodLabel}
          />
          <StatCard
            title="Total Revenue"
            value={formatPrice(stats?.totalRevenue ?? 0)}
            percentageLabel={periodLabel}
          />
          <StatCard
            title="Total Customers"
            value={stats?.totalUsers?.toLocaleString() ?? '0'}
            percentageLabel={tc('allTime')}
          />
          <StatCard
            title="Active Products"
            value={stats?.totalProducts?.toLocaleString() ?? '0'}
            percentageLabel="in stock"
          />
        </div>

        {/* Weekly Report */}
        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-foreground text-sm font-semibold">{td('salesOverview')}</h3>
              <p className="text-muted-foreground/70 text-[11px]">{periodLabel}</p>
            </div>
          </div>
          {weeklyData.some((v) => v > 0) ? (
            <AreaChart data={weeklyData} labels={weeklyLabels} height={120} maxHeight={120} />
          ) : (
            <p className="text-muted-foreground/70 py-8 text-center text-xs">No sales in this period</p>
          )}
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <TabFilter
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(v) => {
              setActiveTab(v);
              setCurrentPage(1);
            }}
          />
          <PeriodFilter
            value={period}
            onChange={(p) => {
              setPeriod(p);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground/70 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`${tc('search')}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-border bg-card placeholder:text-muted-foreground/70 rounded-lg border py-2 pl-9 pr-4 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border-border bg-card overflow-x-auto rounded-xl border shadow-sm">
        {isError ? (
          <div className="flex flex-col items-center py-16">
            <Package className="h-10 w-10 text-red-300" />
            <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
              Failed to load orders
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {(error as Error)?.message || 'Please check your authentication'}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-600"
            >
              {tc('retry')}
            </button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3 p-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-muted/50 h-14 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Package className="text-muted-foreground/40 h-10 w-10" />
            <p className="text-muted-foreground mt-3 text-sm font-medium">{tc('noData')}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-emerald-50 dark:bg-emerald-950/30">
                <th className="w-12 px-4 py-3 text-left">
                  <input type="checkbox" className="border-border h-4 w-4 rounded" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {tc('orderId')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {tc('product')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {tc('customer')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {tc('date')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {tc('total')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {tc('status')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {tc('action')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-border/60 divide-y">
              {orders.map((order) => {
                const style = statusStyles[order.status] || statusStyles.pending;
                return (
                  <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="border-border h-4 w-4 rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground text-sm font-medium">
                        #{order.orderNumber || order.id.slice(0, 8)}
                      </p>
                      {order.riskScore !== null && order.riskScore >= 30 && (
                        <span
                          title={(() => {
                            try {
                              return order.riskFlags
                                ? (JSON.parse(order.riskFlags) as string[]).join(', ')
                                : '';
                            } catch {
                              return '';
                            }
                          })()}
                          className={
                            order.riskScore >= 60
                              ? 'mt-0.5 inline-block rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-950/30 dark:text-red-400'
                              : 'mt-0.5 inline-block rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                          }
                        >
                          {order.riskScore >= 60 ? 'High risk' : 'Medium risk'} ({order.riskScore})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {order.items.length > 0 ? (
                        <div className="flex items-center gap-2.5">
                          <div className="border-border bg-muted/50 relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border">
                            <Image
                              src={order.items[0].image}
                              alt={order.items[0].name}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0 max-w-[180px]">
                            <p className="text-foreground truncate text-sm">
                              {order.items[0].name}
                            </p>
                            {order.items.length > 1 && (
                              <p className="text-muted-foreground/70 text-[11px]">
                                +{order.items.length - 1} more item
                                {order.items.length > 2 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/70 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          image={order.customerImage}
                          name={order.customerName ?? order.guestName}
                          size="sm"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-foreground text-sm">
                              {order.customerName ?? order.guestName ?? '—'}
                            </p>
                            {!order.userId && order.guestName && (
                              <span className="inline-flex rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                Guest
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground/70 text-[11px]">
                            {order.customerEmail ?? order.guestEmail}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-sm">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="text-foreground px-4 py-3 text-sm font-medium">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80 ${style.bg} ${style.text}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                            <span className="capitalize">{tst(order.status)}</span>
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" sideOffset={6} className="w-40">
                          {statusOptions.map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={() => handleStatusChange(order.id, s)}
                              className={
                                s === order.status
                                  ? 'bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                                  : ''
                              }
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${statusStyles[s]?.dot ?? 'bg-gray-400'}`}
                              />
                              <span className="capitalize">{tst(s)}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewingOrder(order.id)}
                          className="text-muted-foreground/70 rounded-lg p-1.5 transition-colors hover:bg-emerald-50 hover:text-emerald-600 hover:dark:bg-emerald-950/30 hover:dark:text-emerald-400"
                          title="View order details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            setEditingOrder(editingOrder === order.id ? null : order.id)
                          }
                          className="text-muted-foreground/70 rounded-lg p-1.5 transition-colors hover:bg-emerald-50 hover:text-emerald-600 hover:dark:bg-emerald-950/30 hover:dark:text-emerald-400"
                          title="Edit order"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {meta && meta.totalPages > 1 && (
          <div className="border-border border-t px-4">
            <Pagination
              currentPage={currentPage}
              totalPages={meta.totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Order Detail Offcanvas */}
      <OrderDetailDrawer orderId={viewingOrder} onClose={() => setViewingOrder(null)} />

      {/* Edit Order Panel */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingOrder(null)} />
          <div className="bg-card animate-in fade-in zoom-in-95 relative w-full max-w-md rounded-2xl p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-foreground text-lg font-semibold">Update Order Status</h3>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-muted-foreground/70 hover:bg-muted rounded-full p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-muted-foreground mb-4 text-sm">
              Order: <span className="font-medium">#{editingOrder.slice(0, 8)}</span>
            </p>

            <div className="space-y-2">
              <label className="text-foreground mb-1.5 block text-sm font-medium">New Status</label>
              <div className="grid grid-cols-2 gap-2">
                {statusOptions.map((s) => {
                  const st = statusStyles[s] || statusStyles.pending;
                  return (
                    <button
                      key={s}
                      onClick={async () => {
                        await handleStatusChange(editingOrder, s);
                        setEditingOrder(null);
                      }}
                      className={`border-border flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm capitalize transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:dark:bg-emerald-950/30`}
                    >
                      <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                      {tst(s)}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setEditingOrder(null)}
              className="border-border text-foreground hover:bg-muted/50 mt-5 w-full rounded-lg border py-2.5 text-sm font-medium"
            >
              {tc('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
