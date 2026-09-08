'use client';

import { X, User, MapPin, CreditCard, Package, StickyNote, CheckCircle2, Receipt, Printer, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { useAdminOrder } from '@/hooks/useAdmin';
import { formatPrice } from '@/lib/utils';

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  pending: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  confirmed: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  processing: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    dot: 'bg-indigo-500',
  },
  shipped: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    text: 'text-purple-700 dark:text-purple-300',
    dot: 'bg-purple-500',
  },
  delivered: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
  },
  refunded: { bg: 'bg-muted/50', text: 'text-foreground', dot: 'bg-gray-400' },
};

const paymentStatusStyles: Record<string, string> = {
  paid: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
  pending: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
  failed: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300',
  refunded: 'bg-muted/50 text-foreground',
};

const methodLabels: Record<string, string> = {
  bkash: 'bKash',
  nagad: 'Nagad',
  sslcommerz: 'SSLCommerz',
  cod: 'Cash on Delivery',
};

interface OrderDetailDrawerProps {
  orderId: string | null;
  onClose: () => void;
}

function buildInvoiceHref(order: { orderNumber: string; invoiceAccessToken?: string | null }) {
  if (!order.orderNumber) return null;
  const token = (order as unknown as { invoiceAccessToken?: string | null }).invoiceAccessToken;
  if (!token) return `/invoices/${encodeURIComponent(order.orderNumber)}`;
  return `/invoices/${encodeURIComponent(order.orderNumber)}?token=${encodeURIComponent(token)}`;
}

/** Offcanvas side panel showing full order detail: customer, items, payment, address */
export function OrderDetailDrawer({ orderId, onClose }: OrderDetailDrawerProps) {
  const { data, isLoading, isError } = useAdminOrder(orderId);
  const order = data?.data;

  if (!orderId) return null;

  const style = order ? (statusStyles[order.status] ?? statusStyles.pending) : statusStyles.pending;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="animate-in fade-in absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <aside className="bg-card animate-in slide-in-from-right absolute right-0 top-0 flex h-full w-full max-w-md flex-col shadow-2xl duration-300">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-foreground text-base font-semibold">Order Details</h2>
            {order && <p className="text-muted-foreground/70 text-xs">#{order.orderNumber}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground/70 hover:bg-muted rounded-full p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-muted/50 h-24 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : isError || !order ? (
            <div className="flex flex-col items-center py-16">
              <Package className="h-10 w-10 text-red-300" />
              <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
                Failed to load order
              </p>
            </div>
          ) : (
            <>
              {/* Invoice actions — print & view (for parcel) */}
              {(() => {
                const href = order ? buildInvoiceHref(order as unknown as { orderNumber: string; invoiceAccessToken?: string | null }) : null;
                if (!href) return null;
                return (
                  <div className="flex gap-2">
                    <Link
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      <Receipt className="h-4 w-4 shrink-0" /> View Invoice <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                    </Link>
                    <button
                      onClick={() => {
                        // Offscreen iframe — display:none prevents printing in some browsers, so use offscreen positioning
                        const iframe = document.createElement('iframe');
                        iframe.style.position = 'fixed';
                        iframe.style.left = '-9999px';
                        iframe.style.top = '0';
                        iframe.style.width = '800px';
                        iframe.style.height = '600px';
                        iframe.style.border = '0';
                        iframe.style.opacity = '0';
                        iframe.src = href;
                        let printed = false;
                        const doPrint = () => {
                          if (printed) return;
                          printed = true;
                          try {
                            iframe.contentWindow?.focus();
                            iframe.contentWindow?.print();
                          } catch {
                            // Fallback: open in new tab for manual print
                            window.open(href, '_blank', 'noopener,noreferrer');
                          }
                          setTimeout(() => iframe.remove(), 2000);
                        };
                        iframe.onload = doPrint;
                        // Fallback if onload doesn't fire (CSP / X-Frame)
                        setTimeout(() => {
                          if (!printed && document.body.contains(iframe)) doPrint();
                        }, 1500);
                        document.body.appendChild(iframe);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium transition hover:bg-muted"
                      title="Print invoice for parcel (no popup blocker)"
                    >
                      <Printer className="h-4 w-4 shrink-0" /> Print
                    </button>
                  </div>
                );
              })()}

              {/* Status + date */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.bg} ${style.text}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                  <span className="capitalize">{order.status}</span>
                </span>
                <span className="text-muted-foreground/70 text-xs">
                  {new Date(order.createdAt).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>

              {/* Customer */}
              <section className="border-border rounded-xl border p-4">
                <h3 className="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <User className="h-3.5 w-3.5 text-emerald-500" /> Customer
                </h3>
                <div className="flex items-center gap-1.5">
                  <p className="text-foreground text-sm font-medium">
                    {order.customerName ?? order.guestName ?? 'Unknown customer'}
                  </p>
                  {!order.customerId &&
                    (order.guestName || order.guestEmail || order.guestPhone) && (
                      <span className="inline-flex rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Guest
                      </span>
                    )}
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {order.customerEmail ?? order.guestEmail}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {order.customerPhone ?? order.guestPhone}
                </p>
              </section>

              {/* Shipping address */}
              {order.shippingAddress ? (
                <section className="border-border rounded-xl border p-4">
                  <h3 className="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                    <MapPin className="h-3.5 w-3.5 text-emerald-500" /> Shipping Address
                  </h3>
                  <p className="text-foreground text-sm font-medium">
                    {order.shippingAddress.name}
                    <span className="bg-muted text-muted-foreground ml-2 rounded-full px-2 py-0.5 text-[10px]">
                      {order.shippingAddress.label}
                    </span>
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {order.shippingAddress.street}, {order.shippingAddress.city}
                    {order.shippingAddress.district ? `, ${order.shippingAddress.district}` : ''}
                    {order.shippingAddress.postalCode
                      ? ` — ${order.shippingAddress.postalCode}`
                      : ''}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {order.shippingAddress.phone}
                  </p>
                </section>
              ) : order.shippingSnapshot ? (
                (() => {
                  let snap: {
                    street?: string;
                    city?: string;
                    district?: string;
                    postalCode?: string;
                  } = {};
                  try {
                    snap = JSON.parse(order.shippingSnapshot);
                  } catch {
                    /* ignore malformed */
                  }
                  return (
                    <section className="border-border rounded-xl border p-4">
                      <h3 className="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                        <MapPin className="h-3.5 w-3.5 text-emerald-500" /> Shipping Address
                      </h3>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {snap.street}, {snap.city}
                        {snap.district ? `, ${snap.district}` : ''}
                        {snap.postalCode ? ` — ${snap.postalCode}` : ''}
                      </p>
                    </section>
                  );
                })()
              ) : null}

              {/* Items */}
              <section className="border-border rounded-xl border p-4">
                <h3 className="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <Package className="h-3.5 w-3.5 text-emerald-500" /> Items ({order.items.length})
                </h3>
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="border-border bg-muted/50 relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm font-medium">{item.name}</p>
                        <p className="text-muted-foreground/70 text-xs">
                          Qty {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <p className="text-foreground text-sm font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Payment */}
              <section className="border-border rounded-xl border p-4">
                <h3 className="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-500" /> Payment
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Method</span>
                    <span className="text-foreground font-medium">
                      {order.paymentMethod
                        ? (methodLabels[order.paymentMethod] ?? order.paymentMethod)
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Payment status</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${paymentStatusStyles[order.paymentStatus] ?? 'bg-muted/50 text-foreground'}`}
                    >
                      {order.paymentStatus}
                    </span>
                  </div>
                  {order.paymentTransactionId && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">TrxID</span>
                      <span className="text-foreground flex items-center gap-1 font-mono text-xs font-medium">
                        {order.paymentMethod === 'bkash' && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                        {order.paymentTransactionId}
                      </span>
                    </div>
                  )}
                  {order.couponCode && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Coupon</span>
                      <span className="font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {order.couponCode}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Voucher QR Code */}
              {order.voucherNumber && (
                <section className="border-border rounded-xl border p-4">
                  <h3 className="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                    <Receipt className="h-3.5 w-3.5 text-emerald-500" /> Voucher QR
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl border border-emerald-100 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-zinc-900">
                      <img
                        src={`/api/vouchers/${encodeURIComponent(order.voucherNumber)}/qr`}
                        alt="Voucher QR Code"
                        className="h-24 w-24"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground text-xs">Voucher Number</p>
                      <p className="text-foreground font-mono text-sm font-medium">{order.voucherNumber}</p>
                      <p className="text-muted-foreground mt-1 text-[10px]">Scan to view invoice</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Notes */}
              {order.notes && (
                <section className="border-border rounded-xl border p-4">
                  <h3 className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                    <StickyNote className="h-3.5 w-3.5 text-emerald-500" /> Notes
                  </h3>
                  <p className="text-muted-foreground text-sm">{order.notes}</p>
                </section>
              )}

              {/* Totals */}
              <section className="space-y-1.5 rounded-xl bg-emerald-50/60 p-4 text-sm">
                <div className="text-muted-foreground flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="text-muted-foreground flex justify-between">
                  <span>Shipping</span>
                  <span>{formatPrice(order.shippingCost)}</span>
                </div>
                <div className="text-muted-foreground flex justify-between">
                  <span>Tax</span>
                  <span>{formatPrice(order.tax)}</span>
                </div>
                <div className="text-foreground mt-2 flex justify-between border-t border-emerald-100 pt-2 text-base font-semibold dark:border-emerald-900">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
