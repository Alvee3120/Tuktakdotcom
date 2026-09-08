import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { toast } from 'sonner';

import { MAX_CART_ITEMS, MAX_QUANTITY_PER_ITEM } from '@/lib/constants';
import { trackAddToCart } from '@/lib/tracking';

type CartItem = {
  productId: string;
  slug?: string;
  variantId?: string;
  quantity: number;
  name: string;
  price: number;
  image?: string;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const items = get().items;
        const existingIndex = items.findIndex(
          (i) => i.productId === item.productId && i.variantId === item.variantId
        );

        if (existingIndex >= 0) {
          const updated = [...items];
          const newQty = Math.min(
            updated[existingIndex].quantity + item.quantity,
            MAX_QUANTITY_PER_ITEM
          );
          updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
          set({ items: updated });
        } else if (items.length < MAX_CART_ITEMS) {
          set({ items: [...items, item] });
        } else {
          toast.error(`Cart limit reached (${MAX_CART_ITEMS} items). Remove an item first.`);
        }

        // Central AddToCart tracking — covers every call site (cards, detail page, sections)
        trackAddToCart({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        });
      },

      removeItem: (productId, variantId) => {
        set({
          items: get().items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        });
      },

      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId && i.variantId === variantId
              ? { ...i, quantity: Math.min(quantity, MAX_QUANTITY_PER_ITEM) }
              : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: 'tuktak-cart',
    }
  )
);

/**
 * Hydration-safe cart count for badges. The persisted store rehydrates from
 * localStorage on the client, so reading it during the first render can
 * mismatch the server HTML (badge 0 vs N). useSyncExternalStore returns the
 * server snapshot (0) until hydration completes, avoiding React hydration
 * errors while staying reactive afterwards.
 */
export function useCartCount(): number {
  return useSyncExternalStore(
    useCartStore.subscribe,
    () => useCartStore.getState().items.reduce((sum, i) => sum + i.quantity, 0),
    () => 0
  );
}
