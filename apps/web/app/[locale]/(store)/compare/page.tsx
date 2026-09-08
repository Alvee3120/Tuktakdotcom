'use client';

import { X, Star, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Container, Section } from '@/components/shared/Layout';
import { Badge } from '@/components/ui/badge';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/stores/useCartStore';
import { useCompareStore } from '@/stores/useCompareStore';

export default function ComparePage() {
  const t = useTranslations('compare');
  const tCommon = useTranslations('common');
  const items = useCompareStore((s) => s.items);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const addItem = useCartStore((s) => s.addItem);

  if (items.length === 0) {
    return (
      <Section>
        <Container>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
              <ShoppingCart className="text-muted-foreground/40 h-8 w-8" />
            </div>
            <h1 className="text-heading-lg mt-4 font-bold">{t('empty')}</h1>
            <p className="text-body-md text-muted-foreground mt-2">{t('emptyDesc')}</p>
            <Link href="/products">
              <PremiumButton variant="primary" className="mt-6">
                {tCommon('addToCart')}
              </PremiumButton>
            </Link>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section>
      <Container>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-heading-xl font-bold">{t('title')}</h1>
          <button
            onClick={clear}
            className="text-body-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            {t('clear')}
          </button>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr>
                <th className="text-body-sm text-muted-foreground w-40 p-4 text-left font-medium" />
                {items.map((item) => (
                  <th key={item.id} className="p-4 text-center">
                    <div className="relative">
                      <button
                        onClick={() => remove(item.id)}
                        className="bg-muted hover:bg-destructive/10 absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="bg-muted relative mx-auto h-32 w-32 overflow-hidden rounded-lg">
                        <Image
                          src={item.image ?? '/placeholder-product.svg'}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <Link
                        href={`/products/${item.slug}`}
                        className="text-body-sm hover:text-primary mt-3 line-clamp-2 block font-medium transition-colors"
                      >
                        {item.name}
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Price */}
              <tr className="border-border border-t">
                <td className="text-body-sm text-muted-foreground p-4 font-medium">{t('price')}</td>
                {items.map((item) => (
                  <td key={item.id} className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-body-md font-bold">{formatPrice(item.price)}</span>
                      {item.compareAtPrice && item.compareAtPrice > item.price && (
                        <span className="text-body-xs text-muted-foreground line-through">
                          {formatPrice(item.compareAtPrice)}
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Brand */}
              <tr className="border-border bg-muted/30 border-t">
                <td className="text-body-sm text-muted-foreground p-4 font-medium">{t('brand')}</td>
                {items.map((item) => (
                  <td key={item.id} className="text-body-sm p-4 text-center">
                    {item.brand ?? '—'}
                  </td>
                ))}
              </tr>

              {/* Rating */}
              <tr className="border-border border-t">
                <td className="text-body-sm text-muted-foreground p-4 font-medium">
                  {t('rating')}
                </td>
                {items.map((item) => (
                  <td key={item.id} className="p-4 text-center">
                    {item.rating ? (
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-body-sm font-medium">{item.rating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <span className="text-body-sm text-muted-foreground">—</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Stock */}
              <tr className="border-border bg-muted/30 border-t">
                <td className="text-body-sm text-muted-foreground p-4 font-medium">{t('stock')}</td>
                {items.map((item) => (
                  <td key={item.id} className="p-4 text-center">
                    <Badge
                      variant={item.stock > 0 ? 'default' : 'destructive'}
                      className="text-[10px]"
                    >
                      {item.stock > 0 ? tCommon('inStock') : tCommon('outOfStock')}
                    </Badge>
                  </td>
                ))}
              </tr>

              {/* Add to Cart */}
              <tr className="border-border border-t">
                <td className="p-4" />
                {items.map((item) => (
                  <td key={item.id} className="p-4 text-center">
                    <PremiumButton
                      variant="primary"
                      size="sm"
                      disabled={item.stock === 0}
                      onClick={() =>
                        addItem({
                          productId: item.id,
                          name: item.name,
                          price: item.price,
                          image: item.image,
                          quantity: 1,
                        })
                      }
                    >
                      {t('addToCart')}
                    </PremiumButton>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Container>
    </Section>
  );
}
