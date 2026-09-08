import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type RecentlyViewedProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  viewedAt: number;
};

const MAX_RECENTLY_VIEWED = 10;

type RecentlyViewedState = {
  items: RecentlyViewedProduct[];
  add: (product: Omit<RecentlyViewedProduct, 'viewedAt'>) => void;
  clear: () => void;
};

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      items: [],

      add: (product) => {
        const items = get().items.filter((i) => i.id !== product.id);
        set({
          items: [{ ...product, viewedAt: Date.now() }, ...items].slice(0, MAX_RECENTLY_VIEWED),
        });
      },

      clear: () => {
        set({ items: [] });
      },
    }),
    { name: 'tuktak-recently-viewed' }
  )
);
