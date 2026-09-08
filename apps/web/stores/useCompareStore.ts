import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CompareProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  image?: string;
  brand?: string;
  rating?: number;
  stock: number;
  description?: string;
};

const MAX_COMPARE = 4;

type CompareState = {
  items: CompareProduct[];
  add: (product: CompareProduct) => boolean;
  remove: (id: string) => void;
  clear: () => void;
  isComparing: (id: string) => boolean;
  count: () => number;
};

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],

      add: (product) => {
        const items = get().items;
        if (items.find((i) => i.id === product.id)) return false;
        if (items.length >= MAX_COMPARE) return false;
        set({ items: [...items, product] });
        return true;
      },

      remove: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },

      clear: () => {
        set({ items: [] });
      },

      isComparing: (id) => {
        return get().items.some((i) => i.id === id);
      },

      count: () => {
        return get().items.length;
      },
    }),
    { name: 'tuktak-compare' }
  )
);
