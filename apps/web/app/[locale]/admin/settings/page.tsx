'use client';

import {
  Save,
  Mail,
  Globe,
  Send,
  BarChart3,
  CreditCard,
  Truck,
  Store,
  Shield,
  MessageCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Settings as SettingsIcon,
  Smartphone,
  Wallet,
  Banknote,
  Sparkles,
  Code2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { SnippetsTab } from '@/components/admin/SnippetsTab';
import { SocialIcon } from '@/components/shared/SocialIcon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type SettingsTab =
  | 'store'
  | 'payment'
  | 'shipping'
  | 'email'
  | 'social'
  | 'chat'
  | 'seo'
  | 'marketing'
  | 'snippets';

const TABS: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { key: 'store', label: 'Store', icon: <Store className="h-4 w-4" /> },
  { key: 'payment', label: 'Payment', icon: <CreditCard className="h-4 w-4" /> },
  { key: 'shipping', label: 'Shipping', icon: <Truck className="h-4 w-4" /> },
  { key: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
  { key: 'social', label: 'Social', icon: <Send className="h-4 w-4" /> },
  { key: 'chat', label: 'Chat', icon: <MessageCircle className="h-4 w-4" /> },
  { key: 'seo', label: 'SEO', icon: <Globe className="h-4 w-4" /> },
  { key: 'marketing', label: 'Marketing', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'snippets', label: 'Snippets', icon: <Code2 className="h-4 w-4" /> },
];

type PaymentMethodConfig = {
  id: string;
  name: string;
  nameBn: string;
  enabled: boolean;
  icon: string;
  description: string;
  descriptionBn: string;
  requiresTransactionId: boolean;
};
type ShippingMethodConfig = {
  id: string;
  name: string;
  nameBn: string;
  enabled: boolean;
  cost: number;
  freeAbove: number;
  estimatedDays: string;
  estimatedDaysBn: string;
};

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  cod: <Banknote className="h-5 w-5" />,
  bkash: <Smartphone className="h-5 w-5" />,
  nagad: <Wallet className="h-5 w-5" />,
  sslcommerz: <CreditCard className="h-5 w-5" />,
};

const defaultPaymentMethods: PaymentMethodConfig[] = [
  {
    id: 'cod',
    name: 'Cash on Delivery',
    nameBn: 'Cash on Delivery',
    enabled: true,
    icon: 'Banknote',
    description: 'Pay when you receive your order',
    descriptionBn: 'Order peye payment korun',
    requiresTransactionId: false,
  },
  {
    id: 'bkash',
    name: 'bKash',
    nameBn: 'bKash',
    enabled: true,
    icon: 'Smartphone',
    description: 'Pay via bKash mobile wallet',
    descriptionBn: 'bKash mobile wallet er maddhome payment korun',
    requiresTransactionId: true,
  },
  {
    id: 'nagad',
    name: 'Nagad',
    nameBn: 'Nagad',
    enabled: true,
    icon: 'Wallet',
    description: 'Pay via Nagad digital wallet',
    descriptionBn: 'Nagad digital wallet er maddhome payment korun',
    requiresTransactionId: true,
  },
  {
    id: 'sslcommerz',
    name: 'SSLCommerz',
    nameBn: 'SSLCommerz',
    enabled: false,
    icon: 'CreditCard',
    description: 'Pay via card, mobile banking, or internet banking',
    descriptionBn: 'Card, mobile banking ba internet banking er maddhome payment korun',
    requiresTransactionId: false,
  },
];

const defaultShippingMethods: ShippingMethodConfig[] = [
  {
    id: 'inside-dhaka',
    name: 'Inside Dhaka',
    nameBn: 'Dhakar bhitore',
    enabled: true,
    cost: 70,
    freeAbove: 5000,
    estimatedDays: '1-2 days',
    estimatedDaysBn: '1-2 din',
  },
  {
    id: 'outside-dhaka',
    name: 'Outside Dhaka',
    nameBn: 'Dhakar baire',
    enabled: true,
    cost: 120,
    freeAbove: 5000,
    estimatedDays: '3-5 days',
    estimatedDaysBn: '3-5 din',
  },
];

/* ------------------------- tiny UI helpers ------------------------- */

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="relative inline-flex cursor-pointer items-center" aria-label={label}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <div className="bg-muted peer-checked:bg-primary h-6 w-11 rounded-full transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
    </label>
  );
}

function StatusPill({ active, hint }: { active: boolean; hint?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        active
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-muted text-muted-foreground'
      )}
    >
      {active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {active ? 'Live on storefront' : 'Hidden'}
      {hint && <span className="font-normal opacity-70">· {hint}</span>}
    </span>
  );
}

function SectionHeader({
  icon,
  iconBg,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', iconBg)}>
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-muted-foreground text-xs">{subtitle}</p>
      </div>
    </div>
  );
}

function LiveChatPreview({
  waEnabled,
  waPhone,
  msEnabled,
  msPage,
}: {
  waEnabled: boolean;
  waPhone: string;
  msEnabled: boolean;
  msPage: string;
}) {
  const showWA = waEnabled && waPhone.replace(/[^0-9]/g, '').length > 0;
  const showMS = msEnabled && msPage.trim().length > 0;
  return (
    <div className="border-border from-muted/70 via-muted/30 to-background relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
            <Store className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold">Tuktak storefront</span>
        </div>
        <span className="border-border bg-background text-muted-foreground rounded-full border px-2.5 py-1 text-[10px] font-medium">
          Bottom-right · every store page
        </span>
      </div>
      {/* Fake store content */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="border-border/70 bg-background/60 h-20 rounded-xl border border-dashed"
          />
        ))}
      </div>
      {/* Floating chat bubbles (mirrors the real storefront) */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2.5">
        {showMS && (
          <span className="ring-background flex h-11 w-11 items-center justify-center rounded-full bg-[#0084FF] text-white shadow-lg shadow-blue-500/30 ring-4">
            <SocialIcon platform="messenger" className="h-5 w-5" />
          </span>
        )}
        {showWA && (
          <span className="ring-background flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-500/30 ring-4">
            <SocialIcon platform="whatsapp" className="h-5 w-5" />
          </span>
        )}
        {!showWA && !showMS && (
          <span className="border-muted-foreground/40 text-muted-foreground rounded-xl border border-dashed px-3 py-2 text-[11px]">
            Enable a channel to see it here
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ page ------------------------------ */

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('chat');
  const [settings, setSettings] = useState({
    storeName: 'Tuktak',
    storeEmail: 'support@tuktakdot.com',
    storePhone: '+8801XXXXXXXXX',
    storeAddress: 'Dhaka, Bangladesh',
    fromName: 'Tuktak',
    fromEmail: 'noreply@tuktakdot.com',
    resendApiKey: '',
    facebook: '',
    instagram: '',
    youtube: '',
    whatsapp: '',
    is_whatsapp_enabled: 'false',
    whatsapp_mode: 'DIRECT_NUMBER',
    whatsapp_phone_number: '',
    whatsapp_phone_number_id: '',
    whatsapp_access_token: '',
    is_messenger_enabled: 'false',
    messenger_page_id: '',
    messenger_access_token: '',
    metaDescription: 'Premium electronics and gadgets in Bangladesh',
    metaKeywords: 'electronics, gadgets, smartphones, laptops, Bangladesh',
    trackingEnabled: 'true',
    gtmId: '',
    ga4Id: '',
    metaPixelId: '',
    metaCapiToken: '',
    metaTestEventCode: '',
    clarityId: '',
  });
  const [paymentMethods, setPaymentMethods] =
    useState<PaymentMethodConfig[]>(defaultPaymentMethods);
  const [shippingMethods, setShippingMethods] =
    useState<ShippingMethodConfig[]>(defaultShippingMethods);
  const [taxRate, setTaxRate] = useState('5');
  const [notificationSettings, setNotificationSettings] = useState({
    orderConfirmation: true,
    orderConfirmed: true,
    orderProcessing: true,
    orderShipped: true,
    orderDelivered: true,
    orderCancelled: true,
    orderRefunded: true,
    welcomeEmail: true,
    passwordReset: true,
  });
  const [testEmail, setTestEmail] = useState('');
  const [testTemplate, setTestTemplate] = useState('test');
  const [sendingTest, setSendingTest] = useState(false);
  const [emailLogs, setEmailLogs] = useState<
    {
      id: string;
      to: string;
      subject: string;
      template: string;
      status: 'sent' | 'failed';
      error: string | null;
      createdAt: string;
    }[]
  >([]);
  const [snippetsDirty, setSnippetsDirty] = useState(false);
  const snippetsSaveRef = useRef<(() => Promise<boolean>) | null>(null);

  useEffect(() => {
    api
      .get<{
        success: boolean;
        data: {
          id: string;
          to: string;
          subject: string;
          template: string;
          status: 'sent' | 'failed';
          error: string | null;
          createdAt: string;
        }[];
      }>('/api/admin/email-logs?limit=20')
      .then((res) => {
        if (res.data) setEmailLogs(res.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    api
      .get<{ success: boolean; data: Record<string, string> }>('/api/admin/settings')
      .then((res) => {
        if (res.data) {
          const d = res.data;
          setSettings((prev) => ({ ...prev, ...d }));
          if (d.paymentMethods) {
            try {
              setPaymentMethods(JSON.parse(d.paymentMethods));
            } catch {}
          }
          if (d.shippingMethods) {
            try {
              setShippingMethods(JSON.parse(d.shippingMethods));
            } catch {}
          }
          if (d.taxRate) setTaxRate(d.taxRate);
          if (d.notificationSettings) {
            try {
              setNotificationSettings(JSON.parse(d.notificationSettings));
            } catch {}
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const patchSettings = (patch: Partial<typeof settings>) => {
    setSettings((p) => ({ ...p, ...patch }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // If snippets tab is active and has dirty snippets, save those too
      if (activeTab === 'snippets' && snippetsDirty && snippetsSaveRef.current) {
        await snippetsSaveRef.current();
        setSaving(false);
        return;
      }
      await api.put('/api/admin/settings', {
        ...settings,
        paymentMethods: JSON.stringify(paymentMethods),
        shippingMethods: JSON.stringify(shippingMethods),
        taxRate,
        notificationSettings: JSON.stringify(notificationSettings),
      });
      setDirty(false);
      toast.success('Settings saved — storefront updated');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updatePM = (id: string, patch: Partial<PaymentMethodConfig>) => {
    setPaymentMethods((p) => p.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setDirty(true);
  };
  const updateSM = (id: string, patch: Partial<ShippingMethodConfig>) => {
    setShippingMethods((p) => p.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setDirty(true);
  };

  const handleSendTest = async () => {
    const to = (testEmail.trim() || settings.storeEmail || settings.fromEmail || '').trim();
    if (!to) {
      toast.error('Enter a recipient email first');
      return;
    }
    if (!to.includes('@')) {
      toast.error('Enter a valid email address');
      return;
    }
    setSendingTest(true);
    try {
      await api.post('/api/admin/email-test', { to, template: testTemplate });
      toast.success('Test email sent — check inbox & Email activity below');
      api
        .get<{
          success: boolean;
          data: {
            id: string;
            to: string;
            subject: string;
            template: string;
            status: 'sent' | 'failed';
            error: string | null;
            createdAt: string;
          }[];
        }>('/api/admin/email-logs?limit=20')
        .then((res) => {
          if (res.data) setEmailLogs(res.data);
        })
        .catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );

  /* Derived chat status */
  const waPhoneDigits = settings.whatsapp_phone_number.replace(/[^0-9]/g, '');
  const waConfigured = waPhoneDigits.length > 0;
  const waLive = settings.is_whatsapp_enabled !== 'false' && waConfigured;
  const msPage = settings.messenger_page_id.trim();
  const msConfigured = msPage.length > 0;
  const msLive = settings.is_messenger_enabled !== 'false' && msConfigured;

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="border-border from-primary/10 via-primary/5 relative overflow-hidden rounded-2xl border bg-gradient-to-r to-transparent p-5">
        <div className="bg-primary/10 pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground shadow-primary/30 flex h-11 w-11 items-center justify-center rounded-xl shadow-lg">
              <SettingsIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Settings</h1>
              <p className="text-muted-foreground text-xs">
                {waLive || msLive
                  ? `${[waLive && 'WhatsApp', msLive && 'Messenger'].filter(Boolean).join(' + ')} live on your storefront`
                  : 'Nothing is live yet — enable a chat channel or tweak your store'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="hidden items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-600 sm:inline-flex dark:text-amber-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> Unsaved
                changes
              </span>
            )}
            <PremiumButton
              variant="primary"
              size="sm"
              leftIcon={<Save className="h-4 w-4" />}
              onClick={handleSave}
              disabled={saving || !dirty}
            >
              {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
            </PremiumButton>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full shrink-0 lg:w-56">
          <nav className="border-border bg-card flex gap-1 rounded-xl border p-1.5 lg:flex-col">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.key === 'chat' && (waLive || msLive) && activeTab !== 'chat' && (
                  <span
                    className="ml-auto h-2 w-2 rounded-full bg-emerald-500"
                    title="A chat channel is live"
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="min-w-0 flex-1 space-y-5">
          {activeTab === 'store' && (
            <div className="border-border bg-card space-y-5 rounded-2xl border p-6">
              <SectionHeader
                icon={<Store className="text-primary h-4 w-4" />}
                iconBg="bg-primary/5"
                title="Store Information"
                subtitle="Basic store details and contact info"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Store Name</Label>
                  <Input
                    value={settings.storeName}
                    onChange={(e) => patchSettings({ storeName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Store Email</Label>
                  <Input
                    value={settings.storeEmail}
                    onChange={(e) => patchSettings({ storeEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input
                    value={settings.storePhone}
                    onChange={(e) => patchSettings({ storePhone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Address</Label>
                  <Input
                    value={settings.storeAddress}
                    onChange={(e) => patchSettings({ storeAddress: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="border-border bg-card space-y-5 rounded-2xl border p-6">
              <SectionHeader
                icon={<CreditCard className="text-primary h-4 w-4" />}
                iconBg="bg-primary/5"
                title="Payment Methods"
                subtitle="Enable or disable payment methods at checkout"
              />
              <div className="space-y-3">
                {paymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    className={cn(
                      'flex items-center gap-4 rounded-xl border p-4 transition-colors',
                      pm.enabled
                        ? 'border-border'
                        : 'border-border/60 bg-muted/20 border-dashed opacity-60'
                    )}
                  >
                    <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                      {PAYMENT_ICONS[pm.id] ?? <Shield className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{pm.name}</span>
                        <span className="text-muted-foreground text-xs">({pm.nameBn})</span>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">{pm.description}</p>
                      {pm.requiresTransactionId && (
                        <p className="mt-1 text-[10px] text-amber-500">
                          Requires Transaction ID entry
                        </p>
                      )}
                    </div>
                    <Toggle
                      checked={pm.enabled}
                      onChange={(v) => updatePM(pm.id, { enabled: v })}
                      label={`Toggle ${pm.name}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="border-border bg-card space-y-5 rounded-2xl border p-6">
              <SectionHeader
                icon={<Truck className="text-primary h-4 w-4" />}
                iconBg="bg-primary/5"
                title="Shipping Methods"
                subtitle="Configure zones, rates, and free shipping thresholds"
              />
              <div className="space-y-3">
                {shippingMethods.map((sm) => (
                  <div
                    key={sm.id}
                    className={cn(
                      'space-y-3 rounded-xl border p-4 transition-colors',
                      sm.enabled
                        ? 'border-border'
                        : 'border-border/60 bg-muted/20 border-dashed opacity-60'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold">{sm.name}</span>
                          <span className="text-muted-foreground ml-1 text-xs">({sm.nameBn})</span>
                          <p className="text-muted-foreground text-xs">{sm.estimatedDays}</p>
                        </div>
                      </div>
                      <Toggle
                        checked={sm.enabled}
                        onChange={(v) => updateSM(sm.id, { enabled: v })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Shipping Cost (BDT)</Label>
                        <Input
                          type="number"
                          value={sm.cost}
                          onChange={(e) => updateSM(sm.id, { cost: Number(e.target.value) })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Free Above (BDT)</Label>
                        <Input
                          type="number"
                          value={sm.freeAbove}
                          onChange={(e) => updateSM(sm.id, { freeAbove: Number(e.target.value) })}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="max-w-xs space-y-1">
                <Label className="text-xs">Tax Rate (%)</Label>
                <Input
                  type="number"
                  value={taxRate}
                  onChange={(e) => {
                    setTaxRate(e.target.value);
                    setDirty(true);
                  }}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="border-border bg-card space-y-5 rounded-2xl border p-6">
              <SectionHeader
                icon={<Mail className="text-primary h-4 w-4" />}
                iconBg="bg-primary/5"
                title="Email Configuration"
                subtitle="Resend API for transactional emails"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Sender Name</Label>
                  <Input
                    value={settings.fromName}
                    onChange={(e) => patchSettings({ fromName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Sender Email</Label>
                  <Input
                    value={settings.fromEmail}
                    onChange={(e) => patchSettings({ fromEmail: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Resend API Key</Label>
                <Input
                  type="password"
                  value={settings.resendApiKey}
                  onChange={(e) => patchSettings({ resendApiKey: e.target.value })}
                  placeholder="re_..."
                />
                <p className="text-muted-foreground text-xs">
                  If empty, uses the RESEND_API_KEY env var.
                </p>
              </div>

              {/* Notification Toggles */}
              <div className="border-border border-t pt-4">
                <h3 className="mb-3 text-sm font-semibold">Email Notifications</h3>
                <p className="text-muted-foreground mb-4 text-xs">
                  Toggle which order status emails are sent to customers
                </p>
                <div className="grid gap-3">
                  {[
                    {
                      key: 'orderConfirmation',
                      label: 'Order Confirmation',
                      desc: 'Sent when a new order is placed',
                      icon: '🛒',
                    },
                    {
                      key: 'orderConfirmed',
                      label: 'Order Confirmed',
                      desc: 'Sent when admin confirms the order',
                      icon: '📋',
                    },
                    {
                      key: 'orderProcessing',
                      label: 'Order Processing',
                      desc: 'Sent when order starts processing',
                      icon: '⚙️',
                    },
                    {
                      key: 'orderShipped',
                      label: 'Order Shipped',
                      desc: 'Sent when order is shipped',
                      icon: '📦',
                    },
                    {
                      key: 'orderDelivered',
                      label: 'Order Delivered',
                      desc: 'Sent when order is delivered',
                      icon: '✅',
                    },
                    {
                      key: 'orderCancelled',
                      label: 'Order Cancelled',
                      desc: 'Sent when order is cancelled',
                      icon: '❌',
                    },
                    {
                      key: 'orderRefunded',
                      label: 'Order Refunded',
                      desc: 'Sent when refund is processed',
                      icon: '💰',
                    },
                    {
                      key: 'welcomeEmail',
                      label: 'Welcome Email',
                      desc: 'Sent when a new account is created',
                      icon: '👋',
                    },
                    {
                      key: 'passwordReset',
                      label: 'Password Reset',
                      desc: 'OTP code for forgot-password requests',
                      icon: '🔑',
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="border-border bg-background hover:bg-accent/50 flex cursor-pointer items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{item.icon}</span>
                        <div>
                          <span className="text-sm font-medium">{item.label}</span>
                          <p className="text-muted-foreground text-xs">{item.desc}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={
                          notificationSettings[item.key as keyof typeof notificationSettings] !==
                          false
                        }
                        onChange={(e) => {
                          setNotificationSettings({
                            ...notificationSettings,
                            [item.key]: e.target.checked,
                          });
                          setDirty(true);
                        }}
                        className="border-border h-4 w-4 rounded accent-emerald-500"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Test email sender */}
              <div className="border-border border-t pt-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Send a test email</h3>
                    <p className="text-muted-foreground text-xs">
                      Deliver any template to a real inbox via Resend
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Recipient</Label>
                    <Input
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder={settings.storeEmail || 'you@example.com'}
                      className="h-10 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Template</Label>
                    <select
                      value={testTemplate}
                      onChange={(e) => setTestTemplate(e.target.value)}
                      className="border-border bg-card h-10 w-full rounded-lg border px-3 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                    >
                      <option value="test">Basic connectivity test</option>
                      <option value="welcome">Welcome</option>
                      <option value="password-reset">Password Reset (OTP)</option>
                      <option value="order-confirmation">Order Confirmation</option>
                      <option value="order-status">Order Status (Shipped)</option>
                    </select>
                  </div>
                </div>
                <PremiumButton
                  variant="primary"
                  size="sm"
                  className="mt-3"
                  leftIcon={<Send className="h-4 w-4" />}
                  onClick={handleSendTest}
                  isLoading={sendingTest}
                  disabled={sendingTest}
                >
                  {sendingTest ? 'Sending...' : `Send to ${(testEmail.trim() || settings.storeEmail || settings.fromEmail || 'recipient').trim()}`}
                </PremiumButton>
                <p className="text-muted-foreground mt-2 text-[10px]">
                  Uses the configured Resend key + sender name/email above. Every send is recorded
                  in “Email activity” below.
                </p>
              </div>

              {/* Email activity log */}
              <div className="border-border border-t pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Email activity</h3>
                      <p className="text-muted-foreground text-xs">
                        Latest 20 sends recorded in email_logs
                      </p>
                    </div>
                  </div>
                </div>
                {emailLogs.length === 0 ? (
                  <p className="border-border bg-muted/20 text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-xs">
                    No emails sent yet. Send a test email or place an order to see activity here.
                  </p>
                ) : (
                  <div className="border-border overflow-hidden rounded-lg border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/40 text-muted-foreground text-left text-[10px] uppercase tracking-wider">
                          <th className="px-3 py-2 font-semibold">Status</th>
                          <th className="px-3 py-2 font-semibold">Template</th>
                          <th className="px-3 py-2 font-semibold">To</th>
                          <th className="hidden px-3 py-2 font-semibold sm:table-cell">Subject</th>
                          <th className="hidden px-3 py-2 font-semibold md:table-cell">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-border divide-y">
                        {emailLogs.map((log) => (
                          <tr key={log.id} className="align-middle">
                            <td className="px-3 py-2">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                  log.status === 'sent'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                )}
                              >
                                {log.status === 'sent' ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                {log.status}
                              </span>
                            </td>
                            <td className="text-muted-foreground px-3 py-2 font-mono text-[11px]">
                              {log.template}
                            </td>
                            <td className="px-3 py-2">{log.to}</td>
                            <td
                              className="text-muted-foreground hidden max-w-[220px] truncate px-3 py-2 sm:table-cell"
                              title={log.error || ''}
                            >
                              {log.subject}
                            </td>
                            <td className="text-muted-foreground hidden px-3 py-2 md:table-cell">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="border-border bg-card space-y-5 rounded-2xl border p-6">
              <SectionHeader
                icon={<Send className="text-primary h-4 w-4" />}
                iconBg="bg-primary/5"
                title="Social Links"
                subtitle="Social media profiles"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Facebook</Label>
                  <Input
                    value={settings.facebook}
                    onChange={(e) => patchSettings({ facebook: e.target.value })}
                    placeholder="https://facebook.com/tuktak"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Instagram</Label>
                  <Input
                    value={settings.instagram}
                    onChange={(e) => patchSettings({ instagram: e.target.value })}
                    placeholder="https://instagram.com/tuktak"
                  />
                </div>
                <div className="space-y-1">
                  <Label>YouTube</Label>
                  <Input
                    value={settings.youtube}
                    onChange={(e) => patchSettings({ youtube: e.target.value })}
                    placeholder="https://youtube.com/@tuktak"
                  />
                </div>
                <div className="space-y-1">
                  <Label>WhatsApp</Label>
                  <Input
                    value={settings.whatsapp}
                    onChange={(e) => patchSettings({ whatsapp: e.target.value })}
                    placeholder="+8801XXXXXXXXX"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="space-y-5">
              {/* Live preview */}
              <div className="border-border bg-card space-y-4 rounded-2xl border p-5">
                <div className="flex items-center justify-between gap-3">
                  <SectionHeader
                    icon={<Sparkles className="text-primary h-4 w-4" />}
                    iconBg="bg-primary/5"
                    title="Live widget preview"
                    subtitle="The toggles you flip below render here instantly"
                  />
                </div>
                <LiveChatPreview
                  waEnabled={settings.is_whatsapp_enabled !== 'false'}
                  waPhone={settings.whatsapp_phone_number}
                  msEnabled={settings.is_messenger_enabled !== 'false'}
                  msPage={settings.messenger_page_id}
                />
              </div>

              {/* WhatsApp */}
              <div
                className={cn(
                  'space-y-4 rounded-2xl border p-5 transition-colors',
                  waLive ? 'border-emerald-500/40 bg-emerald-500/[0.03]' : 'border-border'
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#25D366]">
                      <SocialIcon platform="whatsapp" className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">WhatsApp</span>
                        <span className="rounded-full bg-[#25D366]/10 px-2 py-0.5 text-[10px] font-semibold text-[#25D366]">
                          {settings.whatsapp_mode === 'CLOUD_API' ? 'Cloud API' : 'wa.me'}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {settings.whatsapp_mode === 'CLOUD_API'
                          ? 'WhatsApp Business Cloud API'
                          : 'Direct link to your number'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill
                      active={waLive}
                      hint={
                        settings.is_whatsapp_enabled !== 'false' && !waConfigured
                          ? 'add a number'
                          : undefined
                      }
                    />
                    <Toggle
                      checked={settings.is_whatsapp_enabled !== 'false'}
                      onChange={(v) => patchSettings({ is_whatsapp_enabled: v ? 'true' : 'false' })}
                      label="Toggle WhatsApp"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Mode</Label>
                    <select
                      value={settings.whatsapp_mode}
                      onChange={(e) => patchSettings({ whatsapp_mode: e.target.value })}
                      className="border-border bg-card h-10 w-full rounded-lg border px-3 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                    >
                      <option value="DIRECT_NUMBER">Direct Number (wa.me link)</option>
                      <option value="CLOUD_API">Cloud API (WhatsApp Business)</option>
                    </select>
                    <p className="text-muted-foreground text-[10px]">
                      Direct Number opens wa.me — ideal for phone support. Cloud API is for
                      automated bot replies (needs token + phone number ID).
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone Number</Label>
                    <Input
                      value={settings.whatsapp_phone_number}
                      onChange={(e) => patchSettings({ whatsapp_phone_number: e.target.value })}
                      placeholder="+8801XXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone Number ID</Label>
                    <Input
                      value={settings.whatsapp_phone_number_id}
                      onChange={(e) => patchSettings({ whatsapp_phone_number_id: e.target.value })}
                      placeholder="Optional, for Cloud API"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Access Token</Label>
                    <Input
                      type="password"
                      value={settings.whatsapp_access_token}
                      onChange={(e) => patchSettings({ whatsapp_access_token: e.target.value })}
                      placeholder="EAAG... (Cloud API only)"
                    />
                  </div>
                </div>

                {waLive && waPhoneDigits.length > 0 && (
                  <a
                    href={`https://wa.me/${waPhoneDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366]/10 px-3 py-1.5 text-xs font-medium text-[#25D366] hover:bg-[#25D366]/15"
                  >
                    Preview link <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Facebook Messenger */}
              <div
                className={cn(
                  'space-y-4 rounded-2xl border p-5 transition-colors',
                  msLive ? 'border-blue-500/40 bg-blue-500/[0.03]' : 'border-border'
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0084FF]/15 text-[#0084FF]">
                      <SocialIcon platform="messenger" className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">Facebook Messenger</span>
                        <span className="rounded-full bg-[#0084FF]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0084FF]">
                          m.me
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Direct link to your Facebook page chat
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill
                      active={msLive}
                      hint={
                        settings.is_messenger_enabled !== 'false' && !msConfigured
                          ? 'add a page ID'
                          : undefined
                      }
                    />
                    <Toggle
                      checked={settings.is_messenger_enabled !== 'false'}
                      onChange={(v) =>
                        patchSettings({ is_messenger_enabled: v ? 'true' : 'false' })
                      }
                      label="Toggle Messenger"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Page ID</Label>
                    <Input
                      value={settings.messenger_page_id}
                      onChange={(e) => patchSettings({ messenger_page_id: e.target.value })}
                      placeholder="Your Facebook Page ID"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Access Token</Label>
                    <Input
                      type="password"
                      value={settings.messenger_access_token}
                      onChange={(e) => patchSettings({ messenger_access_token: e.target.value })}
                      placeholder="EAAQ... (optional)"
                    />
                  </div>
                </div>

                {msLive && msPage.length > 0 && (
                  <a
                    href={`https://m.me/${encodeURIComponent(msPage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0084FF]/10 px-3 py-1.5 text-xs font-medium text-blue-500 hover:bg-[#0084FF]/15"
                  >
                    Preview link <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <p className="text-muted-foreground text-[10px]">
                Access tokens are write-only (masked in the UI after saving). Only enable flags,
                phone numbers and page IDs are exposed to the storefront. The floating buttons
                appear at the bottom-right of every store page once a channel is live.
              </p>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="border-border bg-card space-y-5 rounded-2xl border p-6">
              <SectionHeader
                icon={<Globe className="text-primary h-4 w-4" />}
                iconBg="bg-primary/5"
                title="SEO"
                subtitle="Meta tags for homepage"
              />
              <div className="space-y-1">
                <Label>Meta Description</Label>
                <Input
                  value={settings.metaDescription}
                  onChange={(e) => patchSettings({ metaDescription: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Meta Keywords</Label>
                <Input
                  value={settings.metaKeywords}
                  onChange={(e) => patchSettings({ metaKeywords: e.target.value })}
                  placeholder="comma, separated, keywords"
                />
              </div>
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="border-border bg-card space-y-5 rounded-2xl border p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionHeader
                  icon={<BarChart3 className="text-primary h-4 w-4" />}
                  iconBg="bg-primary/5"
                  title="Marketing & Tracking"
                  subtitle="Meta Pixel, GA4, GTM, Clarity"
                />
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.trackingEnabled !== 'false'}
                    onChange={(e) =>
                      patchSettings({ trackingEnabled: e.target.checked ? 'true' : 'false' })
                    }
                    className="border-border h-4 w-4 rounded accent-emerald-500"
                  />
                  <span className="text-xs font-medium">Tracking enabled</span>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Google Tag Manager ID</Label>
                  <Input
                    value={settings.gtmId}
                    onChange={(e) => patchSettings({ gtmId: e.target.value.trim() })}
                    placeholder="GTM-XXXXXXX"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Google Analytics 4 ID</Label>
                  <Input
                    value={settings.ga4Id}
                    onChange={(e) => patchSettings({ ga4Id: e.target.value.trim() })}
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Meta Pixel ID</Label>
                  <Input
                    value={settings.metaPixelId}
                    onChange={(e) => patchSettings({ metaPixelId: e.target.value.trim() })}
                    placeholder="1234567890123456"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Meta CAPI Access Token</Label>
                  <Input
                    type="password"
                    value={settings.metaCapiToken}
                    onChange={(e) => patchSettings({ metaCapiToken: e.target.value.trim() })}
                    placeholder="EAAG..."
                  />
                </div>
                <div className="space-y-1">
                  <Label>Meta Test Event Code</Label>
                  <Input
                    value={settings.metaTestEventCode}
                    onChange={(e) => patchSettings({ metaTestEventCode: e.target.value.trim() })}
                    placeholder="TEST12345"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Microsoft Clarity ID</Label>
                  <Input
                    value={settings.clarityId}
                    onChange={(e) => patchSettings({ clarityId: e.target.value.trim() })}
                    placeholder="abcdefghij"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'snippets' && (
            <SnippetsTab
              onDirtyChange={(d) => {
                setSnippetsDirty(d);
                if (d) setDirty(true);
              }}
              onSaveRef={snippetsSaveRef}
            />
          )}
        </div>
      </div>
    </div>
  );
}
