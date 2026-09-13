'use client';

import {
  Package,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  RotateCcw,
  XCircle,
  Search,
  Loader2,
  PartyPopper,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { AccountShell } from '@/components/account/AccountShell';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { cn, formatPrice } from '@/lib/utils';

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

type OrderTrackingData = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  total: number;
  paymentMethod: string;
  items: { name: string; quantity: number; price: number }[];
  shippingAddress: string | null;
};

const STATUS_STEPS: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  bkash: 'bKash',
  nagad: 'Nagad',
  sslcommerz: 'SSLCommerz',
};

const STATUS_ICONS: Record<OrderStatus, typeof Package> = {
  pending: Clock,
  confirmed: CheckCircle2,
  processing: Package,
  shipped: Truck,
  out_for_delivery: MapPin,
  delivered: CheckCircle2,
  cancelled: XCircle,
  refunded: RotateCcw,
};

export default function TrackingPage() {
  const t = useTranslations('tracking');
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderParam = searchParams.get('order') ?? '';
  const placed = searchParams.get('placed') === '1';
  const [orderId, setOrderId] = useState(orderParam);
  const [trackingData, setTrackingData] = useState<OrderTrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async () => {
    if (!orderId.trim()) return;

    setError(null);
    setTrackingData(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/orders/track/${orderId.trim()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(t('noTracking'));
        return;
      }

      setTrackingData(data.data);
    } catch {
      setError(t('noTracking'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderParam) return;
    setOrderId(orderParam);
    // Fetch directly using orderParam to avoid stale closure
    (async () => {
      setError(null);
      setTrackingData(null);
      setLoading(true);
      try {
        const res = await fetch(`/api/orders/track/${encodeURIComponent(orderParam.trim())}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(t('noTracking'));
          return;
        }
        setTrackingData(json.data);
      } catch {
        setError(t('noTracking'));
      } finally {
        setLoading(false);
      }
    })();
  }, [orderParam, t]);

  return (
    <AccountShell>
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="bg-primary/10 mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full">
          <Package className="text-primary h-7 w-7" />
        </div>
        <h1 className="text-display-2xl text-foreground font-bold">{t('title')}</h1>
        <p className="text-body text-muted-foreground mt-1">{t('enterOrderId')}</p>
      </div>

      {/* Order placed — success banner (query ?placed=1) */}
      {placed && (
        <div className="mx-auto mb-8 max-w-md rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
          <PartyPopper className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
          <p className="text-body-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {t('orderPlaced')}
          </p>
          <p className="text-body-sm text-muted-foreground mt-1">
            {t('orderPlacedDetail', { number: trackingData?.orderNumber ?? orderParam })}
          </p>
        </div>
      )}

      {/* Search Input */}
      <div className="mx-auto mb-10 max-w-md">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder={t('orderId')}
              className="pl-9"
              onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
            />
          </div>
          <PremiumButton variant="primary" onClick={handleTrack} disabled={!orderId.trim() || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('trackButton')}
          </PremiumButton>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="border-destructive/20 bg-destructive/5 mx-auto max-w-md rounded-lg border p-4 text-center">
          <p className="text-body-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Tracking Result */}
      {trackingData && (
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Order Info Card */}
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-caption text-muted-foreground">{t('orderId')}</p>
                <p className="text-body break-all font-mono font-semibold">
                  {trackingData.orderNumber}
                </p>
              </div>
              <OrderStatusBadge status={trackingData.status} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-caption text-muted-foreground">Total</p>
                <p className="text-body-sm font-semibold">{formatPrice(trackingData.total)}</p>
              </div>
              <div>
                <p className="text-caption text-muted-foreground">Payment</p>
                <p className="text-body-sm font-semibold">
                  {PAYMENT_LABELS[trackingData.paymentMethod] ?? trackingData.paymentMethod}
                </p>
              </div>
              <div>
                <p className="text-caption text-muted-foreground">{t('orderDate')}</p>
                <p className="text-body-sm font-semibold">
                  {new Date(trackingData.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>

          {/* Status Timeline */}
          {trackingData.status !== 'cancelled' && trackingData.status !== 'refunded' && (
            <Card className="p-6">
              <h2 className="text-body-lg text-foreground mb-6 font-semibold">{t('timeline')}</h2>
              <OrderTimeline currentStatus={trackingData.status} />
            </Card>
          )}

          {/* Items */}
          <Card className="p-6">
            <h2 className="text-body-sm text-foreground mb-4 font-semibold">Order Items</h2>
            <div className="space-y-2">
              {trackingData.items.map((item, i) => (
                <div key={i} className="text-body-sm flex justify-between">
                  <span className="text-foreground/80">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Shipping Address */}
          {trackingData.shippingAddress && (
            <Card className="p-6">
              <h2 className="text-body-sm text-foreground mb-2 font-semibold">Delivery Address</h2>
              <p className="text-body-sm text-foreground/80">{trackingData.shippingAddress}</p>
            </Card>
          )}

          <div className="text-center">
            <button
              onClick={() => {
                setTrackingData(null);
                setOrderId('');
                router.push('/tracking');
              }}
              className="text-body-sm text-primary font-medium hover:underline"
            >
              {t('trackAnother')}
            </button>
          </div>
        </div>
      )}
    </AccountShell>
  );
}

/** Visual timeline showing order progress */
function OrderTimeline({ currentStatus }: { currentStatus: OrderStatus }) {
  const t = useTranslations('tracking');
  const currentIndex = STATUS_STEPS.indexOf(currentStatus);

  const LABELS: Record<string, string> = {
    pending: t('pending'),
    confirmed: t('confirmed'),
    processing: t('processing'),
    shipped: t('shipped'),
    out_for_delivery: t('outForDelivery'),
    delivered: t('delivered'),
  };

  return (
    <div className="relative">
      {STATUS_STEPS.map((step, index) => {
        const isActive = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const Icon = STATUS_ICONS[step];

        return (
          <div key={step} className="relative flex items-start gap-4 pb-8 last:pb-0">
            {/* Connector line */}
            {index < STATUS_STEPS.length - 1 && (
              <div
                className={cn(
                  'absolute left-[15px] top-8 h-full w-0.5',
                  index < currentIndex ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}

            {/* Icon */}
            <div
              className={cn(
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted bg-muted text-muted-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4', isCurrent && 'animate-pulse')} />
            </div>

            {/* Label */}
            <div className="pt-1">
              <p
                className={cn(
                  'text-body-sm font-medium',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {LABELS[step]}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Status badge with color coding */
function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations('tracking');
  const LABELS: Record<string, string> = {
    pending: t('pending'),
    confirmed: t('confirmed'),
    processing: t('processing'),
    shipped: t('shipped'),
    out_for_delivery: t('outForDelivery'),
    delivered: t('delivered'),
    cancelled: t('cancelled'),
    refunded: t('refunded'),
  };

  const variant = (() => {
    switch (status) {
      case 'delivered':
        return 'default' as const;
      case 'cancelled':
      case 'refunded':
        return 'destructive' as const;
      case 'shipped':
      case 'out_for_delivery':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  })();

  return <Badge variant={variant}>{LABELS[status] ?? status}</Badge>;
}
