'use client';

import {
  Calculator,
  Download,
  Loader2,
  Plus,
  X,
  Trash2,
  Edit3,
  Truck,
  Receipt,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useSuppliers,
  useCreateSupplier,
  usePurchases,
  useCreatePurchase,
  useUpdatePurchase,
  usePnl,
  type Expense,
  type PnlReport,
  type Supplier,
} from '@/hooks/useAdmin';
import { api } from '@/lib/api-client';
import { exportPnlToXlsx } from '@/lib/export-excel';
import { cn, formatPrice } from '@/lib/utils';

const EXPENSE_CATEGORIES = [
  'Advertising',
  'Rent',
  'Salary',
  'Packaging',
  'Courier',
  'Utilities',
  'Other',
];

const PRESETS = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
] as const;

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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
  return {};
}

const inputCls =
  'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300';

export default function AdminAccountingPage() {
  const [preset, setPreset] = useState<string>('30d');
  const [range, setRange] = useState<{ from?: string; to?: string }>(() => presetRange('30d'));
  const [exporting, setExporting] = useState(false);

  const { data: pnlRes, isLoading: pnlLoading } = usePnl(range.from, range.to);
  const pnl = pnlRes?.data;
  const { data: expensesRes, isLoading: expensesLoading } = useExpenses({
    from: range.from,
    to: range.to,
  });
  const expenses = expensesRes?.data ?? [];

  const applyPreset = (key: string) => {
    setPreset(key);
    setRange(presetRange(key));
  };

  const handleExport = async () => {
    if (!pnl) return;
    setExporting(true);
    try {
      // Re-fetch with `detail=1` so the workbook gets the row-level sheets
      // (per-order P&L, product profitability, purchase ledger).
      const detailed = await api.get<{ success: boolean; data: PnlReport }>(
        '/api/admin/accounting/pnl',
        { params: { from: range.from, to: range.to, detail: 1 } }
      );
      await exportPnlToXlsx(detailed.data, expenses, range);
      toast.success('Excel file downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-500/10 text-lime-600 dark:text-lime-400">
          <Calculator className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-heading-lg text-foreground font-bold">Accounting</h1>
          <p className="text-muted-foreground text-xs">
            Profit &amp; loss, expenses, suppliers and dues
          </p>
        </div>
      </div>

      {/* ── P&L ── */}
      <div className="border-border bg-card space-y-5 rounded-2xl border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-emerald-500" /> Profit &amp; Loss
          </h2>
          <button
            onClick={handleExport}
            disabled={!pnl || exporting}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export to Excel
          </button>
        </div>

        {/* Time frame */}
        <div className="flex flex-wrap items-center gap-3">
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
              className={cn(inputCls, 'w-auto')}
            />
            <span className="text-muted-foreground">→</span>
            <input
              type="date"
              value={range.to ?? ''}
              onChange={(e) => {
                setPreset('');
                setRange((r) => ({ ...r, to: e.target.value || undefined }));
              }}
              className={cn(inputCls, 'w-auto')}
            />
          </div>
        </div>

        {pnlLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-muted h-20 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : pnl ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <PnlCard
                label={`Revenue (${pnl.orderCount} orders)`}
                value={formatPrice(pnl.revenue)}
              />
              <PnlCard label="COGS" value={formatPrice(pnl.cogs)} />
              <PnlCard
                label="Gross Profit"
                value={formatPrice(pnl.grossProfit)}
                tone={pnl.grossProfit >= 0 ? 'positive' : 'negative'}
              />
              <PnlCard
                label="Expenses"
                value={formatPrice(pnl.totalExpenses)}
                hint={
                  pnl.supplierPayments > 0
                    ? `incl. ${formatPrice(pnl.supplierPayments)} supplier payments`
                    : undefined
                }
              />
              <PnlCard
                label="Supplier Purchases"
                value={formatPrice(pnl.purchaseTotal)}
                hint={
                  pnl.purchaseTotal > 0
                    ? `${formatPrice(pnl.supplierPayments)} paid · ${formatPrice(
                        Math.max(0, pnl.purchaseTotal - pnl.supplierPayments)
                      )} due`
                    : undefined
                }
              />
              <PnlCard
                label="Net Profit"
                value={formatPrice(pnl.netProfit)}
                tone={pnl.netProfit >= 0 ? 'positive' : 'negative'}
                emphasize
              />
            </div>
            <div className="text-muted-foreground grid gap-3 text-xs sm:grid-cols-4">
              <p>
                Units sold:{' '}
                <span className="text-foreground font-semibold">
                  {pnl.unitsSold.toLocaleString()}
                </span>
              </p>
              <p>
                Shipping income:{' '}
                <span className="text-foreground font-semibold">
                  {formatPrice(pnl.shippingIncome)}
                </span>
              </p>
              <p>
                Discounts given:{' '}
                <span className="text-foreground font-semibold">
                  {formatPrice(pnl.discountsGiven)}
                </span>
              </p>
              <p>
                Paid to suppliers:{' '}
                <span className="text-foreground font-semibold">
                  {formatPrice(pnl.supplierPayments)}
                </span>
              </p>
            </div>
            {pnl.expensesByCategory.length > 0 && (
              <div className="border-border overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-border bg-muted/40 text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                      <th className="px-4 py-2.5 font-medium">Expense Category</th>
                      <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                      <th className="px-4 py-2.5 text-right font-medium">% of Expenses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pnl.expensesByCategory.map((row) => (
                      <tr key={row.category} className="border-border/60 border-b last:border-0">
                        <td className="text-foreground px-4 py-2.5 font-medium">{row.category}</td>
                        <td className="px-4 py-2.5 text-right">{formatPrice(row.total)}</td>
                        <td className="text-muted-foreground px-4 py-2.5 text-right">
                          {pnl.totalExpenses > 0
                            ? Math.round((row.total / pnl.totalExpenses) * 100)
                            : 0}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <p className="text-muted-foreground py-6 text-center text-sm">Failed to load P&amp;L.</p>
        )}
      </div>

      <ExpensesSection
        expenses={expenses}
        loading={expensesLoading}
        totalAmount={expensesRes?.meta?.totalAmount ?? 0}
      />
      <SuppliersSection />
    </div>
  );
}

function PnlCard({
  label,
  value,
  tone,
  emphasize,
  hint,
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'negative';
  emphasize?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        'border-border rounded-xl border p-4',
        emphasize ? 'border-emerald-500/30 bg-emerald-500/5' : 'bg-muted/30'
      )}
    >
      <p className="text-muted-foreground text-[11px] uppercase tracking-wide">{label}</p>
      <p
        className={cn(
          'mt-1 text-lg font-bold',
          tone === 'positive' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'negative' && 'text-red-500',
          !tone && 'text-foreground'
        )}
      >
        {value}
      </p>
      {hint && <p className="text-muted-foreground/70 mt-0.5 text-[10px]">{hint}</p>}
    </div>
  );
}

// ── Expenses ──
function ExpensesSection({
  expenses,
  loading,
  totalAmount,
}: {
  expenses: Expense[];
  loading: boolean;
  totalAmount: number;
}) {
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: 'Advertising',
    amount: '',
    date: toDateInput(new Date()),
    note: '',
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ category: 'Advertising', amount: '', date: toDateInput(new Date()), note: '' });
    setDialogOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setForm({
      category: expense.category,
      amount: String(expense.amount),
      date: expense.date,
      note: expense.note ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    const payload = {
      category: form.category,
      amount,
      date: form.date,
      note: form.note.trim() || null,
    };
    try {
      if (editingId) {
        await updateExpense.mutateAsync({ id: editingId, data: payload });
        toast.success('Expense updated');
      } else {
        await createExpense.mutateAsync(payload);
        toast.success('Expense added');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Failed to save expense');
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!confirm(`Delete ${expense.category} expense of ${formatPrice(expense.amount)}?`)) return;
    try {
      await deleteExpense.mutateAsync(expense.id);
      toast.success('Expense deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const saving = createExpense.isPending || updateExpense.isPending;

  return (
    <div className="border-border bg-card space-y-4 rounded-2xl border p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <Receipt className="h-4 w-4 text-amber-500" /> Expenses
          <span className="text-muted-foreground text-xs font-normal">
            ({formatPrice(totalAmount)} in period)
          </span>
        </h2>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
        >
          <Plus className="h-3.5 w-3.5" /> Add Expense
        </button>
      </div>

      {loading ? (
        <div className="bg-muted h-24 animate-pulse rounded-lg" />
      ) : expenses.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          No expenses recorded in this period.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/40 text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Note</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-border/60 hover:bg-muted/30 border-b last:border-0"
                >
                  <td className="text-muted-foreground px-4 py-2.5">{expense.date}</td>
                  <td className="text-foreground px-4 py-2.5 font-medium">{expense.category}</td>
                  <td className="text-foreground px-4 py-2.5 text-right font-medium">
                    {formatPrice(expense.amount)}
                  </td>
                  <td className="text-muted-foreground max-w-[240px] truncate px-4 py-2.5">
                    {expense.note ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(expense)}
                        aria-label="Edit"
                        className="text-muted-foreground/70 hover:bg-muted hover:text-foreground rounded-lg p-1.5"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense)}
                        aria-label="Delete"
                        className="text-muted-foreground/70 rounded-lg p-1.5 hover:bg-red-50 hover:text-red-500 hover:dark:bg-red-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDialogOpen(false)} />
          <div className="bg-card animate-in fade-in zoom-in-95 relative w-full max-w-md rounded-2xl p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-foreground text-lg font-semibold">
                {editingId ? 'Edit Expense' : 'New Expense'}
              </h3>
              <button
                onClick={() => setDialogOpen(false)}
                className="text-muted-foreground/70 hover:bg-muted rounded-full p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className={inputCls}
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">
                    Amount (৳)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="5000"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  Note (optional)
                </label>
                <input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="e.g. Facebook boost for Eid campaign"
                  className={inputCls}
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
                disabled={saving || !form.amount || !form.date}
                className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Suppliers & dues ──
function SuppliersSection() {
  const { data: suppliersRes, isLoading } = useSuppliers();
  const suppliers = (suppliersRes?.data ?? []).filter((s) => s.isActive);
  const createSupplier = useCreateSupplier();
  const createPurchase = useCreatePurchase();
  const updatePurchase = useUpdatePurchase();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: purchasesRes, isLoading: purchasesLoading } = usePurchases(expandedId);
  const purchases = purchasesRes?.data ?? [];

  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', address: '', note: '' });

  const [purchaseDialogFor, setPurchaseDialogFor] = useState<Supplier | null>(null);
  const [purchaseForm, setPurchaseForm] = useState({
    description: '',
    totalAmount: '',
    paidAmount: '',
    date: toDateInput(new Date()),
  });

  const handleCreateSupplier = async () => {
    if (!supplierForm.name.trim()) return;
    try {
      await createSupplier.mutateAsync({
        name: supplierForm.name.trim(),
        phone: supplierForm.phone.trim() || null,
        address: supplierForm.address.trim() || null,
        note: supplierForm.note.trim() || null,
      });
      toast.success('Supplier added');
      setSupplierDialogOpen(false);
      setSupplierForm({ name: '', phone: '', address: '', note: '' });
    } catch {
      toast.error('Failed to add supplier');
    }
  };

  const handleCreatePurchase = async () => {
    if (!purchaseDialogFor) return;
    const totalAmount = Number(purchaseForm.totalAmount);
    const paidAmount = Number(purchaseForm.paidAmount) || 0;
    if (!totalAmount || totalAmount <= 0) {
      toast.error('Enter a valid total amount');
      return;
    }
    if (paidAmount > totalAmount) {
      toast.error('Paid amount cannot exceed total');
      return;
    }
    try {
      await createPurchase.mutateAsync({
        supplierId: purchaseDialogFor.id,
        description: purchaseForm.description.trim() || null,
        totalAmount,
        paidAmount,
        date: purchaseForm.date,
      });
      toast.success('Purchase recorded');
      setPurchaseDialogFor(null);
      setPurchaseForm({
        description: '',
        totalAmount: '',
        paidAmount: '',
        date: toDateInput(new Date()),
      });
    } catch {
      toast.error('Failed to record purchase');
    }
  };

  const handleRecordPayment = async (
    purchaseId: string,
    currentPaid: number,
    totalAmount: number
  ) => {
    const input = prompt(`Payment amount (due: ${formatPrice(totalAmount - currentPaid)}):`);
    if (!input) return;
    const payment = Number(input);
    if (!payment || payment <= 0) {
      toast.error('Invalid amount');
      return;
    }
    const newPaid = Math.min(currentPaid + payment, totalAmount);
    try {
      await updatePurchase.mutateAsync({ id: purchaseId, data: { paidAmount: newPaid } });
      toast.success(`Payment of ${formatPrice(payment)} recorded`);
    } catch {
      toast.error('Failed to record payment');
    }
  };

  return (
    <div className="border-border bg-card space-y-4 rounded-2xl border p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <Truck className="h-4 w-4 text-sky-500" /> Suppliers &amp; Dues
        </h2>
        <button
          onClick={() => setSupplierDialogOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
        >
          <Plus className="h-3.5 w-3.5" /> Add Supplier
        </button>
      </div>

      {isLoading ? (
        <div className="bg-muted h-24 animate-pulse rounded-lg" />
      ) : suppliers.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">No suppliers yet.</p>
      ) : (
        <div className="space-y-3">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="border-border rounded-xl border">
              <button
                onClick={() => setExpandedId(expandedId === supplier.id ? null : supplier.id)}
                className="hover:bg-muted/30 flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div>
                  <p className="text-foreground text-sm font-semibold">{supplier.name}</p>
                  {supplier.phone && (
                    <p className="text-muted-foreground text-xs">{supplier.phone}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">
                    Purchased:{' '}
                    <span className="text-foreground font-semibold">
                      {formatPrice(supplier.totalPurchased)}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Paid:{' '}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatPrice(supplier.totalPaid)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 font-semibold',
                      supplier.due > 0
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                    )}
                  >
                    Due: {formatPrice(supplier.due)}
                  </span>
                  {expandedId === supplier.id ? (
                    <ChevronUp className="text-muted-foreground h-4 w-4" />
                  ) : (
                    <ChevronDown className="text-muted-foreground h-4 w-4" />
                  )}
                </div>
              </button>

              {expandedId === supplier.id && (
                <div className="border-border space-y-3 border-t px-4 py-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setPurchaseDialogFor(supplier)}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Purchase
                    </button>
                  </div>
                  {purchasesLoading ? (
                    <div className="bg-muted h-16 animate-pulse rounded-lg" />
                  ) : purchases.length === 0 ? (
                    <p className="text-muted-foreground py-3 text-center text-xs">
                      No purchases recorded.
                    </p>
                  ) : (
                    <div className="border-border overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-border bg-muted/40 text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                            <th className="px-3 py-2 font-medium">Date</th>
                            <th className="px-3 py-2 font-medium">Description</th>
                            <th className="px-3 py-2 text-right font-medium">Total</th>
                            <th className="px-3 py-2 text-right font-medium">Paid</th>
                            <th className="px-3 py-2 text-right font-medium">Due</th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {purchases.map((purchase) => {
                            const due = purchase.totalAmount - purchase.paidAmount;
                            return (
                              <tr
                                key={purchase.id}
                                className="border-border/60 border-b last:border-0"
                              >
                                <td className="text-muted-foreground px-3 py-2">{purchase.date}</td>
                                <td className="text-foreground max-w-[200px] truncate px-3 py-2">
                                  {purchase.description ?? '—'}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {formatPrice(purchase.totalAmount)}
                                </td>
                                <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400">
                                  {formatPrice(purchase.paidAmount)}
                                </td>
                                <td
                                  className={cn(
                                    'px-3 py-2 text-right font-medium',
                                    due > 0 ? 'text-red-500' : 'text-muted-foreground'
                                  )}
                                >
                                  {formatPrice(due)}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {due > 0 && (
                                    <button
                                      onClick={() =>
                                        handleRecordPayment(
                                          purchase.id,
                                          purchase.paidAmount,
                                          purchase.totalAmount
                                        )
                                      }
                                      className="border-border text-foreground rounded-lg border px-2 py-1 text-[11px] font-medium hover:border-emerald-300 hover:text-emerald-600"
                                    >
                                      Record Payment
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add supplier dialog */}
      {supplierDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSupplierDialogOpen(false)}
          />
          <div className="bg-card animate-in fade-in zoom-in-95 relative w-full max-w-md rounded-2xl p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-foreground text-lg font-semibold">New Supplier</h3>
              <button
                onClick={() => setSupplierDialogOpen(false)}
                className="text-muted-foreground/70 hover:bg-muted rounded-full p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">Name</label>
                <input
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="e.g. Dhaka Mobile House"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">Phone</label>
                  <input
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    placeholder="01XXXXXXXXX"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">
                    Address
                  </label>
                  <input
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    placeholder="Motijheel, Dhaka"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  Note (optional)
                </label>
                <input
                  value={supplierForm.note}
                  onChange={(e) => setSupplierForm({ ...supplierForm, note: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => setSupplierDialogOpen(false)}
                className="border-border text-foreground hover:bg-muted/50 flex-1 rounded-lg border py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSupplier}
                disabled={createSupplier.isPending || !supplierForm.name.trim()}
                className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createSupplier.isPending ? 'Saving...' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add purchase dialog */}
      {purchaseDialogFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setPurchaseDialogFor(null)}
          />
          <div className="bg-card animate-in fade-in zoom-in-95 relative w-full max-w-md rounded-2xl p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-foreground text-lg font-semibold">
                Purchase — {purchaseDialogFor.name}
              </h3>
              <button
                onClick={() => setPurchaseDialogFor(null)}
                className="text-muted-foreground/70 hover:bg-muted rounded-full p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  Description
                </label>
                <input
                  value={purchaseForm.description}
                  onChange={(e) =>
                    setPurchaseForm({ ...purchaseForm, description: e.target.value })
                  }
                  placeholder="e.g. 20x iPhone 15 cases"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">
                    Total (৳)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={purchaseForm.totalAmount}
                    onChange={(e) =>
                      setPurchaseForm({ ...purchaseForm, totalAmount: e.target.value })
                    }
                    placeholder="50000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">
                    Paid Now (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={purchaseForm.paidAmount}
                    onChange={(e) =>
                      setPurchaseForm({ ...purchaseForm, paidAmount: e.target.value })
                    }
                    placeholder="0"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">Date</label>
                <input
                  type="date"
                  value={purchaseForm.date}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => setPurchaseDialogFor(null)}
                className="border-border text-foreground hover:bg-muted/50 flex-1 rounded-lg border py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePurchase}
                disabled={createPurchase.isPending || !purchaseForm.totalAmount}
                className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createPurchase.isPending ? 'Saving...' : 'Record Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
