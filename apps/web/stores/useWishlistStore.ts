import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type WishlistItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  compareAtPrice?: number;
  stock: number;
};

type WishlistState = {
  items: WishlistItem[];
  toggle: (item: WishlistItem) => void;
  remove: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  clear: () => void;
};

export const useWishlistCount = () => useWishlistStore((s) => s.items.length);

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      toggle: (item) => {
        const items = get().items;
        const existing = items.findIndex((i) => i.productId === item.productId);
        if (existing >= 0) {
          set({ items: items.filter((i) => i.productId !== item.productId) });
        } else {
          set({ items: [...items, item] });
        }
      },

      remove: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) });
      },

      isWishlisted: (productId) => {
        return get().items.some((i) => i.productId === productId);
      },

      clear: () => set({ items: [] }),
    }),
    {
      name: 'tuktak-wishlist',
    }
  )
);
