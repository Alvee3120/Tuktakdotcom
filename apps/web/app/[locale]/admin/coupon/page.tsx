'use client';

import { Plus, Search, Tag, Edit3, Trash2, Copy, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Pagination } from '@/components/dashboard/Pagination';
import { StatCard } from '@/components/dashboard/StatCard';
import { TabFilter } from '@/components/dashboard/TabFilter';
import {
  useAdminCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
} from '@/hooks/useAdmin';
import { formatPrice } from '@/lib/utils';

type FormState = {
  code: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: string;
  usageLimit: string;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
};

const emptyForm: FormState = {
  code: '',
  description: '',
  type: 'percentage',
  value: 10,
  minOrderAmount: 0,
  maxDiscountAmount: '',
  usageLimit: '',
  isActive: true,
  startsAt: '',
  expiresAt: '',
};

const tabs = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Expired', value: 'expired' },
  { label: 'Inactive', value: 'inactive' },
];

export default function AdminCouponPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data, isLoading } = useAdminCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const coupons = data?.data ?? [];

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };
  const openEdit = (coupon: (typeof coupons)[0]) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      description: coupon.description ?? '',
      type: coupon.type,
      value: coupon.value,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscountAmount: coupon.maxDiscountAmount?.toString() ?? '',
      usageLimit: coupon.usageLimit?.toString() ?? '',
      isActive: coupon.isActive,
      startsAt: coupon.startsAt ?? '',
      expiresAt: coupon.expiresAt ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.value) return;
    try {
      const payload = {
        code: form.code,
        description: form.description || undefined,
        type: form.type,
        value: form.value,
        minOrderAmount: form.minOrderAmount,
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        isActive: form.isActive,
        startsAt: form.startsAt || undefined,
        expiresAt: form.expiresAt || undefined,
      };
      if (editingId) {
        await updateCoupon.mutateAsync({ id: editingId, data: payload });
        toast.success('Coupon updated');
      } else {
        await createCoupon.mutateAsync(payload);
        toast.success('Coupon created');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    await deleteCoupon.mutateAsync(id);
    toast.success('Coupon deleted');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied: ${code}`);
  };

  const isExpired = (c: (typeof coupons)[0]) => c.expiresAt && new Date(c.expiresAt) < new Date();

  const filtered = coupons.filter((c) => {
    if (
      search &&
      !c.code.toLowerCase().includes(search.toLowerCase()) &&
      !(c.description ?? '').toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (activeTab === 'active') return c.isActive && !isExpired(c);
    if (activeTab === 'expired') return isExpired(c);
    if (activeTab === 'inactive') return !c.isActive;
    return true;
  });

  const perPage = 10;
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const activeCoupons = coupons.filter((c) => c.isActive && !isExpired(c)).length;
  const totalUsage = coupons.reduce((sum, c) => sum + c.usageCount, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Coupons" value={String(coupons.length)} percentage={0} />
        <StatCard
          title="Active Coupons"
          value={String(activeCoupons)}
          percentage={coupons.length > 0 ? Math.round((activeCoupons / coupons.length) * 100) : 0}
        />
        <StatCard title="Total Redemptions" value={String(totalUsage)} percentageLabel="all time" />
      </div>

      {/* Filters */}
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
              placeholder="Search coupons..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="border-border bg-card placeholder:text-muted-foreground/70 rounded-lg border py-2 pl-9 pr-4 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
            />
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4" /> Add Coupon
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted/50 h-14 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Tag className="text-muted-foreground/40 h-10 w-10" />
            <p className="text-muted-foreground mt-3 text-sm font-medium">No coupons found</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-emerald-50 dark:bg-emerald-950/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Usage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Min. Order
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border/60 divide-y">
                {paginated.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-emerald-50 px-2 py-1 font-mono text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                          {coupon.code}
                        </span>
                        <button
                          onClick={() => copyCode(coupon.code)}
                          className="text-muted-foreground/70 hover:text-muted-foreground"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-sm capitalize">
                      {coupon.type}
                    </td>
                    <td className="text-foreground px-4 py-3 text-sm font-medium">
                      {coupon.type === 'percentage'
                        ? `${coupon.value}%`
                        : formatPrice(coupon.value)}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-sm">
                      {coupon.usageCount}
                      {coupon.usageLimit ? `/${coupon.usageLimit}` : ''}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-sm">
                      {coupon.minOrderAmount > 0 ? formatPrice(coupon.minOrderAmount) : '—'}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-sm">
                      {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      {isExpired(coupon) ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                          <span className="h-2 w-2 rounded-full bg-red-500" /> Expired
                        </span>
                      ) : coupon.isActive ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active
                        </span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <span className="h-2 w-2 rounded-full bg-gray-400" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(coupon)}
                          className="text-muted-foreground/70 rounded-lg p-1.5 hover:bg-emerald-50 hover:text-emerald-600 hover:dark:bg-emerald-950/30 hover:dark:text-emerald-400"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.id)}
                          className="text-muted-foreground/70 rounded-lg p-1.5 hover:bg-red-50 hover:text-red-500 hover:dark:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="border-border border-t px-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDialogOpen(false)} />
          <div className="bg-card animate-in fade-in zoom-in-95 relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-foreground text-lg font-semibold">
                {editingId ? 'Edit Coupon' : 'New Coupon'}
              </h3>
              <button
                onClick={() => setDialogOpen(false)}
                className="text-muted-foreground/70 hover:bg-muted rounded-full p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">Code</label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="SUMMER20"
                    className="border-border w-full rounded-lg border px-4 py-2.5 font-mono text-sm uppercase focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                  />
                </div>
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm({ ...form, type: e.target.value as 'percentage' | 'fixed' })
                    }
                    className="border-border w-full rounded-lg border px-4 py-2.5 text-sm focus:border-emerald-300 focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  Description
                </label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Summer sale discount"
                  className="border-border w-full rounded-lg border px-4 py-2.5 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">Value</label>
                  <input
                    type="number"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                    className="border-border w-full rounded-lg border px-4 py-2.5 text-sm focus:border-emerald-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">
                    Min. Order
                  </label>
                  <input
                    type="number"
                    value={form.minOrderAmount}
                    onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })}
                    className="border-border w-full rounded-lg border px-4 py-2.5 text-sm focus:border-emerald-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">
                    Max Discount
                  </label>
                  <input
                    type="number"
                    value={form.maxDiscountAmount}
                    onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
                    placeholder="∞"
                    className="border-border w-full rounded-lg border px-4 py-2.5 text-sm focus:border-emerald-300 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    value={form.usageLimit}
                    onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                    placeholder="Unlimited"
                    className="border-border w-full rounded-lg border px-4 py-2.5 text-sm focus:border-emerald-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">
                    Starts At
                  </label>
                  <input
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className="border-border w-full rounded-lg border px-4 py-2.5 text-sm focus:border-emerald-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">
                    Expires At
                  </label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className="border-border w-full rounded-lg border px-4 py-2.5 text-sm focus:border-emerald-300 focus:outline-none"
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="border-border rounded text-emerald-500 focus:ring-emerald-300"
                />
                <span className="text-foreground text-sm">Active</span>
              </label>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => setDialogOpen(false)}
                className="border-border text-foreground hover:bg-muted/50 flex-1 rounded-lg border py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  createCoupon.isPending || updateCoupon.isPending || !form.code || !form.value
                }
                className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createCoupon.isPending || updateCoupon.isPending
                  ? 'Saving...'
                  : editingId
                    ? 'Update Coupon'
                    : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
