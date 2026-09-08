'use client';

import {
  Loader2,
  Printer,
  Receipt,
  RotateCcw,
  Download,
  ShieldCheck,
  CreditCard,
  Truck,
  CheckCircle2,
  Clock,
  Package,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Separator } from '@/components/ui/separator';
import { useInvoice } from '@/hooks/useOrders';
import { cn, formatPrice } from '@/lib/utils';

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  bkash: 'bKash',
  nagad: 'Nagad',
  sslcommerz: 'SSLCommerz',
};

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-amber-500', label: 'Pending' },
  confirmed: { icon: CheckCircle2, color: 'text-blue-500', label: 'Confirmed' },
  processing: { icon: Package, color: 'text-indigo-500', label: 'Processing' },
  shipped: { icon: Truck, color: 'text-purple-500', label: 'Shipped' },
  delivered: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Delivered' },
  cancelled: { icon: Receipt, color: 'text-red-500', label: 'Cancelled' },
  refunded: { icon: Receipt, color: 'text-gray-500', label: 'Refunded' },
};

export default function InvoicePage() {
  const t = useTranslations('invoice');
  const params = useParams<{ orderNo: string }>();
  const searchParams = useSearchParams();
  const placed = searchParams.get('placed') === '1';
  const token = searchParams.get('token') ?? undefined;
  const orderNo = params?.orderNo ?? '';

  const { data, isPending, isError } = useInvoice(orderNo, token);
  const invoice = data?.data;

  if (isPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <Receipt className="text-muted-foreground/40 mb-4 h-12 w-12" />
        <h1 className="text-xl font-bold">{t('notFound')}</h1>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm">{t('notFoundDetail')}</p>
        <Link
          href="/tracking"
          className="text-primary mt-6 inline-flex items-center gap-2 text-sm font-medium hover:underline"
        >
          <RotateCcw className="h-4 w-4" /> {t('trackAnother')}
        </Link>
      </div>
    );
  }

  const { order, customer, shipping, items } = invoice;
  const shipLine = [shipping?.street, shipping?.city, shipping?.district, shipping?.postalCode]
    .filter(Boolean)
    .join(', ');
  const subtotal = order.subtotal;
  const total = order.total;
  const statusInfo = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusInfo.icon;
  const paymentLabel = order.paymentMethod
    ? PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod
    : null;
  const qrUrl = order.voucherNumber
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/vouchers/${encodeURIComponent(order.voucherNumber)}/qr`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-background to-emerald-100/30 py-6 sm:py-10 dark:from-emerald-950/20 dark:via-background dark:to-emerald-900/10">
      <div className="mx-auto w-full max-w-3xl px-3 sm:px-4">
        {/* Actions (hidden when printing) */}
        <div className="mb-4 flex items-center justify-between print:hidden">
          <span className="text-muted-foreground text-sm">{t('caption')}</span>
          <div className="flex items-center gap-2">
            <PremiumButton
              variant="primary"
              size="sm"
              leftIcon={<Printer className="h-4 w-4 shrink-0" />}
              onClick={() => window.print()}
            >
              {t('print')}
            </PremiumButton>
          </div>
        </div>

        {/* Success banner */}
        {placed && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center print:hidden">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {t('orderPlaced')}
              </p>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {t('orderPlacedDetail', { number: order.orderNumber })}
            </p>
          </div>
        )}

        {/* Invoice Card */}
        <Card className="overflow-hidden border-emerald-100/60 dark:border-white/10">
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-6 text-white sm:px-8 dark:from-emerald-800 dark:to-emerald-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Tuktak</h1>
                <p className="mt-1 text-sm text-emerald-100">{t('title')}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold">{invoice.invoiceNumber}</p>
                <p className="mt-1 text-xs text-emerald-100">
                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            {/* Decorative circles */}
            <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
            <div className="absolute -right-2 -top-8 h-16 w-16 rounded-full bg-white/5" />
          </div>

          <div className="px-6 py-6 sm:px-8">
            {/* Status + Order Info Row */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold',
                  order.status === 'delivered'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : order.status === 'cancelled'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                )}
              >
                <StatusIcon className={cn('h-3.5 w-3.5', statusInfo.color)} />
                {statusInfo.label}
              </div>
              <span className="text-muted-foreground text-xs">#{order.orderNumber}</span>
              {order.paymentStatus === 'paid' && (
                <Badge variant="default" className="bg-emerald-600 text-white">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> {t('paid')}
                </Badge>
              )}
            </div>

            {/* Bill To / Ship To + QR Code */}
            <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
              <div className="space-y-4">
                <div>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                    {t('billTo')}
                  </p>
                  <p className="text-foreground mt-1 font-medium">{customer.name ?? '-'}</p>
                  {customer.phone && (
                    <p className="text-muted-foreground text-sm">{customer.phone}</p>
                  )}
                  {customer.email && (
                    <p className="text-muted-foreground text-sm">{customer.email}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                    {t('shipTo')}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">{shipLine || '-'}</p>
                </div>
              </div>

              {/* QR Code */}
              {qrUrl && (
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-zinc-900">
                    <img
                      src={qrUrl}
                      alt="Invoice QR Code"
                      className="h-28 w-28 sm:h-32 sm:w-32"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-muted-foreground text-center text-[10px] uppercase tracking-wider">
                    Scan to view invoice
                  </p>
                  {order.voucherNumber && (
                    <p className="text-muted-foreground font-mono text-[10px]">
                      {order.voucherNumber}
                    </p>
                  )}
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Payment Info */}
            <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl bg-muted/30 p-4 sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                  {t('order')}
                </p>
                <p className="text-foreground mt-1 font-mono text-sm">{order.orderNumber}</p>
              </div>
              {paymentLabel && (
                <div>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                    {t('payment')}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <CreditCard className="text-muted-foreground h-3.5 w-3.5" />
                    <p className="text-foreground text-sm font-medium">{paymentLabel}</p>
                  </div>
                </div>
              )}
              {order.paymentTransactionId && (
                <div>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                    {t('trxId')}
                  </p>
                  <p className="text-foreground mt-1 font-mono text-sm">
                    {order.paymentTransactionId}
                  </p>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] text-sm">
                <thead>
                  <tr className="border-border text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                    <th className="py-2.5 font-medium">{t('item')}</th>
                    <th className="py-2.5 text-center font-medium">{t('qty')}</th>
                    <th className="py-2.5 text-right font-medium">{t('price')}</th>
                    <th className="py-2.5 text-right font-medium">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-border/60 border-b">
                      <td className="text-foreground/80 py-3">
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <div className="bg-muted h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <span className="line-clamp-1">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-center">{item.quantity}</td>
                      <td className="py-3 text-right">{formatPrice(item.price)}</td>
                      <td className="py-3 text-right font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 space-y-2 text-sm sm:ml-auto sm:w-72">
              <div className="text-muted-foreground flex justify-between">
                <span>{t('subtotal')}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>{t('discount')}</span>
                  <span>−{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="text-muted-foreground flex justify-between">
                <span>{t('shipping')}</span>
                <span>{order.shippingCost === 0 ? t('free') : formatPrice(order.shippingCost)}</span>
              </div>
              <div className="text-muted-foreground flex justify-between">
                <span>{t('tax')}</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
              <Separator />
              <div className="text-foreground flex justify-between text-base font-bold">
                <span>{t('total')}</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {/* Footer note */}
            <div className="border-border mt-8 border-t pt-5">
              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row print:hidden">
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  {t('keepForRecords')}
                </p>
                <Link
                  href={`/tracking?order=${encodeURIComponent(order.orderNumber)}`}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  {t('trackOrder')}
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
