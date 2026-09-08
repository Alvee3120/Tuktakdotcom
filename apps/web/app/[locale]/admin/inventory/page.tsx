'use client';

import {
  Plus,
  X,
  Warehouse,
  MapPin,
  Edit3,
  Eye,
  EyeOff,
  Download,
  Loader2,
  PackageSearch,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { StatCard } from '@/components/dashboard/StatCard';
import {
  useInventories,
  useCreateInventory,
  useUpdateInventory,
  useInventoryReport,
  type AdminInventory,
} from '@/hooks/useAdmin';
import { exportReportToXlsx } from '@/lib/export-excel';
import { cn, formatPrice } from '@/lib/utils';

type FormState = { name: string; location: string; description: string };
const emptyForm: FormState = { name: '', location: '', description: '' };

/** yyyy-mm-dd in local time for <input type="date"> */
function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const PRESETS = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
] as const;

function presetRange(key: string): { from?: string; to?: string } {
  const today = new Date();
  if (key === '7d') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: toDateInput(from), to: toDateInput(today) };
  }
  if (key === '30d') {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: toDateInput(from), to: toDateInput(today) };
  }
  if (key === 'month') {
    return {
      from: toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: toDateInput(today),
    };
  }
  return {}; // all time
}

export default function AdminInventoryPage() {
  const { data: invRes, isLoading } = useInventories();
  const inventories = invRes?.data ?? [];
  const createInventory = useCreateInventory();
  const updateInventory = useUpdateInventory();

  // ── CRUD dialog state ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  // ── Report state ──
  const [selectedId, setSelectedId] = useState<string>('all');
  const [preset, setPreset] = useState<string>('30d');
  const [range, setRange] = useState<{ from?: string; to?: string }>(() => presetRange('30d'));
  const [exporting, setExporting] = useState(false);

  const { data: reportRes, isLoading: reportLoading } = useInventoryReport(
    selectedId,
    range.from,
    range.to
  );
  const report = reportRes?.data;

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };
  const openEdit = (inv: AdminInventory) => {
    setEditingId(inv.id);
    setForm({ name: inv.name, location: inv.location ?? '', description: inv.description ?? '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      location: form.location.trim() || null,
      description: form.description.trim() || null,
    };
    try {
      if (editingId) {
        await updateInventory.mutateAsync({ id: editingId, data: payload });
        toast.success('Inventory updated');
      } else {
        await createInventory.mutateAsync(payload);
        toast.success('Inventory created');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Failed to save inventory');
    }
  };

  const toggleActive = async (inv: AdminInventory) => {
    try {
      await updateInventory.mutateAsync({ id: inv.id, data: { isActive: !inv.isActive } });
      toast.success(inv.isActive ? 'Inventory deactivated' : 'Inventory activated');
    } catch {
      toast.error('Failed to update inventory');
    }
  };

  const applyPreset = (key: string) => {
    setPreset(key);
    setRange(presetRange(key));
  };

  const handleExport = async () => {
    if (!report) return;
    setExporting(true);
    try {
      const invName =
        selectedId === 'all'
          ? 'All Inventories'
          : (inventories.find((i) => i.id === selectedId)?.name ?? 'Inventory');
      await exportReportToXlsx(report, invName, range);
      toast.success('Excel file downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const totalUnits = inventories.reduce((s, i) => s + (i.totalUnits ?? 0), 0);
  const activeCount = inventories.filter((i) => i.isActive).length;
  const saving = createInventory.isPending || updateInventory.isPending;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Inventories"
          value={String(inventories.length)}
          percentageLabel={`${activeCount} active`}
        />
        <StatCard
          title="Total Units in Stock"
          value={totalUnits.toLocaleString()}
          percentageLabel="across all inventories"
        />
        <StatCard
          title="Stock Value"
          value={report ? formatPrice(report.summary.stock_value) : '—'}
          percentageLabel="at cost price"
        />
      </div>

      {/* ── Inventory list ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-foreground text-lg font-semibold">Inventories</h2>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-600"
        >
          <Plus className="h-4 w-4" /> Add Inventory
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-muted h-32 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : inventories.length === 0 ? (
        <div className="border-border flex flex-col items-center justify-center rounded-2xl border border-dashed py-14 text-center">
          <Warehouse className="text-muted-foreground/30 h-10 w-10" />
          <p className="text-foreground mt-3 text-sm font-medium">No inventories yet</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Create your first inventory (godown) to start tracking stock per location.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inventories.map((inv) => (
            <div
              key={inv.id}
              className={cn(
                'border-border bg-card rounded-2xl border p-5',
                !inv.isActive && 'opacity-60'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Warehouse className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-foreground font-semibold">{inv.name}</p>
                    {inv.location && (
                      <p className="text-muted-foreground flex items-center gap-1 text-xs">
                        <MapPin className="h-3 w-3" /> {inv.location}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(inv)}
                    aria-label="Edit inventory"
                    className="text-muted-foreground/70 hover:bg-muted hover:text-foreground rounded-full p-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleActive(inv)}
                    aria-label={inv.isActive ? 'Deactivate' : 'Activate'}
                    className="text-muted-foreground/70 hover:bg-muted hover:text-foreground rounded-full p-1.5"
                  >
                    {inv.isActive ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="bg-muted/50 rounded-lg py-2">
                  <p className="text-foreground text-lg font-bold">{inv.skuCount}</p>
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                    Products
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg py-2">
                  <p className="text-foreground text-lg font-bold">
                    {inv.totalUnits.toLocaleString()}
                  </p>
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Units</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Report ── */}
      <div className="border-border bg-card space-y-5 rounded-2xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-foreground text-lg font-semibold">Inventory Report</h2>
          <button
            onClick={handleExport}
            disabled={!report || report.rows.length === 0 || exporting}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export to Excel
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="border-border bg-card rounded-lg border px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
          >
            <option value="all">All Inventories</option>
            {inventories.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.name}
              </option>
            ))}
          </select>

          <div className="border-border flex items-center gap-1 rounded-lg border p-1">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  preset === p.key
                    ? 'bg-emerald-500 text-white'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={range.from ?? ''}
              onChange={(e) => {
                setPreset('');
                setRange((r) => ({ ...r, from: e.target.value || undefined }));
              }}
              className="border-border bg-card rounded-lg border px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
            />
            <span className="text-muted-foreground">→</span>
            <input
              type="date"
              value={range.to ?? ''}
              onChange={(e) => {
                setPreset('');
                setRange((r) => ({ ...r, to: e.target.value || undefined }));
              }}
              className="border-border bg-card rounded-lg border px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
            />
          </div>
        </div>

        {/* Summary cards */}
        {reportLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-muted h-20 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : report ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryCard label="Units Sold" value={report.summary.units_sold.toLocaleString()} />
              <SummaryCard label="Revenue" value={formatPrice(report.summary.revenue)} />
              <SummaryCard label="Cost" value={formatPrice(report.summary.cost)} />
              <SummaryCard
                label={`Profit (${report.summary.margin.toFixed(1)}%)`}
                value={formatPrice(report.summary.profit)}
                tone={report.summary.profit >= 0 ? 'positive' : 'negative'}
              />
              <SummaryCard
                label="Stock Value"
                value={formatPrice(report.summary.stock_value)}
                sub={`${report.summary.stock_units.toLocaleString()} units`}
              />
            </div>

            {/* Product table */}
            {report.rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <PackageSearch className="text-muted-foreground/30 h-9 w-9" />
                <p className="text-foreground mt-3 text-sm font-medium">No sales in this period</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Try a wider time frame or a different inventory.
                </p>
              </div>
            ) : (
              <div className="border-border overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-border bg-muted/40 text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">SKU</th>
                      <th className="px-4 py-3 text-right font-medium">Unit Cost</th>
                      <th className="px-4 py-3 text-right font-medium">Avg Sale</th>
                      <th className="px-4 py-3 text-right font-medium">Qty Sold</th>
                      <th className="px-4 py-3 text-right font-medium">Revenue</th>
                      <th className="px-4 py-3 text-right font-medium">Cost</th>
                      <th className="px-4 py-3 text-right font-medium">Profit</th>
                      <th className="px-4 py-3 text-right font-medium">In Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr
                        key={row.product_id}
                        className="border-border/60 hover:bg-muted/30 border-b last:border-0"
                      >
                        <td className="text-foreground max-w-[240px] truncate px-4 py-3 font-medium">
                          {row.name}
                        </td>
                        <td className="text-muted-foreground px-4 py-3 font-mono text-xs">
                          {row.sku ?? '—'}
                        </td>
                        <td className="text-muted-foreground px-4 py-3 text-right">
                          {row.unit_cost !== null ? formatPrice(row.unit_cost) : '—'}
                        </td>
                        <td className="text-muted-foreground px-4 py-3 text-right">
                          {formatPrice(Math.round(row.avg_sale_price ?? 0))}
                        </td>
                        <td className="text-foreground px-4 py-3 text-right font-medium">
                          {row.qty_sold}
                        </td>
                        <td className="text-foreground px-4 py-3 text-right font-medium">
                          {formatPrice(row.revenue)}
                        </td>
                        <td className="text-muted-foreground px-4 py-3 text-right">
                          {formatPrice(row.cost_total)}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-3 text-right font-semibold',
                            row.profit >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-destructive'
                          )}
                        >
                          {formatPrice(row.profit)}
                        </td>
                        <td className="text-muted-foreground px-4 py-3 text-right">
                          {row.current_stock}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <p className="text-muted-foreground py-8 text-center text-sm">Failed to load report.</p>
        )}
      </div>

      {/* ── Create/Edit Dialog ── */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDialogOpen(false)} />
          <div className="bg-card animate-in fade-in zoom-in-95 relative w-full max-w-md rounded-2xl p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-foreground text-lg font-semibold">
                {editingId ? 'Edit Inventory' : 'New Inventory'}
              </h3>
              <button
                onClick={() => setDialogOpen(false)}
                className="text-muted-foreground/70 hover:bg-muted rounded-full p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  Inventory Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Dhaka Godown"
                  className="border-border w-full rounded-lg border px-4 py-2.5 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  Location (optional)
                </label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Mirpur-10, Dhaka"
                  className="border-border w-full rounded-lg border px-4 py-2.5 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  Description (optional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Notes about this inventory..."
                  className="border-border w-full rounded-lg border px-4 py-2.5 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                />
              </div>
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
                disabled={saving || !form.name.trim()}
                className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update Inventory' : 'Create Inventory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'positive' | 'negative';
}) {
  return (
    <div className="border-border bg-muted/30 rounded-xl border p-4">
      <p className="text-muted-foreground text-[11px] uppercase tracking-wide">{label}</p>
      <p
        className={cn(
          'mt-1 text-lg font-bold',
          tone === 'positive' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'negative' && 'text-destructive',
          !tone && 'text-foreground'
        )}
      >
        {value}
      </p>
      {sub && <p className="text-muted-foreground text-[11px]">{sub}</p>}
    </div>
  );
}
