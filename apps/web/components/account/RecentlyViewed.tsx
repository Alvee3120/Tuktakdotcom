'use client';

import { motion } from 'framer-motion';
import { History, Package } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { formatPrice } from '@/lib/utils';
import { useRecentlyViewedStore } from '@/stores/useRecentlyViewedStore';

export function RecentlyViewed() {
  const items = useRecentlyViewedStore((s) => s.items).slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="border-border bg-card space-y-3 rounded-2xl border p-4 sm:p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-sm font-bold">Recently Viewed</h2>
        <History className="text-muted-foreground/40 h-4 w-4" />
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/products/${item.slug}`}
              className="border-border bg-background hover:border-primary/20 group relative overflow-hidden rounded-xl border transition-all duration-200 hover:shadow-sm"
            >
              <div className="bg-muted aspect-square overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="text-muted-foreground/20 h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-foreground truncate text-[11px] font-semibold">{item.name}</p>
                <p className="text-primary mt-0.5 text-[11px] font-bold">
                  {formatPrice(item.price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-xl">
            <History className="text-muted-foreground/30 h-4 w-4" />
          </div>
          <p className="text-muted-foreground mt-2 text-xs">No recently viewed items</p>
        </div>
      )}
    </motion.div>
  );
}
