'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { api } from '@/lib/api-client';
import { estimateTotals, formatPrice, type CheckoutConfig } from '@/lib/utils';
import { useCartStore } from '@/stores/useCartStore';
import { useUIStore } from '@/stores/useUIStore';

/** Simple hook: returns true above the sm breakpoint (640px) */
function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    setDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => {
      mq.removeEventListener('change', handler);
    };
  }, []);
  return desktop;
}

export function CartPanel() {
  const t = useTranslations('cart');
  const isCartOpen = useUIStore((s) => s.isCartOpen);
  const closeCart = useUIStore((s) => s.closeCart);
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const totalPrice = useCartStore((s) => s.totalPrice)();
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
  const totalItems = useCartStore((s) => s.totalItems)();
  const isDesktop = useIsDesktop();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCartOpen) closeCart();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isCartOpen, closeCart]);

  return (
    <Sheet
      open={isCartOpen}
      onOpenChange={(open) => {
        if (!open) closeCart();
      }}
    >
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className={`flex flex-col p-0 ${isDesktop ? 'sm:max-w-md' : 'max-h-[85vh] rounded-t-2xl'}`}
        showCloseButton={false}
      >
        {/* Header */}
        <SheetHeader className="border-border border-b px-4 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-heading-sm font-semibold">
              {t('title')} {totalItems > 0 && `(${totalItems})`}
            </SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close cart">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 4L12 12M12 4L4 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="text-muted-foreground/30 h-12 w-12" />
              <p className="text-body-sm text-muted-foreground mt-3 font-medium">{t('empty')}</p>
              <SheetClose asChild>
                <Link
                  href="/products"
                  className="text-body-xs text-primary hover:text-primary/80 mt-4 font-medium transition-colors"
                >
                  {t('continueShopping')}
                </Link>
              </SheetClose>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={`${item.productId}-${item.variantId ?? ''}`}
                  layout
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="border-border bg-card mb-3 flex gap-3 rounded-xl border p-3 last:mb-0"
                >
                  {/* Image */}
                  <div className="bg-muted relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={item.image ?? '/placeholder-product.svg'}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <Link
                        href={`/products/${item.slug ?? item.productId}`}
                        className="text-body-sm hover:text-primary line-clamp-1 font-medium transition-colors"
                        onClick={closeCart}
                      >
                        {item.name}
                      </Link>
                      <p className="text-body-xs text-muted-foreground mt-0.5">
                        {formatPrice(item.price)} {t('each')}
                      </p>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5">
                      {/* Quantity stepper */}
                      <div className="border-border flex items-center rounded-lg border">
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity - 1, item.variantId)
                          }
                          className="hover:bg-muted/50 flex h-8 w-8 items-center justify-center rounded-l-lg transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="border-border flex h-8 w-8 items-center justify-center border-x text-xs font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1, item.variantId)
                          }
                          className="hover:bg-muted/50 flex h-8 w-8 items-center justify-center rounded-r-lg transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-semibold">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeItem(item.productId, item.variantId)}
                          className="text-muted-foreground hover:text-destructive flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer — sticky */}
        {items.length > 0 && (
          <SheetFooter className="border-border border-t px-4 py-4">
            <div className="w-full space-y-3">
              <div className="text-body-sm flex items-center justify-between">
                <span className="text-muted-foreground">{t('subtotal')}</span>
                <span className="font-semibold">{formatPrice(totalPrice)}</span>
              </div>

              <Separator />

              <div className="text-body-sm flex items-center justify-between">
                <span className="text-muted-foreground">{t('shipping')}</span>
                <span className="text-success">
                  {estimate.shipping === 0 ? t('freeShipping') : formatPrice(estimate.shipping)}
                </span>
              </div>

              <SheetClose asChild>
                <Link href="/checkout" className="block">
                  <Button variant="default" size="lg" className="w-full rounded-xl">
                    {t('checkout')} — {formatPrice(estimate.total)}
                  </Button>
                </Link>
              </SheetClose>

              <SheetClose asChild>
                <Link
                  href="/products"
                  className="text-body-xs text-muted-foreground hover:text-primary block text-center transition-colors"
                >
                  {t('continueShopping')}
                </Link>
              </SheetClose>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
