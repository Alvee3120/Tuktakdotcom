'use client';

import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { Container, Section } from '@/components/shared/Layout';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/stores/useCartStore';
import { useWishlistStore } from '@/stores/useWishlistStore';

export default function WishlistPage() {
  return (
    <AuthGuard>
      <WishlistContent />
    </AuthGuard>
  );
}

function WishlistContent() {
  const items = useWishlistStore((s) => s.items);
  const remove = useWishlistStore((s) => s.remove);
  const clear = useWishlistStore((s) => s.clear);
  const addItem = useCartStore((s) => s.addItem);

  if (items.length === 0) {
    return (
      <Section>
        <Container>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Heart className="text-muted-foreground/40 h-16 w-16" />
            <h1 className="text-heading-lg mt-4 font-bold">Your Wishlist is Empty</h1>
            <p className="text-body-md text-muted-foreground mt-2">
              Save products you love to view them later.
            </p>
            <Link href="/products">
              <PremiumButton variant="primary" className="mt-6">
                Browse Products
              </PremiumButton>
            </Link>
          </div>
        </Container>
      </Section>
    );
  }

  const handleMoveToCart = (item: (typeof items)[number]) => {
    addItem({
      productId: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: 1,
    });
    remove(item.productId);
    toast.success('Added to cart', { description: item.name });
  };

  return (
    <Section>
      <Container>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-heading-xl font-bold">
            Wishlist <span className="text-body-md text-muted-foreground">({items.length})</span>
          </h1>
          <button
            onClick={clear}
            className="text-body-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="border-border bg-card hover:border-primary/20 group flex flex-col overflow-hidden rounded-xl border transition-all hover:shadow-lg"
            >
              {/* Image */}
              <Link
                href={`/products/${item.slug}`}
                className="bg-muted relative aspect-square overflow-hidden"
              >
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {item.stock <= 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="text-body-sm font-medium text-white">Out of Stock</span>
                  </div>
                )}
              </Link>

              {/* Content */}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <Link
                  href={`/products/${item.slug}`}
                  className="text-body-sm hover:text-primary line-clamp-2 font-medium transition-colors"
                >
                  {item.name}
                </Link>

                <div className="flex items-baseline gap-2">
                  <span className="text-body-md font-bold">{formatPrice(item.price)}</span>
                  {item.compareAtPrice && (
                    <span className="text-caption text-muted-foreground line-through">
                      {formatPrice(item.compareAtPrice)}
                    </span>
                  )}
                </div>

                <div className="mt-auto flex gap-2 pt-2">
                  <PremiumButton
                    variant="primary"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handleMoveToCart(item)}
                    disabled={item.stock <= 0}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Add to Cart
                  </PremiumButton>
                  <button
                    onClick={() => remove(item.productId)}
                    className="border-border text-muted-foreground hover:border-destructive hover:text-destructive flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
