'use client';

import {
  Package,
  CheckCircle,
  Clock,
  Truck,
  Loader2,
  XCircle,
  CreditCard,
  Star,
  Receipt,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { DashboardErrorBoundary } from '@/components/account/ErrorBoundary';
import { Badge } from '@/components/ui/badge';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrder, useCancelOrder } from '@/hooks/useOrders';
import { formatDateLong } from '@/lib/format';
import { formatPrice, cn } from '@/lib/utils';

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  bkash: 'bKash',
  nagad: 'Nagad',
  sslcommerz: 'SSLCommerz',
};

const statusSteps = [
  { key: 'pending', icon: Clock },
  { key: 'confirmed', icon: CheckCircle },
  { key: 'processing', icon: Package },
  { key: 'shipped', icon: Truck },
  { key: 'delivered', icon: CheckCircle },
];

const cancelledStatuses = ['cancelled', 'refunded'];

function OrderDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-56 rounded-2xl lg:col-span-3" />
        <Skeleton className="h-56 rounded-2xl lg:col-span-2" />
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const locale = useLocale();
  const t = useTranslations('account');
  const params = useParams<{ id: string }>();
  const orderId = params?.id ?? '';
  const { data, isLoading, isError } = useOrder(orderId);
  const order = data?.data;
  const cancelOrder = useCancelOrder();

  const handleCancel = async () => {
    if (!order) return;
    try {
      await cancelOrder.mutateAsync({ orderId: order.id });
      toast.success(t('orderCancelled'), {
        description: `${t('order')} ${order.orderNumber} ${t('hasBeenCancelled')}.`,
      });
    } catch (err) {
      toast.error(t('couldNotCancel'), {
        description: err instanceof Error ? err.message : t('tryAgain'),
      });
    }
  };

  if (isLoading) return <OrderDetailSkeleton />;

  if (isError || !order) {
    return (
      <DashboardErrorBoundary>
        <div className="space-y-3">
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Package className="text-muted-foreground/30 h-8 w-8" />
            <p className="text-foreground mt-3 text-sm font-bold">{t('orderNotFound')}</p>
            <Link href="/account/orders" className="mt-3">
              <PremiumButton variant="outline" size="sm">
                {t('backToOrders')}
              </PremiumButton>
            </Link>
          </div>
        </div>
      </DashboardErrorBoundary>
    );
  }

  const isCancelled = cancelledStatuses.includes(order.status);
  const currentStepIndex = statusSteps.findIndex((s) => s.key === order.status);

  return (
    <DashboardErrorBoundary>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-foreground text-lg font-bold">
                {t('order')} #{order.orderNumber}
              </h2>
              <p className="text-muted-foreground text-xs">
                {t('placedOn')} {formatDateLong(order.createdAt, locale)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {['pending', 'confirmed'].includes(order.status) && (
                <PremiumButton
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={cancelOrder.isPending}
                  className="border-destructive/40 text-destructive hover:bg-destructive/5"
                >
                  {cancelOrder.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t('cancelOrder')
                  )}
                </PremiumButton>
              )}
              <Badge
                variant={isCancelled ? 'destructive' : 'default'}
                className="text-xs capitalize"
              >
                {t(`status.${order.status}`)}
              </Badge>
            </div>
          </div>
        </div>

        {!isCancelled && (
          <div className="border-border bg-card rounded-2xl border p-4 sm:p-5">
            <div className="flex items-start justify-between">
              {statusSteps.map((step, i) => {
                const Icon = step.icon;
                const isCompleted = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                return (
                  <div
                    key={step.key}
                    className="relative flex flex-1 flex-col items-center gap-1.5"
                  >
                    {i < statusSteps.length - 1 && (
                      <div
                        className={cn(
                          'absolute left-1/2 top-3.5 z-0 h-0.5 w-full sm:top-4',
                          i < currentStepIndex ? 'bg-primary' : 'bg-border'
                        )}
                      />
                    )}
                    <div
                      className={cn(
                        'relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors sm:h-8 sm:w-8',
                        isCompleted
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-muted-foreground'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span
                      className={cn(
                        'text-[10px] sm:text-xs',
                        isCurrent ? 'text-primary font-semibold' : 'text-muted-foreground'
                      )}
                    >
                      {t(`status.${step.key}`)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="border-destructive/30 bg-destructive/5 flex items-center gap-2 rounded-xl border p-3">
            <XCircle className="text-destructive h-4 w-4 shrink-0" />
            <p className="text-destructive text-sm">
              {t('order')} {t(`status.${order.status}`)}. {t('contactSupport')}.
            </p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="border-border bg-card rounded-2xl border p-4 sm:p-5 lg:col-span-3">
            <h3 className="text-foreground mb-3 text-sm font-bold">
              {t('items')} ({(order.items ?? []).length})
            </h3>
            <div className="space-y-3">
              {(order.items ?? []).map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="bg-muted relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                    <Image
                      src={item.image ?? '/placeholder-product.svg'}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-medium">{item.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {t('qty')}: {item.quantity} × {formatPrice(item.price)}
                    </p>
                    {order.status === 'delivered' && (
                      <Link
                        href={`/products/${item.slug ?? item.productId}`}
                        className="text-primary mt-1 inline-flex items-center gap-1 text-[11px] hover:underline"
                      >
                        <Star className="h-3 w-3" />
                        Write a Review
                      </Link>
                    )}
                  </div>
                  <span className="text-foreground shrink-0 text-sm font-bold">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-border bg-card rounded-2xl border p-4 sm:p-5 lg:col-span-2">
            <h3 className="text-foreground mb-3 text-sm font-bold">{t('orderSummary')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('subtotal')}</span>
                <span className="text-foreground">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('shipping')}</span>
                <span className="text-foreground">
                  {order.shippingCost === 0 ? t('free') : formatPrice(order.shippingCost)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('tax')}</span>
                <span className="text-foreground">{formatPrice(order.tax)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                  <span>{t('discount')}</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span className="text-foreground">{t('total')}</span>
                <span className="text-foreground">{formatPrice(order.total)}</span>
              </div>
            </div>
              <div className="border-border mt-4 border-t pt-3">
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <CreditCard className="h-3.5 w-3.5" />
                  {t('payment')}:{' '}
                  <span className="text-foreground font-medium">
                    {order.paymentMethod
                      ? (PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod)
                      : 'N/A'}
                  </span>
                </div>
              </div>
              {/* Invoice link */}
              {order.invoiceAccessToken && (
                <div className="border-border mt-3 border-t pt-3">
                  <Link
                    href={`/invoices/${encodeURIComponent(order.orderNumber)}?token=${encodeURIComponent(order.invoiceAccessToken)}`}
                    className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                  >
                    <Receipt className="h-4 w-4" /> {t('viewInvoice') ?? 'View Invoice'}
                  </Link>
                </div>
              )}
          </div>
        </div>
      </div>
    </DashboardErrorBoundary>
  );
}
