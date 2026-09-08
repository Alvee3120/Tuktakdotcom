'use client';

import { Search, SlidersHorizontal, Receipt, Eye, CheckCircle2, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { OrderDetailDrawer } from '@/components/dashboard/OrderDetailDrawer';
import { Pagination } from '@/components/dashboard/Pagination';
import { StatCard } from '@/components/dashboard/StatCard';
import { TabFilter } from '@/components/dashboard/TabFilter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAdminTransactions, useUpdatePaymentStatus } from '@/hooks/useAdmin';
import { formatPrice } from '@/lib/utils';

const paymentStatusStyles: Record<string, { text: string; dot: string }> = {
  paid: { text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  pending: { text: 'text-amber-500', dot: 'bg-amber-500' },
  failed: { text: 'text-red-500', dot: 'bg-red-500' },
  refunded: { text: 'text-muted-foreground', dot: 'bg-gray-400' },
};

const paymentStatusOptions = ['pending', 'paid', 'failed', 'refunded'];

const methodBadges: Record<string, { label: string; className: string }> = {
  bkash: { label: 'bKash', className: 'bg-pink-50 text-pink-600' },
  nagad: {
    label: 'Nagad',
    className: 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400',
  },
  sslcommerz: {
    label: 'SSLCommerz',
    className: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
  },
  cod: { label: 'COD', className: 'bg-muted text-muted-foreground' },
};

const tabDefs = [
  { value: 'all' },
  { value: 'paid' },
  { value: 'pending' },
  { value: 'failed' },
  { value: 'refunded' },
];

const KNOWN_STATUSES = new Set(['pending', 'paid', 'failed', 'refunded']);

export default function TransactionPage() {
  const tc = useTranslations('admin.common');
  const tst = useTranslations('admin.status');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewingOrder, setViewingOrder] = useState<string | null>(null);

  // Debounce search to avoid a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, error, refetch } = useAdminTransactions({
    page: currentPage,
    paymentStatus: activeTab !== 'all' ? activeTab : undefined,
    search: debouncedSearch,
  });
  const updatePaymentStatus = useUpdatePaymentStatus();

  const transactions = data?.data ?? [];
  const meta = data?.meta;
  const counts = meta?.paymentStatusCounts ?? {};
  const allCount = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const tabs = tabDefs.map((t) => ({
    ...t,
    label: t.value === 'all' ? tc('all') : tst(t.value),
    count: t.value === 'all' ? allCount : (counts[t.value] ?? 0),
  }));
  const bkashStats = meta?.methodBreakdown.find((m) => m.method === 'bkash');

  const handlePaymentStatusChange = async (id: string, paymentStatus: string) => {
    try {
      await updatePaymentStatus.mutateAsync({ id, paymentStatus });
      toast.success(`Payment marked as ${paymentStatus}`);
    } catch {
      toast.error('Failed to update payment status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Paid Revenue"
          value={formatPrice(meta?.paidRevenue ?? 0)}
          subtitle="From paid transactions"
        />
        <StatCard
          title={tst('paid')}
          value={(counts.paid ?? 0).toLocaleString()}
          subtitle="Completed payments"
        />
        <StatCard
          title={tst('pending')}
          value={(counts.pending ?? 0).toLocaleString()}
          subtitle="Awaiting verification"
        />
        <StatCard
          title="bKash Transactions"
          value={(bkashStats?.count ?? 0).toLocaleString()}
          subtitle={`${formatPrice(bkashStats?.total ?? 0)} volume`}
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabFilter
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(v) => {
            setActiveTab(v);
            setCurrentPage(1);
          }}
        />
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground/70 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder={tc('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-border bg-card placeholder:text-muted-foreground/70 w-64 rounded-lg border py-2 pl-9 pr-4 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
            />
          </div>
          <button className="border-border text-muted-foreground hover:bg-muted/50 rounded-lg border p-2">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Transaction table */}
      <div className="border-border bg-card overflow-x-auto rounded-xl border shadow-sm">
        {isError ? (
          <div className="flex flex-col items-center py-16">
            <Receipt className="h-10 w-10 text-red-300" />
            <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
              Failed to load transactions
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
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Receipt className="text-muted-foreground/40 h-10 w-10" />
            <p className="text-muted-foreground mt-3 text-sm font-medium">{tc('noData')}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-emerald-50 dark:bg-emerald-950/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {tc('transaction')}
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
                  {tc('method')}
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
              {transactions.map((t) => {
                const style = paymentStatusStyles[t.paymentStatus] ?? paymentStatusStyles.pending;
                const method = t.paymentMethod ? methodBadges[t.paymentMethod] : null;
                const isAutoMatched = t.paymentMethod === 'bkash' && !!t.paymentTransactionId;
                return (
                  <tr key={t.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      {t.paymentTransactionId ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground font-mono text-xs font-medium">
                            {t.paymentTransactionId}
                          </span>
                          {isAutoMatched && (
                            <span title="Auto-matched to this order via bKash TrxID">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/70 text-xs">No TrxID</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground text-sm font-medium">#{t.orderNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      {t.items.length > 0 ? (
                        <div className="flex items-center gap-2.5">
                          <div className="border-border bg-muted/50 relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border">
                            <Image
                              src={t.items[0].image}
                              alt={t.items[0].name}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0 max-w-[160px]">
                            <p className="text-foreground truncate text-sm">{t.items[0].name}</p>
                            {t.items.length > 1 && (
                              <p className="text-muted-foreground/70 text-[11px]">
                                +{t.items.length - 1} more
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
                        <UserAvatar image={t.customerImage} name={t.customerName} size="sm" />
                        <div>
                          <p className="text-foreground text-sm">{t.customerName ?? '—'}</p>
                          {t.customerEmail && (
                            <p className="text-muted-foreground/70 text-[11px]">
                              {t.customerEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-sm">
                      {new Date(t.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="text-foreground px-4 py-3 text-sm font-medium">
                      {formatPrice(t.total)}
                    </td>
                    <td className="px-4 py-3">
                      {method ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${method.className}`}
                        >
                          {method.label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/70 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80 ${style.text}`}>
                            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                            <span className="capitalize">
                              {KNOWN_STATUSES.has(t.paymentStatus)
                                ? tst(t.paymentStatus)
                                : t.paymentStatus}
                            </span>
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" sideOffset={6} className="w-36">
                          {paymentStatusOptions.map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={() => handlePaymentStatusChange(t.id, s)}
                              className={
                                s === t.paymentStatus
                                  ? 'bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                                  : ''
                              }
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${paymentStatusStyles[s]?.dot ?? 'bg-gray-400'}`}
                              />
                              <span className="capitalize">{tst(s)}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setViewingOrder(t.id)}
                        className="flex items-center gap-1 rounded-lg p-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 hover:dark:bg-emerald-950/30"
                        title="View order details"
                      >
                        <Eye className="h-4 w-4" /> {tc('view')}
                      </button>
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

      {/* Order Detail Offcanvas — shows which products this transaction paid for */}
      <OrderDetailDrawer orderId={viewingOrder} onClose={() => setViewingOrder(null)} />
    </div>
  );
}
