'use client';

import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Container, Section } from '@/components/shared/Layout';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api-client';
import { estimateTotals, formatPrice, type CheckoutConfig } from '@/lib/utils';
import { useCartStore } from '@/stores/useCartStore';

export default function CartPage() {
  const t = useTranslations('cart');
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const totalPrice = useCartStore((s) => s.totalPrice)();
  const totalItems = useCartStore((s) => s.totalItems)();
  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutConfig | null>(null);
  useEffect(() => {
    api
      .get<{ success: boolean; data: CheckoutConfig }>('/api/checkout-config')
      .then((res) => {
        if (res.data) setCheckoutConfig(res.data);
      })
      .catch(() => {});
  }, []);
  const estimate = estimateTotals(totalPrice, 0, checkoutConfig ?? undefined);

  if (items.length === 0) {
    return (
      <Section>
        <Container>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="text-muted-foreground/40 h-16 w-16" />
            <h1 className="text-heading-lg mt-4 font-bold">{t('empty')}</h1>
            <p className="text-body-md text-muted-foreground mt-2">{t('continueShopping')}</p>
            <Link href="/products">
              <PremiumButton variant="primary" className="mt-6">
                {t('continueShopping')}
              </PremiumButton>
            </Link>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section>
      <Container>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-heading-xl font-bold">{t('title')}</h1>
          <button
            onClick={clearCart}
            className="text-body-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            {t('clearCart')}
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Cart items */}
          <div className="space-y-4 lg:col-span-2">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId ?? ''}`}
                className="border-border bg-card flex gap-4 rounded-xl border p-4"
              >
                {/* Image */}
                <Link
                  href={`/products/${item.slug ?? item.productId}`}
                  className="bg-muted relative h-24 w-24 shrink-0 overflow-hidden rounded-lg"
                >
                  <Image
                    src={item.image ?? '/placeholder-product.svg'}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </Link>

                {/* Info */}
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <Link
                      href={`/products/${item.slug ?? item.productId}`}
                      className="text-body-md hover:text-primary line-clamp-1 font-medium transition-colors"
                    >
                      {item.name}
                    </Link>
                    <p className="text-body-sm text-muted-foreground mt-0.5">
                      {formatPrice(item.price)} {t('each')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Quantity controls */}
                    <div className="border-border flex items-center rounded-lg border">
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1, item.variantId)
                        }
                        className="hover:bg-muted/50 flex h-9 w-9 items-center justify-center transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="border-border flex h-9 w-10 items-center justify-center border-x text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1, item.variantId)
                        }
                        className="hover:bg-muted/50 flex h-9 w-9 items-center justify-center transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                      <span className="text-body-md font-semibold">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={t('remove')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="border-border bg-card sticky top-24 space-y-4 rounded-xl border p-6">
              <h2 className="text-heading-sm font-semibold">{t('orderSummary')}</h2>

              <div className="space-y-3">
                <div className="text-body-sm flex justify-between">
                  <span className="text-muted-foreground">
                    {t('subtotal')} ({totalItems})
                  </span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <div className="text-body-sm flex justify-between">
                  <span className="text-muted-foreground">{t('shipping')}</span>
                  <span className="text-success">
                    {estimate.shipping === 0 ? t('freeShipping') : formatPrice(estimate.shipping)}
                  </span>
                </div>
                <div className="text-body-sm flex justify-between">
                  <span className="text-muted-foreground">{t('tax')}</span>
                  <span>{formatPrice(estimate.tax)}</span>
                </div>
              </div>

              <Separator />

              <div className="text-heading-sm flex justify-between font-bold">
                <span>{t('total')}</span>
                <span>{formatPrice(estimate.total)}</span>
              </div>

              <Link href="/checkout" className="block">
                <PremiumButton variant="primary" size="lg" fullWidth>
                  {t('checkout')}
                </PremiumButton>
              </Link>

              <Link
                href="/products"
                className="text-body-sm text-muted-foreground hover:text-primary block text-center transition-colors"
              >
                {t('continueShopping')}
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
