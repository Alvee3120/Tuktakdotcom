'use client';

import {
  Minus,
  Loader2,
  ShoppingBag,
  Trash2,
  Lock,
  Store,
  Plus,
  Banknote,
  Smartphone,
  Wallet,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useCreateOrder, useCreateGuestOrder, useValidateCoupon } from '@/hooks/useOrders';
import { api } from '@/lib/api-client';
import { DEFAULT_DISTRICT, DISTRICTS } from '@/lib/districts';
import { trackApplyCoupon, trackInitiateCheckout, trackPurchase } from '@/lib/tracking';
import { cn, formatPrice } from '@/lib/utils';
import { useCartStore } from '@/stores/useCartStore';

const PAYMENT_ICONS: Record<string, typeof Banknote> = {
  cod: Banknote,
  bkash: Smartphone,
  nagad: Wallet,
};

type PaymentMethodConfig = {
  id: string;
  name: string;
  nameBn: string;
  enabled: boolean;
  description: string;
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
type CheckoutConfig = {
  paymentMethods: PaymentMethodConfig[];
  shippingMethods: ShippingMethodConfig[];
  taxRate: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const t = useTranslations('checkout');
  const tc = useTranslations('cart');
  const locale = useLocale();
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice)();
  const clearCart = useCartStore((s) => s.clearCart);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const createOrder = useCreateOrder();
  const createGuestOrder = useCreateGuestOrder();
  const validateCoupon = useValidateCoupon();

  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [transactionId, setTransactionId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState('');
  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutConfig | null>(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    street: '',
    district: DEFAULT_DISTRICT,
    email: '',
    notes: '',
  });

  useEffect(() => {
    api
      .get<{ success: boolean; data: CheckoutConfig }>('/api/checkout-config')
      .then((res) => {
        if (res.data) {
          setCheckoutConfig(res.data);
          const enabledPayment = res.data.paymentMethods.filter((p) => p.enabled);
          if (enabledPayment.length > 0) setPaymentMethod(enabledPayment[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Prefill from the account when signed in (still editable for this order).
  // Adjusted during render — the React-recommended alternative to a syncing effect.
  const [prefilledUser, setPrefilledUser] = useState<typeof user | undefined>(undefined);
  if (user && user !== prefilledUser) {
    setPrefilledUser(user);
    setForm((f) => ({
      ...f,
      name: f.name || user.name || '',
      phone: f.phone || user.phone || '',
      email: f.email || user.email || '',
    }));
  }

  const enabledPayments = checkoutConfig?.paymentMethods.filter((p) => p.enabled) ?? [];
  const enabledShipping = checkoutConfig?.shippingMethods.filter((s) => s.enabled) ?? [];
  const taxRate = parseFloat(checkoutConfig?.taxRate ?? '5') / 100;

  const subtotal = totalPrice;
  const discount = couponDiscount;
  const tax = Math.round((subtotal - discount) * taxRate);

  // Shipping is determined by the district: Dhaka city → "Inside Dhaka",
  // everywhere else → "Outside Dhaka". Falls back to the first enabled method.
  const isInsideDhaka = form.district === DEFAULT_DISTRICT;
  const shippingMethod =
    enabledShipping.find((s) => s.id === (isInsideDhaka ? 'inside-dhaka' : 'outside-dhaka')) ??
    enabledShipping[0];
  const shippingCost = shippingMethod
    ? subtotal >= (shippingMethod.freeAbove ?? 5000)
      ? 0
      : shippingMethod.cost
    : 0;
  const grandTotal = subtotal + tax + shippingCost - discount;

  useEffect(() => {
    const cart = useCartStore.getState().items;
    if (cart.length === 0) return;
    trackInitiateCheckout(
      cart.map((i) => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
      cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
    );
  }, []);

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="bg-muted mb-6 flex h-20 w-20 items-center justify-center rounded-full">
          <ShoppingBag className="text-muted-foreground h-8 w-8" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">{t('emptyCart')}</h1>
        <p className="text-muted-foreground mb-6">{t('addProducts')}</p>
        <Link href="/products">
          <PremiumButton variant="primary">{t('browseProducts')}</PremiumButton>
        </Link>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponMessage('');
    try {
      const res = await validateCoupon.mutateAsync({ code: couponCode, subtotal });
      setCouponDiscount(res.data.discount);
      setCouponMessage(t('couponApplied'));
      trackApplyCoupon(couponCode, res.data.discount);
    } catch (err) {
      setCouponDiscount(0);
      setCouponMessage(err instanceof Error ? err.message : t('invalidCoupon'));
    }
  };

  const formValid =
    form.name.trim().length >= 2 &&
    form.phone.trim().length >= 10 &&
    form.street.trim().length >= 5 &&
    !!form.district &&
    /^\S+@\S+\.\S+$/.test(form.email.trim());

  const handlePlaceOrder = async () => {
    if (!formValid) {
      toast.error(t('fillDeliveryDetails'));
      return;
    }
    if (!paymentMethod) {
      toast.error(t('selectPayment'));
      return;
    }
    const selectedPM = enabledPayments.find((p) => p.id === paymentMethod);
    if (selectedPM?.requiresTransactionId && transactionId.trim().length < 4) {
      toast.error(t('enterTransactionId'));
      return;
    }

    // Both endpoints accept the same shape — the authenticated one additionally
    // links the order to the account (userId) instead of leaving it anonymous.
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      shipping: {
        street: form.street.trim(),
        city: form.district,
        district: form.district,
      },
      shippingMethodId: shippingMethod?.id || undefined,
      paymentMethod: paymentMethod as 'bkash' | 'nagad' | 'sslcommerz' | 'cod',
      paymentTransactionId: transactionId.trim() || undefined,
      couponCode: couponCode.trim() || undefined,
      notes: form.notes.trim() || undefined,
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    };

    try {
      const res = isAuthenticated
        ? await createOrder.mutateAsync(payload)
        : await createGuestOrder.mutateAsync(payload);
      trackPurchase({
        orderId: res.data.orderId,
        orderNumber: res.data.orderNumber,
        value: res.data.total,
        items: items.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
      });
      clearCart();
      toast.success(t('orderPlaced'), {
        description: `${t('order')} ${res.data.orderNumber} ${t('confirmed')}.`,
      });
      // The invoice page authenticates with the secure access token, so it works
      // for both signed-in and guest orders.
      const token = res.data.invoiceAccessToken;
      const invoiceUrl = token
        ? `/invoices/${encodeURIComponent(res.data.orderNumber)}?token=${encodeURIComponent(token)}&placed=1`
        : `/invoices/${encodeURIComponent(res.data.orderNumber)}?placed=1`;
      router.push(invoiceUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('failedToPlaceOrder'));
    }
  };

  const selectedPM = enabledPayments.find((p) => p.id === paymentMethod);
  const canPlace = formValid && !!paymentMethod;
  const placingOrder = createOrder.isPending || createGuestOrder.isPending;

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 lg:py-12">
        {/* Top bar */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <Store className="h-5 w-5" /> Tuktak
          </Link>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <Lock className="h-3 w-3" /> {t('secureCheckout')}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left — form */}
          <div className="space-y-0 lg:col-span-7">
            {/* Delivery details */}
            <div className="border-border bg-card rounded-t-2xl border border-b-0 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">{t('deliveryDetails')}</h2>
                {!isAuthenticated && (
                  <Link href="/login" className="text-primary text-sm hover:underline">
                    {t('signIn')}
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  placeholder={t('fullName')}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-12"
                />
                <Input
                  placeholder={t('mobileNumber')}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  inputMode="tel"
                  className="h-12"
                />
                <Input
                  placeholder={t('address')}
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  className="h-12"
                />
                <Select
                  value={form.district}
                  onValueChange={(value) => setForm({ ...form, district: value })}
                >
                  <SelectTrigger className="h-12 w-full">
                    <SelectValue placeholder={t('selectDistrict')} />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRICTS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {locale === 'bn' ? d.labelBn : d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder={t('email')}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  type="email"
                  className="h-12"
                />
                <Input
                  placeholder={t('orderNotes')}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="h-12"
                />
              </div>
            </div>

            {/* Payment */}
            {enabledPayments.length > 0 ? (
              <div className="border-border bg-card border border-b-0 p-6">
                <h2 className="mb-1 text-lg font-bold">{t('payment')}</h2>
                <p className="text-muted-foreground mb-4 text-xs">{t('secureTransactions')}</p>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="grid grid-cols-3 gap-2"
                >
                  {enabledPayments.map((pm) => {
                    const Icon = PAYMENT_ICONS[pm.id] ?? Banknote;
                    return (
                      <div
                        key={pm.id}
                        onClick={() => setPaymentMethod(pm.id)}
                        className={cn(
                          'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all',
                          paymentMethod === pm.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/30'
                        )}
                      >
                        <RadioGroupItem value={pm.id} className="sr-only" />
                        <Icon
                          className={cn(
                            'h-5 w-5',
                            paymentMethod === pm.id ? 'text-primary' : 'text-muted-foreground'
                          )}
                        />
                        <p className="text-xs font-semibold sm:text-sm">{pm.name}</p>
                      </div>
                    );
                  })}
                </RadioGroup>
                {selectedPM?.requiresTransactionId && (
                  <div className="border-border bg-muted/30 mt-4 space-y-2 rounded-xl border p-4">
                    <Label className="text-xs font-semibold">{t('transactionId')}</Label>
                    <Input
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                      placeholder={t('transactionIdPlaceholder')}
                      maxLength={100}
                      className="h-10"
                    />
                    <p className="text-muted-foreground text-[10px]">
                      {t('sendPaymentVia')} {selectedPM.name}, {t('pasteTrxId')}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-border bg-card border border-b-0 p-6">
                <h2 className="mb-1 text-lg font-bold">{t('payment')}</h2>
                <p className="text-muted-foreground text-xs">{t('noPaymentMethods')}</p>
              </div>
            )}

            {/* Mobile — Place order */}
            <PremiumButton
              variant="gradient"
              size="lg"
              fullWidth
              onClick={handlePlaceOrder}
              disabled={!canPlace || placingOrder}
              isLoading={placingOrder}
              className="mt-6 lg:hidden"
            >
              {placingOrder
                ? t('placingOrder')
                : `${t('completeOrder')} · ${formatPrice(grandTotal)}`}
            </PremiumButton>
          </div>

          {/* Right — order summary */}
          <div className="lg:col-span-5">
            <div className="border-border bg-card space-y-5 rounded-2xl border p-6 lg:sticky lg:top-8">
              <h2 className="text-lg font-bold">{tc('orderSummary')}</h2>

              {/* Items */}
              <div className="max-h-80 space-y-4 overflow-y-auto">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.variantId ?? ''}`} className="flex gap-3">
                    <div className="border-border bg-muted relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {formatPrice(item.price)} × {item.quantity}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="border-border flex items-center rounded-lg border">
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity - 1, item.variantId)
                            }
                            className="text-muted-foreground hover:text-foreground flex h-6 w-6 items-center justify-center transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="border-border flex h-6 w-7 items-center justify-center border-x text-xs font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity + 1, item.variantId)
                            }
                            className="text-muted-foreground hover:text-foreground flex h-6 w-6 items-center justify-center transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.productId, item.variantId)}
                          className="text-destructive flex items-center gap-0.5 text-xs hover:underline"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <span className="whitespace-nowrap text-sm font-semibold">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Coupon */}
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder={t('discountCode')}
                  className="h-10 flex-1"
                />
                <PremiumButton
                  variant="outline"
                  size="sm"
                  onClick={handleValidateCoupon}
                  disabled={validateCoupon.isPending}
                  className="h-10 px-4"
                >
                  {t('apply')}
                </PremiumButton>
              </div>
              {couponMessage && (
                <p
                  className={cn(
                    'text-xs',
                    couponDiscount > 0 ? 'text-emerald-500' : 'text-destructive'
                  )}
                >
                  {couponMessage}
                </p>
              )}

              <Separator />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tc('subtotal')}</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tc('shipping')}</span>
                  <span className="font-medium">
                    {shippingCost === 0 ? t('free') : formatPrice(shippingCost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {tc('tax')} ({Math.round(taxRate * 100)}%)
                  </span>
                  <span className="font-medium">{formatPrice(tax)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-500">
                    <span>{tc('discount')}</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>{tc('total')}</span>
                <span>{formatPrice(grandTotal)}</span>
              </div>

              {/* Desktop — Place order */}
              <PremiumButton
                variant="gradient"
                size="lg"
                fullWidth
                onClick={handlePlaceOrder}
                disabled={!canPlace || placingOrder}
                isLoading={placingOrder}
                className="hidden lg:flex"
              >
                {placingOrder ? t('placingOrder') : t('completeOrder')}
              </PremiumButton>

              <div className="text-muted-foreground flex items-center justify-center gap-1 text-[10px]">
                <Lock className="h-3 w-3" /> {t('sslEncrypted')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
