'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { useCompareStore } from '@/stores/useCompareStore';

export function CompareBar() {
  const t = useTranslations('compare');
  const items = useCompareStore((s) => s.items);
  const remove = useCompareStore((s) => s.remove);
  const count = items.length;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-fit -translate-x-1/2 lg:bottom-4"
        >
          <div className="border-border bg-card/95 flex items-center gap-2 rounded-2xl border px-3 py-2.5 shadow-2xl backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-3">
            {/* Product thumbnails */}
            <div className="flex items-center -space-x-2">
              {items.map((item) => (
                <div key={item.id} className="group relative">
                  <div className="border-card bg-muted relative h-10 w-10 overflow-hidden rounded-full border-2">
                    <Image
                      src={item.image ?? '/placeholder-product.svg'}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <button
                    onClick={() => remove(item.id)}
                    className="bg-destructive absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Info */}
            <div className="flex flex-col">
              <span className="text-body-xs font-medium">{t('barTitle')}</span>
              <span className="text-muted-foreground text-[11px]">{t('barCount', { count })}</span>
            </div>

            {/* View comparison link */}
            <Link
              href="/compare"
              className="bg-primary text-body-xs text-primary-foreground flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-opacity hover:opacity-90"
            >
              {t('viewComparison')}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
