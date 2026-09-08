import { useState, useCallback } from 'react';
import { toast } from 'sonner';

import { useCartStore } from '@/stores/useCartStore';

type AddToCartProduct = {
  productId?: string;
  id?: string;
  slug: string;
  name: string;
  price: number;
  image: string;
};

/**
 * Shared hook for add-to-cart with optimistic UI + toast.
 * Eliminates duplicated add-to-cart logic across BestSellers,
 * TrendingProducts, CategoryShowcase, ProductCard, etc.
 */
export function useAddToCart() {
  const addToCart = useCartStore((s) => s.addItem);
  const [addedId, setAddedId] = useState<string | null>(null);

  const add = useCallback(
    (product: AddToCartProduct, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      const pid = product.productId ?? product.id ?? '';
      addToCart({
        productId: pid,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
      });
      setAddedId(pid);
      const label = product.name.length > 30 ? `${product.name.slice(0, 30)}…` : product.name;
      toast.success(`${label} added to cart`);
      setTimeout(() => setAddedId((cur) => (cur === pid ? null : cur)), 2000);
    },
    [addToCart]
  );

  const isAdded = useCallback((id: string) => addedId === id, [addedId]);

  return { add, isAdded, addedId };
}
