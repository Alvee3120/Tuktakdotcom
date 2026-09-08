'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { formatPrice } from '@/lib/utils';
import { useCartCount, useCartStore } from '@/stores/useCartStore';
import { useUIStore } from '@/stores/useUIStore';

/**
 * Floating cart button — fixed on the right edge, vertically centered.
 * Visible once the cart has items. Uses a soft-rounded-square shape and
 * theme tokens (bg-primary / text-primary-foreground) so it adapts to
 * light and dark mode. The button "bumps" whenever the count increases so
 * an add-to-cart toast visually merges into it. Sits above the
 * MobileBottomNav on small screens.
 */
export function FloatingCart() {
  const count = useCartCount();
  const totalPrice = useSyncExternalStore(
    useCartStore.subscribe,
    () => useCartStore.getState().totalPrice(),
    () => 0
  );
  const openCart = useUIStore((s) => s.openCart);
  const [bumped, setBumped] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current) {
      // Deferred (rAF) to avoid a synchronous setState inside the effect.
      const raf = requestAnimationFrame(() => setBumped(true));
      const timer = setTimeout(() => setBumped(false), 600);
      prevCount.current = count;
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }
    prevCount.current = count;
  }, [count]);

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: bumped ? [1, 1.25, 1] : 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={
            bumped
              ? { duration: 0.45, times: [0, 0.4, 1] }
              : { type: 'spring', damping: 18, stiffness: 300 }
          }
          onClick={openCart}
          aria-label={`Open cart (${count} items)`}
          className="bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90 fixed right-4 top-1/2 z-[55] hidden h-16 w-16 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-xl shadow-xl transition-colors lg:flex"
        >
          {/* ping ring on bump */}
          {bumped && <span className="bg-primary/40 absolute inset-0 animate-ping rounded-xl" />}
          <ShoppingCart className="h-5 w-5" />
          <span className="text-[9px] font-bold leading-tight">{formatPrice(totalPrice)}</span>
          <span className="border-background bg-destructive absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 px-1 text-[10px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
