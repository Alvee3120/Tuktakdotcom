'use client';

import {
  MapPin,
  Plus,
  Minus,
  Check,
  Loader2,
  ShoppingBag,
  Trash2,
  Truck,
  CreditCard,
  ChevronDown,
  Lock,
  Store,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import {
  useAddresses,
  useCreateOrder,
  useCreateAddress,
  useCreateGuestOrder,
  useValidateCoupon,
} from '@/hooks/useOrders';
import { api } from '@/lib/api-client';
import { trackApplyCoupon, trackInitiateCheckout, trackPurchase } from '@/lib/tracking';
import { cn, formatPrice } from '@/lib/utils';
import { useCartStore } from '@/stores/useCartStore';

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
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice)();
  const clearCart = useCartStore((s) => s.clearCart);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: addressesRes, isLoading: loadingAddresses } = useAddresses(isAuthenticated);
  const addresses = addressesRes?.data ?? [];

  const createOrder = useCreateOrder();
  const createGuestOrder = useCreateGuestOrder();
  const createAddress = useCreateAddress();
  const validateCoupon = useValidateCoupon();

  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [transactionId, setTransactionId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<string>('');
  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutConfig | null>(null);

  const [addressForm, setAddressForm] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    district: '',
    postalCode: '',
    isDefault: false,
  });
  const [guestEmail, setGuestEmail] = useState('');

  useEffect(() => {
    api
      .get<{ success: boolean; data: CheckoutConfig }>('/api/checkout-config')
      .then((res) => {
        if (res.data) {
          setCheckoutConfig(res.data);
          const enabledShipping = res.data.shippingMethods.filter((s) => s.enabled);
          if (enabledShipping.length > 0) setSelectedShipping(enabledShipping[0].id);
          const enabledPayment = res.data.paymentMethods.filter((p) => p.enabled);
          if (enabledPayment.length > 0) setPaymentMethod(enabledPayment[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const enabledPayments = checkoutConfig?.paymentMethods.filter((p) => p.enabled) ?? [];
  const enabledShipping = checkoutConfig?.shippingMethods.filter((s) => s.enabled) ?? [];
  const taxRate = parseFloat(checkoutConfig?.taxRate ?? '5') / 100;

  const subtotal = totalPrice;
  const discount = couponDiscount;
  const tax = Math.round((subtotal - discount) * taxRate);
  const selectedShippingMethod = enabledShipping.find((s) => s.id === selectedShipping);
  const shippingCost = selectedShippingMethod
    ? subtotal >= (selectedShippingMethod.freeAbove ?? 5000)
      ? 0
      : selectedShippingMethod.cost
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

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAddress.mutateAsync(addressForm);
      setShowAddressForm(false);
      setAddressForm({
        name: '',
        phone: '',
        street: '',
        city: '',
        district: '',
        postalCode: '',
        isDefault: false,
      });
    } catch {}
  };

  const guestFormValid =
    addressForm.name.trim().length >= 2 &&
    addressForm.phone.trim().length >= 10 &&
    addressForm.street.trim().length >= 5 &&
    addressForm.city.trim().length >= 2;

  const handlePlaceOrder = async () => {
    if (!paymentMethod) {
      toast.error(t('selectPayment'));
      return;
    }
    const selectedPM = enabledPayments.find((p) => p.id === paymentMethod);
    if (selectedPM?.requiresTransactionId && transactionId.trim().length < 4) {
      toast.error(t('enterTransactionId'));
      return;
    }

    const itemsPayload = items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    if (isAuthenticated) {
      if (!selectedAddress) {
        toast.error(t('selectAddress'));
        return;
      }
      try {
        const res = await createOrder.mutateAsync({
          shippingAddressId: selectedAddress,
          shippingMethodId: selectedShipping || undefined,
          paymentMethod: paymentMethod as 'bkash' | 'nagad' | 'sslcommerz' | 'cod',
          paymentTransactionId: transactionId.trim() || undefined,
          couponCode: couponCode || undefined,
          notes: notes || undefined,
          items: itemsPayload,
        });
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
        router.push(`/account/orders/${res.data.orderId}?success=true`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('failedToPlaceOrder'));
      }
      return;
    }

    if (!guestFormValid) {
      toast.error(t('fillGuestDetails'));
      return;
    }
    try {
      const res = await createGuestOrder.mutateAsync({
        name: addressForm.name.trim(),
        phone: addressForm.phone.trim(),
        email: guestEmail.trim() || undefined,
        shipping: {
          street: addressForm.street.trim(),
          city: addressForm.city.trim(),
          district: addressForm.district.trim() || undefined,
          postalCode: addressForm.postalCode.trim() || undefined,
        },
        shippingMethodId: selectedShipping || undefined,
        paymentMethod: paymentMethod as 'bkash' | 'nagad' | 'sslcommerz' | 'cod',
        paymentTransactionId: transactionId.trim() || undefined,
        couponCode: couponCode || undefined,
        notes: notes || undefined,
        items: itemsPayload,
      });
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
      // Include the secure invoice access token so the invoice page can authenticate
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
  const canPlace = isAuthenticated
    ? !!selectedAddress && !!paymentMethod
    : guestFormValid && !!paymentMethod;
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
            {/* Contact */}
            <div className="border-border bg-card rounded-t-2xl border border-b-0 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">{t('contact')}</h2>
                {!isAuthenticated && (
                  <Link href="/login" className="text-primary text-sm hover:underline">
                    {t('signIn')}
                  </Link>
                )}
              </div>
              {isAuthenticated ? (
                <>
                  <Input
                    placeholder={t('emailOrPhone')}
                    defaultValue={user?.email ?? ''}
                    readOnly
                    className="h-12"
                  />
                  <label className="text-muted-foreground mt-3 flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="border-border accent-primary rounded"
                    />
                    {t('emailMeOffers')}
                  </label>
                </>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder={t('fullName')}
                    value={addressForm.name}
                    onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                    required
                    className="h-12"
                  />
                  <Input
                    placeholder={t('phone')}
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    required
                    className="h-12"
                  />
                  <Input
                    placeholder={t('emailOptional')}
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    type="email"
                    className="h-12"
                  />
                  <p className="text-muted-foreground text-xs">{t('guestContactNote')}</p>
                </div>
              )}
            </div>

            {/* Delivery */}
            <div className="border-border bg-card border border-b-0 p-6">
              <h2 className="mb-4 text-lg font-bold">{t('delivery')}</h2>
              {isAuthenticated ? (
                <div className="space-y-3">
                  {loadingAddresses ? (
                    <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" /> {t('loadingAddresses')}
                    </div>
                  ) : addresses.length > 0 ? (
                    <RadioGroup
                      value={selectedAddress}
                      onValueChange={setSelectedAddress}
                      className="space-y-2"
                    >
                      {addresses.map((addr) => (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddress(addr.id)}
                          className={cn(
                            'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all',
                            selectedAddress === addr.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground/30'
                          )}
                        >
                          <RadioGroupItem value={addr.id} className="mt-1" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{addr.name}</p>
                            <p className="text-muted-foreground text-xs">
                              {addr.street}
                              {addr.city ? `, ${addr.city}` : ''}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {addr.district ? `${addr.district}, ` : ''}
                              {addr.postalCode ?? ''}
                            </p>
                            <p className="text-muted-foreground text-xs">{addr.phone}</p>
                          </div>
                          {addr.isDefault && (
                            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium">
                              {t('default')}
                            </span>
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="text-muted-foreground py-6 text-center text-sm">
                      <MapPin className="mx-auto mb-2 h-6 w-6 opacity-40" /> {t('noSavedAddresses')}
                    </div>
                  )}

                  {/* Add new address inline */}
                  <button
                    onClick={() => setShowAddressForm(!showAddressForm)}
                    className="text-primary flex items-center gap-2 text-sm hover:underline"
                  >
                    <Plus className="h-4 w-4" /> {t('addNewAddress')}
                  </button>
                  {showAddressForm && (
                    <form
                      onSubmit={handleCreateAddress}
                      className="border-border bg-muted/30 mt-2 space-y-3 rounded-xl border p-4"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder={t('fullName')}
                          value={addressForm.name}
                          onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                          required
                          className="h-10"
                        />
                        <Input
                          placeholder={t('phone')}
                          value={addressForm.phone}
                          onChange={(e) =>
                            setAddressForm({ ...addressForm, phone: e.target.value })
                          }
                          required
                          className="h-10"
                        />
                      </div>
                      <Input
                        placeholder={t('address')}
                        value={addressForm.street}
                        onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                        required
                        className="h-10"
                      />
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <Input
                          placeholder={t('city')}
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          required
                          className="h-10"
                        />
                        <Input
                          placeholder={t('district')}
                          value={addressForm.district}
                          onChange={(e) =>
                            setAddressForm({ ...addressForm, district: e.target.value })
                          }
                          className="h-10"
                        />
                        <Input
                          placeholder={t('postalCode')}
                          value={addressForm.postalCode}
                          onChange={(e) =>
                            setAddressForm({ ...addressForm, postalCode: e.target.value })
                          }
                          className="col-span-2 h-10 sm:col-span-1"
                        />
                      </div>
                      <PremiumButton
                        variant="primary"
                        type="submit"
                        size="sm"
                        disabled={createAddress.isPending}
                      >
                        {createAddress.isPending ? t('saving') : t('saveAddress')}
                      </PremiumButton>
                    </form>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder={t('address')}
                    value={addressForm.street}
                    onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                    required
                    className="h-10"
                  />
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Input
                      placeholder={t('city')}
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      required
                      className="h-10"
                    />
                    <Input
                      placeholder={t('district')}
                      value={addressForm.district}
                      onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                      className="h-10"
                    />
                    <Input
                      placeholder={t('postalCode')}
                      value={addressForm.postalCode}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, postalCode: e.target.value })
                      }
                      className="col-span-2 h-10 sm:col-span-1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Shipping method */}
            {enabledShipping.length > 0 && (
              <div className="border-border bg-card border border-b-0 p-6">
                <h2 className="mb-4 text-lg font-bold">{t('shippingMethod')}</h2>
                <RadioGroup
                  value={selectedShipping}
                  onValueChange={setSelectedShipping}
                  className="space-y-2"
                >
                  {enabledShipping.map((sm) => (
                    <div
                      key={sm.id}
                      onClick={() => setSelectedShipping(sm.id)}
                      className={cn(
                        'flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition-all',
                        selectedShipping === sm.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={sm.id} />
                        <div>
                          <p className="text-sm font-semibold">{sm.name}</p>
                          <p className="text-muted-foreground text-xs">{sm.estimatedDays}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold">
                        {subtotal >= (sm.freeAbove ?? 5000) ? t('free') : formatPrice(sm.cost)}
                      </span>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Payment */}
            {enabledPayments.length > 0 && (
              <div className="border-border bg-card border border-b-0 p-6">
                <h2 className="mb-1 text-lg font-bold">{t('payment')}</h2>
                <p className="text-muted-foreground mb-4 text-xs">{t('secureTransactions')}</p>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="space-y-2"
                >
                  {enabledPayments.map((pm) => (
                    <div
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      className={cn(
                        'flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition-all',
                        paymentMethod === pm.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={pm.id} />
                        <div>
                          <p className="text-sm font-semibold">{pm.name}</p>
                          <p className="text-muted-foreground text-xs">{pm.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
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
            )}

            {/* Order notes */}
            <div className="mt-4">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('orderNotes')}
                className="h-10"
              />
            </div>

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
