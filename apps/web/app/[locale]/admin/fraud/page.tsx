'use client';

import {
  ShieldAlert,
  Search,
  Plus,
  X,
  Trash2,
  Loader2,
  PhoneCall,
  Ban,
  AlertTriangle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  useBlocklist,
  useAddBlocklist,
  useRemoveBlocklist,
  useCourierCheck,
  useRiskyOrders,
  type CourierReport,
} from '@/hooks/useAdmin';
import { api } from '@/lib/api-client';
import { cn, formatPrice } from '@/lib/utils';

const FLAG_LABELS: Record<string, string> = {
  new_account: 'New account + COD',
  velocity: 'Many orders in 24h',
  repeat_cancelled: 'Repeat cancelled history',
  high_value_cod: 'High-value COD',
};

function riskTone(score: number | null) {
  if (score === null) return null;
  if (score >= 60)
    return { label: 'High', cls: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300' };
  if (score >= 30)
    return {
      label: 'Medium',
      cls: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    };
  return {
    label: 'Low',
    cls: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
  };
}

export default function AdminFraudPage() {
  // ── Settings ──
  const [settings, setSettings] = useState({
    fraudInternalEnabled: 'true',
    fraudCourierEnabled: 'false',
    courierApiUrl: '',
    courierApiKey: '',
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    api
      .get<{ success: boolean; data: Record<string, string> }>('/api/admin/settings')
      .then((res) => {
        if (res.data) setSettings((prev) => ({ ...prev, ...res.data }));
      })
      .catch(() => {})
      .finally(() => setSettingsLoaded(true));
  }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.put('/api/admin/settings', settings);
      toast.success('Fraud settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // ── Phone lookup ──
  const [lookupPhone, setLookupPhone] = useState('');
  const [report, setReport] = useState<CourierReport | null>(null);
  const courierCheck = useCourierCheck();

  const handleLookup = async () => {
    if (lookupPhone.replace(/\D/g, '').length < 10) {
      toast.error('Enter a valid phone number');
      return;
    }
    try {
      const res = await courierCheck.mutateAsync(lookupPhone);
      setReport(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lookup failed');
    }
  };

  // ── Blocklist ──
  const { data: blockRes, isLoading: loadingBlocklist } = useBlocklist();
  const blockEntries = blockRes?.data ?? [];
  const addBlock = useAddBlocklist();
  const removeBlock = useRemoveBlocklist();
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockForm, setBlockForm] = useState<{
    type: 'phone' | 'ip';
    value: string;
    reason: string;
  }>({
    type: 'phone',
    value: '',
    reason: '',
  });

  const handleAddBlock = async (type: 'phone' | 'ip', value: string, reason: string) => {
    try {
      await addBlock.mutateAsync({ type, value, reason: reason || null });
      toast.success(`Blocked ${type}: ${value}`);
      setBlockDialogOpen(false);
      setBlockForm({ type: 'phone', value: '', reason: '' });
    } catch {
      toast.error('Failed to add to blocklist');
    }
  };

  const handleRemoveBlock = async (id: string, value: string) => {
    if (!confirm(`Unblock ${value}?`)) return;
    try {
      await removeBlock.mutateAsync(id);
      toast.success('Removed from blocklist');
    } catch {
      toast.error('Failed to remove');
    }
  };

  // ── Risky orders ──
  const { data: riskyRes, isLoading: loadingRisky } = useRiskyOrders();
  const riskyOrders = riskyRes?.data ?? [];

  const inputCls =
    'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
          <ShieldAlert className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-heading-lg text-foreground font-bold">Fraud Protection</h1>
          <p className="text-muted-foreground text-xs">
            Fake order detection, phone history checks and blocklist
          </p>
        </div>
      </div>

      {/* ── Settings ── */}
      <div className="border-border bg-card space-y-4 rounded-2xl border p-6">
        <h2 className="text-foreground text-sm font-semibold">Detection Settings</h2>
        {!settingsLoaded ? (
          <div className="bg-muted h-24 animate-pulse rounded-lg" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="border-border flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3">
                <div>
                  <p className="text-foreground text-sm font-medium">Internal risk scoring</p>
                  <p className="text-muted-foreground text-xs">
                    Velocity, new-account, cancelled-history checks on every order
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.fraudInternalEnabled !== 'false'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      fraudInternalEnabled: e.target.checked ? 'true' : 'false',
                    })
                  }
                  className="border-border h-4 w-4 rounded accent-emerald-500"
                />
              </label>
              <label className="border-border flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3">
                <div>
                  <p className="text-foreground text-sm font-medium">Courier API check</p>
                  <p className="text-muted-foreground text-xs">
                    Delivery success-rate lookup via aggregator (cached 24h)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.fraudCourierEnabled === 'true'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      fraudCourierEnabled: e.target.checked ? 'true' : 'false',
                    })
                  }
                  className="border-border h-4 w-4 rounded accent-emerald-500"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-foreground text-xs font-medium">Courier API URL</label>
                <input
                  value={settings.courierApiUrl}
                  onChange={(e) =>
                    setSettings({ ...settings, courierApiUrl: e.target.value.trim() })
                  }
                  placeholder="https://bdcourier.com/api/courier-check (default)"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-foreground text-xs font-medium">Courier API Key</label>
                <input
                  type="password"
                  value={settings.courierApiKey}
                  onChange={(e) =>
                    setSettings({ ...settings, courierApiKey: e.target.value.trim() })
                  }
                  placeholder="API key (kept secret)"
                  className={inputCls}
                />
              </div>
            </div>
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </>
        )}
      </div>

      {/* ── Phone lookup ── */}
      <div className="border-border bg-card space-y-4 rounded-2xl border p-6">
        <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <PhoneCall className="h-4 w-4 text-emerald-500" /> Customer Phone Check
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={lookupPhone}
            onChange={(e) => setLookupPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            placeholder="01XXXXXXXXX"
            className={cn(inputCls, 'max-w-xs')}
          />
          <button
            onClick={handleLookup}
            disabled={courierCheck.isPending}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
          >
            {courierCheck.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Check
          </button>
          {report && !report.error && (
            <button
              onClick={() => handleAddBlock('phone', report.phone, 'Blocked from phone check')}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
            >
              <Ban className="h-3.5 w-3.5" /> Block this phone
            </button>
          )}
        </div>

        {report &&
          (report.error ? (
            <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {report.error}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <ReportStat label="Total Parcels" value={String(report.total)} />
                <ReportStat label="Delivered" value={String(report.success)} tone="positive" />
                <ReportStat
                  label="Cancelled"
                  value={String(report.cancelled)}
                  tone={report.cancelled > 0 ? 'negative' : undefined}
                />
                <ReportStat
                  label="Success Rate"
                  value={`${report.successRatio}%`}
                  tone={report.successRatio >= 70 ? 'positive' : 'negative'}
                />
              </div>
              {report.byCourier.length > 0 && (
                <div className="border-border overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-border bg-muted/40 text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                        <th className="px-4 py-2.5 font-medium">Courier</th>
                        <th className="px-4 py-2.5 text-right font-medium">Total</th>
                        <th className="px-4 py-2.5 text-right font-medium">Delivered</th>
                        <th className="px-4 py-2.5 text-right font-medium">Cancelled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byCourier.map((row) => (
                        <tr key={row.name} className="border-border/60 border-b last:border-0">
                          <td className="text-foreground px-4 py-2.5 font-medium capitalize">
                            {row.name}
                          </td>
                          <td className="text-muted-foreground px-4 py-2.5 text-right">
                            {row.total}
                          </td>
                          <td className="px-4 py-2.5 text-right text-emerald-600 dark:text-emerald-400">
                            {row.success}
                          </td>
                          <td className="px-4 py-2.5 text-right text-red-500">{row.cancelled}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-muted-foreground text-[11px]">
                Checked {new Date(report.checkedAt).toLocaleString()}{' '}
                {report.cached && '(from 24h cache)'}
              </p>
            </div>
          ))}
      </div>

      {/* ── Blocklist ── */}
      <div className="border-border bg-card space-y-4 rounded-2xl border p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
            <Ban className="h-4 w-4 text-red-500" /> Blocklist ({blockEntries.length})
          </h2>
          <button
            onClick={() => setBlockDialogOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
          >
            <Plus className="h-3.5 w-3.5" /> Add Entry
          </button>
        </div>
        {loadingBlocklist ? (
          <div className="bg-muted h-20 animate-pulse rounded-lg" />
        ) : blockEntries.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No blocked phones or IPs.
          </p>
        ) : (
          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border bg-muted/40 text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Value</th>
                  <th className="px-4 py-2.5 font-medium">Reason</th>
                  <th className="px-4 py-2.5 font-medium">Added</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {blockEntries.map((entry) => (
                  <tr key={entry.id} className="border-border/60 border-b last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="bg-muted rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase">
                        {entry.type}
                      </span>
                    </td>
                    <td className="text-foreground px-4 py-2.5 font-mono">{entry.value}</td>
                    <td className="text-muted-foreground px-4 py-2.5">{entry.reason ?? '—'}</td>
                    <td className="text-muted-foreground px-4 py-2.5">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleRemoveBlock(entry.id, entry.value)}
                        aria-label="Remove"
                        className="text-muted-foreground/70 rounded-lg p-1.5 hover:bg-red-50 hover:text-red-500 hover:dark:bg-red-950/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Risky orders ── */}
      <div className="border-border bg-card space-y-4 rounded-2xl border p-6">
        <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Flagged Orders
        </h2>
        {loadingRisky ? (
          <div className="bg-muted h-24 animate-pulse rounded-lg" />
        ) : riskyOrders.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">No flagged orders. 🎉</p>
        ) : (
          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border bg-muted/40 text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                  <th className="px-4 py-2.5 font-medium">Order</th>
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 font-medium">Phone</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  <th className="px-4 py-2.5 font-medium">Risk</th>
                  <th className="px-4 py-2.5 font-medium">Flags</th>
                </tr>
              </thead>
              <tbody>
                {riskyOrders.map((order) => {
                  const tone = riskTone(order.riskScore);
                  let flags: string[] = [];
                  try {
                    flags = order.riskFlags ? JSON.parse(order.riskFlags) : [];
                  } catch {
                    flags = [];
                  }
                  return (
                    <tr key={order.id} className="border-border/60 border-b last:border-0">
                      <td className="text-foreground px-4 py-2.5 font-mono text-xs">
                        {order.orderNumber}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            image={order.customerImage}
                            name={order.customerName}
                            size="sm"
                          />
                          <span className="text-foreground">{order.customerName ?? '—'}</span>
                        </div>
                      </td>
                      <td className="text-muted-foreground px-4 py-2.5 font-mono text-xs">
                        {order.customerPhone ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-4 py-2.5">
                        {tone && (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                              tone.cls
                            )}
                          >
                            {tone.label} ({order.riskScore})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {flags.map((flag) => (
                            <span
                              key={flag}
                              className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px]"
                              title={FLAG_LABELS[flag] ?? flag}
                            >
                              {FLAG_LABELS[flag] ?? flag}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add blocklist dialog ── */}
      {blockDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBlockDialogOpen(false)} />
          <div className="bg-card animate-in fade-in zoom-in-95 relative w-full max-w-md rounded-2xl p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-foreground text-lg font-semibold">Block Phone / IP</h3>
              <button
                onClick={() => setBlockDialogOpen(false)}
                className="text-muted-foreground/70 hover:bg-muted rounded-full p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">Type</label>
                <select
                  value={blockForm.type}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, type: e.target.value as 'phone' | 'ip' })
                  }
                  className={inputCls}
                >
                  <option value="phone">Phone</option>
                  <option value="ip">IP Address</option>
                </select>
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  {blockForm.type === 'phone' ? 'Phone Number' : 'IP Address'}
                </label>
                <input
                  value={blockForm.value}
                  onChange={(e) => setBlockForm({ ...blockForm, value: e.target.value })}
                  placeholder={blockForm.type === 'phone' ? '01XXXXXXXXX' : '103.120.x.x'}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  Reason (optional)
                </label>
                <input
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                  placeholder="e.g. 3 fake COD orders"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => setBlockDialogOpen(false)}
                className="border-border text-foreground hover:bg-muted/50 flex-1 rounded-lg border py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddBlock(blockForm.type, blockForm.value, blockForm.reason)}
                disabled={addBlock.isPending || !blockForm.value.trim()}
                className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addBlock.isPending ? 'Blocking...' : 'Block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'negative';
}) {
  return (
    <div className="border-border bg-muted/30 rounded-xl border p-4">
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
    </div>
  );
}
