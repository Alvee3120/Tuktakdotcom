'use client';

import { MessageSquare, Search, Edit3, X, Ban, ShieldCheck, Eye, Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Pagination } from '@/components/dashboard/Pagination';
import { StatCard } from '@/components/dashboard/StatCard';
import {
  useAdminUsers,
  useToggleUserBan,
  useDashboardStats,
  useCustomerOrders,
} from '@/hooks/useAdmin';
import { formatPrice } from '@/lib/utils';

export default function CustomersPage() {
  const tc = useTranslations('admin.common');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [ordersDialogOpen, setOrdersDialogOpen] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);

  // Debounce search so the backend isn't hit on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = useAdminUsers({
    page: currentPage,
    search: debouncedSearch,
  });
  const { data: statsData } = useDashboardStats();
  const toggleBan = useToggleUserBan();
  const users = data?.data ?? [];
  const meta = data?.meta;

  const selectedUser = users.find((u) => u.id === selectedCustomer);

  // Fetch customer orders when dialog is open
  const { data: ordersData, isLoading: ordersLoading } = useCustomerOrders(
    ordersDialogOpen ? selectedCustomer : null,
    ordersPage
  );

  const handleBanToggle = async (id: string) => {
    try {
      await toggleBan.mutateAsync(id);
      toast.success('User status updated');
      refetch();
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleViewOrders = (userId: string) => {
    setSelectedCustomer(userId);
    setOrdersPage(1);
    setOrdersDialogOpen(true);
  };

  const filteredUsers = users;

  return (
    <div className="space-y-6">
      {/* Top section: stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Customers"
          value={meta?.total?.toLocaleString() ?? '0'}
          percentageLabel="all time"
        />
        <StatCard
          title="Active Users"
          value={String(users.filter((u) => !u.banned).length)}
          percentageLabel="this page"
        />
        <StatCard
          title="Banned"
          value={String(users.filter((u) => u.banned).length)}
          percentageLabel="suspended"
        />
        <StatCard
          title="New This Week"
          value={statsData?.data?.newCustomersThisWeek?.toLocaleString() ?? '0'}
          subtitle="Last 7 days"
        />
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-foreground text-base font-semibold">Customer Details</h3>
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

      {/* Customer table + detail panel */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-muted/50 h-14 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="bg-emerald-50 dark:bg-emerald-950/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {tc('customer')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {tc('email')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {tc('role')}
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
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className={`hover:bg-muted/50 cursor-pointer transition-colors ${selectedCustomer === user.id ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}
                      onClick={() => setSelectedCustomer(user.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            {user.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="text-foreground text-sm font-medium">
                            {user.name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-sm">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="bg-muted text-muted-foreground inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.banned ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                            <span className="h-2 w-2 rounded-full bg-red-500" /> {tc('banned')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" /> {tc('active')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewOrders(user.id);
                            }}
                            className="text-muted-foreground/70 rounded-lg p-1.5 hover:bg-blue-50 hover:text-blue-600 hover:dark:bg-blue-950/30 hover:dark:text-blue-400"
                            title="View orders"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomer(user.id);
                              setEditDialogOpen(true);
                            }}
                            className="text-muted-foreground/70 rounded-lg p-1.5 hover:bg-emerald-50 hover:text-emerald-600 hover:dark:bg-emerald-950/30 hover:dark:text-emerald-400"
                            title="View profile"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBanToggle(user.id);
                            }}
                            className="text-muted-foreground/70 rounded-lg p-1.5 hover:bg-red-50 hover:text-red-500 hover:dark:bg-red-950/30"
                            title={user.banned ? tc('unban') : tc('ban')}
                          >
                            {user.banned ? (
                              <ShieldCheck className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {meta && meta.totalPages > 1 && (
                <div className="border-border border-t px-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={meta.totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Customer detail panel */}
        {selectedUser ? (
          <div className="border-border bg-card h-fit rounded-xl border p-5 shadow-sm">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {selectedUser.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <h4 className="text-foreground text-sm font-semibold">
                {selectedUser.name || 'Unknown'}
              </h4>
              <p className="text-muted-foreground/70 mt-0.5 text-[11px]">{selectedUser.email}</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2">
                  <span className="text-muted-foreground text-xs">{tc('role')}</span>
                  <span className="text-foreground text-xs font-medium capitalize">
                    {selectedUser.role}
                  </span>
                </div>
                <div className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2">
                  <span className="text-muted-foreground text-xs">{tc('status')}</span>
                  <span
                    className={`text-xs font-medium ${selectedUser.banned ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}
                  >
                    {selectedUser.banned ? tc('banned') : tc('active')}
                  </span>
                </div>
                <div className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2">
                  <span className="text-muted-foreground text-xs">{tc('joined')}</span>
                  <span className="text-foreground text-xs font-medium">
                    {new Date(selectedUser.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleViewOrders(selectedUser.id)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-500 py-2 text-xs font-medium text-white hover:bg-blue-600"
                >
                  <Package className="h-3.5 w-3.5" />
                  View Orders
                </button>
                <button
                  onClick={() => handleBanToggle(selectedUser.id)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium ${
                    selectedUser.banned
                      ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 hover:dark:bg-emerald-950/30'
                      : 'border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900 hover:dark:bg-red-950/30'
                  }`}
                >
                  {selectedUser.banned ? tc('unban') : tc('ban')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-border bg-card flex h-fit min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center">
            <MessageSquare className="text-muted-foreground/40 h-8 w-8" />
            <p className="text-muted-foreground mt-2 text-xs font-medium">Select a customer</p>
            <p className="text-muted-foreground/70 text-[10px]">Click a row to view details</p>
          </div>
        )}
      </div>

      {/* Profile Dialog */}
      {editDialogOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditDialogOpen(false)} />
          <div className="bg-card animate-in fade-in zoom-in-95 relative w-full max-w-md rounded-2xl p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-foreground text-lg font-semibold">Customer Profile</h3>
              <button
                onClick={() => setEditDialogOpen(false)}
                className="text-muted-foreground/70 hover:bg-muted rounded-full p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                  {selectedUser.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <h4 className="text-foreground text-base font-semibold">{selectedUser.name}</h4>
              <p className="text-muted-foreground/70 text-sm">{selectedUser.email}</p>
            </div>

            <div className="mb-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="border-border rounded-lg border p-3 text-center">
                  <p className="text-foreground text-lg font-bold capitalize">
                    {selectedUser.role}
                  </p>
                  <p className="text-muted-foreground/70 text-[10px]">{tc('role')}</p>
                </div>
                <div className="border-border rounded-lg border p-3 text-center">
                  <p
                    className={`text-lg font-bold ${selectedUser.banned ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}
                  >
                    {selectedUser.banned ? tc('banned') : tc('active')}
                  </p>
                  <p className="text-muted-foreground/70 text-[10px]">{tc('status')}</p>
                </div>
              </div>
              <div className="border-border rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Member since</span>
                  <span className="text-foreground text-xs font-medium">
                    {new Date(selectedUser.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleBanToggle(selectedUser.id);
                  setEditDialogOpen(false);
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium ${
                  selectedUser.banned
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {selectedUser.banned ? tc('unban') : tc('ban')}
              </button>
              <button
                onClick={() => setEditDialogOpen(false)}
                className="border-border text-foreground hover:bg-muted/50 flex-1 rounded-lg border py-2.5 text-sm font-medium"
              >
                {tc('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Orders Dialog */}
      {ordersDialogOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOrdersDialogOpen(false)}
          />
          <div className="bg-card animate-in fade-in zoom-in-95 relative flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-blue-500" />
                <div>
                  <h3 className="text-foreground text-lg font-semibold">Order History</h3>
                  <p className="text-muted-foreground text-sm">
                    {selectedUser.name} ({selectedUser.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOrdersDialogOpen(false)}
                className="text-muted-foreground/70 hover:bg-muted rounded-full p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {ordersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-muted/50 h-16 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : ordersData?.data && ordersData.data.length > 0 ? (
                <div className="space-y-3">
                  {ordersData.data.map((order) => (
                    <div
                      key={order.id}
                      className="border-border hover:bg-muted/50 overflow-hidden rounded-lg border transition-colors"
                    >
                      {/* Order Header */}
                      <div className="bg-muted/30 flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-foreground text-sm font-medium">
                              #{order.orderNumber || order.id.slice(0, 8)}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {new Date(order.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-foreground text-sm font-semibold">
                            {formatPrice(order.total)}
                          </p>
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                                order.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : order.status === 'cancelled'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                    : order.status === 'shipped'
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                      : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {order.status}
                            </span>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                                order.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : order.paymentStatus === 'failed'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Order Items with Images */}
                      {order.items && order.items.length > 0 && (
                        <div className="space-y-2 p-3">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.productName}
                                  className="border-border h-10 w-10 rounded-lg border object-cover"
                                />
                              ) : (
                                <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                                  <Package className="text-muted-foreground/50 h-5 w-5" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-foreground truncate text-sm font-medium">
                                  {item.productName}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {item.quantity} × {formatPrice(item.unitPrice)}
                                </p>
                              </div>
                              <p className="text-foreground text-sm font-medium">
                                {formatPrice(item.quantity * item.unitPrice)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="text-muted-foreground/30 h-12 w-12" />
                  <p className="text-muted-foreground mt-3 text-sm font-medium">No orders found</p>
                  <p className="text-muted-foreground/70 text-xs">
                    This customer hasn't placed any orders yet
                  </p>
                </div>
              )}
            </div>

            {ordersData?.meta && ordersData.meta.totalPages > 1 && (
              <div className="border-border mt-4 border-t pt-4">
                <Pagination
                  currentPage={ordersPage}
                  totalPages={ordersData.meta.totalPages}
                  onPageChange={setOrdersPage}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
