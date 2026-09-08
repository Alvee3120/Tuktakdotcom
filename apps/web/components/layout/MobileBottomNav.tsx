'use client';

import { Heart, House, LayoutGrid, ShoppingCart, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';

import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { cn, formatPrice } from '@/lib/utils';
import { useCartCount, useCartStore } from '@/stores/useCartStore';
import { useUIStore } from '@/stores/useUIStore';
import { useWishlistCount } from '@/stores/useWishlistStore';

/** Hydration-safe cart total price */
function useCartTotal(): number {
  return useSyncExternalStore(
    useCartStore.subscribe,
    () => useCartStore.getState().totalPrice(),
    () => 0
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const cartCount = useCartCount();
  const cartTotal = useCartTotal();
  const wishlistCount = useWishlistCount();
  const openCart = useUIStore((s) => s.openCart);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '#cart') return false;
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-0 mb-0">
        <div className="bg-background/90 border-border/60 flex items-center justify-around border-t px-1 py-2 backdrop-blur-xl">
          {/* Home */}
          <Link
            href="/"
            className="relative flex flex-col items-center gap-0.5 px-2 py-1 transition-colors"
          >
            <House
              className={cn('h-5 w-5', isActive('/') ? 'text-primary' : 'text-muted-foreground')}
            />
            <span
              className={cn(
                'text-[10px] font-medium',
                isActive('/') ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              Home
            </span>
          </Link>

          {/* Shop */}
          <Link
            href="/products"
            className="relative flex flex-col items-center gap-0.5 px-2 py-1 transition-colors"
          >
            <LayoutGrid
              className={cn(
                'h-5 w-5',
                isActive('/products') ? 'text-primary' : 'text-muted-foreground'
              )}
            />
            <span
              className={cn(
                'text-[10px] font-medium',
                isActive('/products') ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              Shop
            </span>
          </Link>

          {/* Wishlist */}
          <Link
            href="/wishlist"
            className="relative flex flex-col items-center gap-0.5 px-2 py-1 transition-colors"
          >
            <div className="relative">
              <Heart
                className={cn(
                  'h-5 w-5',
                  isActive('/wishlist') ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              {wishlistCount > 0 && (
                <Badge className="bg-primary text-primary-foreground absolute -right-2 -top-1.5 flex h-4 w-4 min-w-0 items-center justify-center rounded-full p-0 text-[9px]">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </Badge>
              )}
            </div>
            <span
              className={cn(
                'text-[10px] font-medium',
                isActive('/wishlist') ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              Wishlist
            </span>
          </Link>

          {/* Cart — shows count + total price */}
          <button
            onClick={openCart}
            className="relative flex flex-col items-center gap-0.5 px-2 py-1 transition-colors"
          >
            <div className="relative">
              <ShoppingCart className="text-muted-foreground h-5 w-5" />
              {cartCount > 0 && (
                <Badge className="bg-primary text-primary-foreground absolute -right-2 -top-1.5 flex h-4 w-4 min-w-0 items-center justify-center rounded-full p-0 text-[9px]">
                  {cartCount > 99 ? '99+' : cartCount}
                </Badge>
              )}
            </div>
            {cartCount > 0 ? (
              <span className="text-primary text-[9px] font-semibold leading-tight">
                {formatPrice(cartTotal)}
              </span>
            ) : (
              <span className="text-muted-foreground text-[10px] font-medium">Cart</span>
            )}
          </button>

          {/* Account — shows avatar + name when logged in */}
          <Link
            href="/account"
            className="relative flex flex-col items-center gap-0.5 px-2 py-1 transition-colors"
          >
            {isAuthenticated && user?.image ? (
              <div className="border-primary/30 relative h-6 w-6 overflow-hidden rounded-full border-2">
                <Image
                  src={user.image}
                  alt={user.name}
                  fill
                  sizes="24px"
                  className="object-cover"
                />
              </div>
            ) : (
              <User
                className={cn(
                  'h-5 w-5',
                  isActive('/account') ? 'text-primary' : 'text-muted-foreground'
                )}
              />
            )}
            {isAuthenticated && user?.name ? (
              <span
                className={cn(
                  'max-w-[48px] truncate text-[9px] font-semibold leading-tight',
                  isActive('/account') ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {user.name.split(' ')[0]}
              </span>
            ) : (
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isActive('/account') ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                Account
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
