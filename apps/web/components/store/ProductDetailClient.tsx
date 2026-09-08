'use client';

import {
  Minus,
  Plus,
  ShoppingCart,
  Heart,
  Truck,
  Shield,
  RotateCcw,
  Star,
  GitCompare,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

import { ProductJsonLd } from '@/components/shared/ProductJsonLd';
import { SocialIcon } from '@/components/shared/SocialIcon';
import { RelatedProducts } from '@/components/store/RelatedProducts';
import { ReviewsSection } from '@/components/store/ReviewsSection';
import { Badge } from '@/components/ui/badge';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Separator } from '@/components/ui/separator';
import { useSupportConfig } from '@/hooks/useSupportConfig';
import { APP_URL } from '@/lib/constants';
import { trackViewContent } from '@/lib/tracking';
import { formatPrice, cn } from '@/lib/utils';
import { useCartStore } from '@/stores/useCartStore';
import { useCompareStore } from '@/stores/useCompareStore';
import { useRecentlyViewedStore } from '@/stores/useRecentlyViewedStore';
import { useWishlistStore } from '@/stores/useWishlistStore';

import type { Product } from '@/hooks/useProducts';

type ProductDetailClientProps = {
  product: Product;
};

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const t = useTranslations('compare');
  const tp = useTranslations('products');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { data: supportData } = useSupportConfig();
  const whatsapp = supportData?.data?.whatsapp;
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const activeVariants = (product.variants ?? []).filter((v) => v.isActive);

  // Sanitize the product description on the client only. DOMPurify's ESM build
  // exposes a bare factory (no `sanitize`) when there is no `window`, so it must
  // not run during SSR. SSR renders the raw description so hydration matches;
  // the sanitized version is applied in a client effect right after mount.
  const [descriptionHtml, setDescriptionHtml] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    import('dompurify').then((m) => {
      if (mounted) setDescriptionHtml(m.default.sanitize(product.description ?? ''));
    });
    return () => {
      mounted = false;
    };
  }, [product.description]);
  const sanitizedDescription = descriptionHtml ?? product.description ?? '';

  // Smart variant selection: parse variant types and track selections per type
  const variantTypes = product.variantTypes ?? [];
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  // Direct variant selection for products without variant types
  const [directVariantId, setDirectVariantId] = useState<string | null>(null);

  // Parse attributes from each variant to build a lookup map
  const variantAttributeMap = useMemo(() => {
    const map = new Map<string, string>(); // "Color=Red" -> variantId
    for (const v of activeVariants) {
      if (!v.attributes) continue;
      try {
        const attrs = JSON.parse(v.attributes) as Record<string, string>;
        const key = Object.entries(attrs)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, val]) => `${k}=${val}`)
          .join('|');
        map.set(key, v.id);
      } catch {
        /* ignore parse errors */
      }
    }
    return map;
  }, [activeVariants]);

  // Find the selected variant based on selected options
  const selectedVariantId = useMemo(() => {
    if (variantTypes.length === 0) {
      // Fallback: no variant types, use direct selection or first variant
      return directVariantId ?? activeVariants[0]?.id ?? null;
    }
    const key = Object.entries(selectedOptions)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('|');
    return variantAttributeMap.get(key) ?? null;
  }, [selectedOptions, variantTypes.length, variantAttributeMap, directVariantId, activeVariants]);

  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId) ?? null;
  const addItem = useCartStore((s) => s.addItem);
  const addCompare = useCompareStore((s) => s.add);
  const isComparing = useCompareStore((s) => s.isComparing(product.id));
  const addRecentlyViewed = useRecentlyViewedStore((s) => s.add);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const isWishlisted = useWishlistStore((s) => s.isWishlisted(product.id));

  // Track recently viewed
  useEffect(() => {
    addRecentlyViewed({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
    });
    // Marketing: Meta ViewContent + GA4 view_item
    trackViewContent({ id: product.id, name: product.name, price: product.price });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const handleAddToCompare = () => {
    const success = addCompare({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      image: product.image,
      brand: product.brandId ?? undefined,
      rating: product.rating,
      stock: product.stock,
      description: product.description ?? undefined,
    });
    if (!success) {
      toast.error(t('maxReached'));
    }
  };

  // Parse images (stored as JSON string)
  const images: string[] = (() => {
    try {
      if (product.images) {
        const parsed = JSON.parse(product.images);
        if (Array.isArray(parsed)) return [product.image, ...parsed];
      }
    } catch {
      // ignore parse error
    }
    return [product.image];
  })();

  const effectivePrice = selectedVariant?.price ?? product.price;
  const effectiveCompareAt = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const effectiveStock = selectedVariant ? selectedVariant.stock : product.stock;
  const inStock = effectiveStock > 0;
  const discount = effectiveCompareAt
    ? Math.round(((effectiveCompareAt - effectivePrice) / effectiveCompareAt) * 100)
    : 0;
  const savedAmount = effectiveCompareAt ? effectiveCompareAt - effectivePrice : 0;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name,
      price: effectivePrice,
      image: selectedVariant?.image ?? product.image,
      quantity,
      variantId: selectedVariant?.id,
    });
  };

  // Buy Now — add the selected item to the cart, then move straight to checkout.
  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/checkout');
  };

  // WhatsApp inquiry — prefilled in the current site language.
  const handleWhatsApp = () => {
    const phone = whatsapp?.phoneNumber?.replace(/[^0-9]/g, '') ?? '';
    if (!phone) return;
    const message = tc('whatsappMessage', {
      name: selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name,
      url:
        typeof window !== 'undefined'
          ? window.location.href
          : `${APP_URL}/products/${product.slug}`,
    });
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleOptionSelect = (typeName: string, optionName: string) => {
    setSelectedOptions((prev) => ({ ...prev, [typeName]: optionName }));
    setDirectVariantId(null); // Reset direct selection when using type-based selection
    setQuantity(1);
  };

  return (
    <div className="space-y-10">
      {/* Structured Data */}
      <ProductJsonLd
        name={product.name}
        description={product.description ?? ''}
        image={product.image}
        price={product.price}
        currency="BDT"
        availability={inStock ? 'InStock' : 'OutOfStock'}
        url={`${APP_URL}/products/${product.slug}`}
        brand={product.brandId ?? undefined}
        rating={product.rating}
        reviewCount={product.reviewCount}
      />

      {/* ── Product top section — square image matching catalog ── */}
      <div className="grid gap-6 sm:gap-8 lg:grid-cols-[440px_1fr] lg:gap-8 xl:grid-cols-[500px_1fr]">
        {/* Image gallery — square, same as catalog card */}
        <div className="space-y-3">
          {/* Main image — square + catalog gradient */}
          <div className="group/img from-muted/30 via-muted/50 to-muted/80 border-border relative aspect-square overflow-hidden rounded-2xl border bg-gradient-to-br shadow-sm transition-shadow hover:shadow-md sm:rounded-3xl">
            <Image
              src={images[selectedImage] ?? product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 460px, 500px"
              quality={92}
              className="object-cover transition-transform duration-500 group-hover/img:scale-[1.02]"
              priority
            />
            {discount > 0 && (
              <div className="absolute left-3 top-3 z-10">
                <span className="bg-destructive inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-bold text-white shadow-md">
                  -{discount}%
                </span>
              </div>
            )}
            {!inStock && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
                <span className="rounded-full bg-white/90 px-4 py-1.5 text-xs font-bold text-black shadow-lg">
                  {tc('outOfStock')}
                </span>
              </div>
            )}
            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                {selectedImage + 1} / {images.length}
              </div>
            )}
          </div>

          {/* Thumbnails — square, compact */}
          {images.length > 1 && (
            <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={cn(
                    'relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-all duration-200 sm:h-[76px] sm:w-[76px]',
                    selectedImage === i
                      ? 'border-primary ring-primary/20 scale-[1.02] shadow-sm ring-2'
                      : 'border-border/60 opacity-70 hover:border-primary/30 hover:opacity-100'
                  )}
                >
                  <Image
                    src={img}
                    alt={`${product.name} ${i + 1}`}
                    fill
                    sizes="76px"
                    quality={90}
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Product info — compact creative ── */}
        <div className="flex flex-col gap-4">
          {/* Breadcrumb */}
          <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[11px]">
            <Link href="/products" className="hover:text-primary shrink-0 transition-colors">
              Products
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground truncate font-medium">{product.name}</span>
          </div>

          {/* Name */}
          <div>
            <h1 className="text-foreground text-xl font-bold leading-tight sm:text-[22px]">{product.name}</h1>
            {product.shortDescription && (
              <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">{product.shortDescription}</p>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-3.5 w-3.5',
                    i < Math.floor(product.rating)
                      ? 'fill-warning text-warning'
                      : 'fill-muted text-muted'
                  )}
                />
              ))}
            </div>
            <span className="text-[13px] font-semibold">{(product.rating ?? 0).toFixed(1)}</span>
            <span className="text-muted-foreground text-xs">({product.reviewCount} reviews)</span>
            {inStock ? (
              <span className="bg-success/10 text-success ml-1 hidden items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-flex">
                <span className="bg-success h-1.5 w-1.5 animate-pulse rounded-full" /> In Stock
              </span>
            ) : (
              <span className="bg-destructive/10 text-destructive ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                Out of Stock
              </span>
            )}
          </div>

          {/* Price card — compact premium */}
          <div className="border-border/60 bg-card rounded-2xl border px-4 py-3 shadow-sm">
            <div className="flex items-baseline gap-2">
              <span className="text-foreground text-[22px] font-extrabold tracking-tight sm:text-2xl">
                {formatPrice(effectivePrice)}
              </span>
              {effectiveCompareAt && effectiveCompareAt > effectivePrice && (
                <>
                  <span className="text-muted-foreground text-xs line-through sm:text-[13px]">
                    {formatPrice(effectiveCompareAt)}
                  </span>
                  <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-bold">
                    -{Math.round(((effectiveCompareAt - effectivePrice) / effectiveCompareAt) * 100)}%
                  </span>
                </>
              )}
            </div>
            {effectiveCompareAt && effectiveCompareAt > effectivePrice && (
              <p className="text-primary mt-1 text-[11px] font-medium">
                You save {formatPrice(savedAmount)} • Free delivery over ৳5,000
              </p>
            )}
          </div>

          {/* Variant selector */}
          {variantTypes.length > 0 ? (
            <div className="space-y-3.5">
              {variantTypes.map((vt) => (
                <div key={vt.id} className="space-y-2">
                  <p className="text-foreground text-sm font-semibold">
                    {vt.name}
                    {selectedOptions[vt.name] && (
                      <span className="text-muted-foreground font-normal">: {selectedOptions[vt.name]}</span>
                    )}
                  </p>

                  {vt.type === 'color' ? (
                    <div className="flex flex-wrap gap-2">
                      {vt.options.map((opt) => {
                        const isSelected = selectedOptions[vt.name] === opt.name;
                        const isAvailable = activeVariants.some((v) => {
                          if (!v.attributes || v.stock <= 0) return false;
                          try {
                            const attrs = JSON.parse(v.attributes);
                            return attrs[vt.name] === opt.name;
                          } catch { return false; }
                        });
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => handleOptionSelect(vt.name, opt.name)}
                            className={cn(
                              'group relative h-9 w-9 rounded-full border-2 transition-all duration-200 sm:h-10 sm:w-10',
                              isSelected
                                ? 'border-foreground scale-110 shadow-lg'
                                : 'border-border hover:scale-105',
                              !isAvailable && 'cursor-not-allowed opacity-30'
                            )}
                            title={opt.name}
                          >
                            <div className="absolute inset-1 rounded-full" style={{ backgroundColor: opt.value || '#000' }} />
                            {isSelected && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-2.5 w-2.5 rounded-full bg-white shadow-sm sm:h-3 sm:w-3" />
                              </div>
                            )}
                            {!isAvailable && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-muted-foreground/50 h-[2px] w-full rotate-45" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {vt.options.map((opt) => {
                        const isSelected = selectedOptions[vt.name] === opt.name;
                        const isAvailable = activeVariants.some((v) => {
                          if (!v.attributes || v.stock <= 0) return false;
                          try {
                            const attrs = JSON.parse(v.attributes);
                            return attrs[vt.name] === opt.name;
                          } catch { return false; }
                        });
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => handleOptionSelect(vt.name, opt.name)}
                            className={cn(
                              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:py-2 sm:text-sm',
                              isSelected
                                ? 'border-foreground bg-foreground text-background shadow-md'
                                : 'border-border hover:border-foreground/40 hover:bg-muted/50',
                              !isAvailable && 'cursor-not-allowed line-through opacity-30'
                            )}
                          >
                            {opt.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : activeVariants.length > 0 ? (
            <div className="space-y-2">
              <p className="text-foreground text-sm font-semibold">
                Variant{selectedVariant ? <span className="text-muted-foreground font-normal">: {selectedVariant.name}</span> : ''}
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {activeVariants.map((v) => {
                  const vOut = v.stock <= 0;
                  const isActive = v.id === selectedVariantId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={vOut}
                      onClick={() => { setDirectVariantId(v.id); setQuantity(1); }}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-3.5 sm:py-2 sm:text-sm',
                        isActive
                          ? 'border-primary bg-primary/10 text-primary shadow-sm'
                          : 'border-border hover:border-primary/40 hover:bg-muted/50',
                        vOut && 'cursor-not-allowed opacity-30'
                      )}
                    >
                      {v.name}
                      {vOut && <span className="ml-1 text-[10px]">(Out)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <Separator className="bg-border/60" />

          {/* ── Actions — compact creative, perfectly aligned ── */}
          {inStock ? (
            <div className="space-y-2.5">
              {/* Primary row: quantity + cart + buy + wishlist/compare */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="border-border flex shrink-0 items-center rounded-xl border bg-background shadow-sm self-start">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="hover:bg-muted flex h-9 w-8 items-center justify-center rounded-l-xl transition-colors disabled:opacity-40"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="border-border flex h-9 w-9 items-center justify-center border-x text-sm font-bold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(effectiveStock, quantity + 1))}
                    className="hover:bg-muted flex h-9 w-8 items-center justify-center rounded-r-xl transition-colors disabled:opacity-40"
                    disabled={quantity >= effectiveStock}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex flex-1 gap-2">
                  <PremiumButton
                    variant="primary"
                    size="md"
                    className="flex-1 rounded-xl text-sm"
                    onClick={handleAddToCart}
                    leftIcon={<ShoppingCart className="h-4 w-4" />}
                  >
                    {tc('addToCart')}
                  </PremiumButton>

                  <PremiumButton
                    variant="gradient"
                    size="md"
                    className="flex-1 rounded-xl text-sm"
                    onClick={handleBuyNow}
                  >
                    {tc('buyNow')}
                  </PremiumButton>
                </div>

                <div className="hidden items-center gap-1.5 sm:flex">
                  <button
                    onClick={() =>
                      toggleWishlist({
                        productId: product.id,
                        slug: product.slug,
                        name: product.name,
                        price: product.price,
                        image: product.image,
                        stock: product.stock,
                      })
                    }
                    aria-label="Wishlist"
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition-all hover:scale-105',
                      isWishlisted
                        ? 'bg-destructive/10 border-destructive/20 text-destructive'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary'
                    )}
                  >
                    <Heart className={cn('h-4 w-4', isWishlisted && 'fill-destructive')} />
                  </button>
                  <button
                    onClick={handleAddToCompare}
                    aria-label="Compare"
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition-all hover:scale-105',
                      isComparing
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary'
                    )}
                  >
                    <GitCompare className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Mobile wishlist/compare */}
              <div className="flex items-center gap-2 sm:hidden">
                <button
                  onClick={() =>
                    toggleWishlist({
                      productId: product.id,
                      slug: product.slug,
                      name: product.name,
                      price: product.price,
                      image: product.image,
                      stock: product.stock,
                    })
                  }
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-colors',
                    isWishlisted
                      ? 'border-destructive/20 bg-destructive/10 text-destructive'
                      : 'border-border text-muted-foreground'
                  )}
                >
                  <Heart className={cn('h-3.5 w-3.5', isWishlisted && 'fill-destructive')} /> Wishlist
                </button>
                <button
                  onClick={handleAddToCompare}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-colors',
                    isComparing ? 'border-primary/20 bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                  )}
                >
                  <GitCompare className="h-3.5 w-3.5" /> Compare
                </button>
              </div>

              {/* WhatsApp — compact */}
              {whatsapp?.enabled && whatsapp?.phoneNumber && (
                <button
                  onClick={handleWhatsApp}
                  className="border-border hover:bg-muted flex w-full items-center justify-center gap-2 rounded-xl border bg-emerald-500/5 py-2.5 text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:hover:bg-emerald-950/20"
                >
                  <SocialIcon platform="whatsapp" className="h-4 w-4" />
                  {tc('chatOnWhatsApp')}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="bg-muted text-muted-foreground flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold">
                <span className="bg-destructive h-2 w-2 rounded-full" /> {tc('outOfStock')}
              </div>
              {whatsapp?.enabled && whatsapp?.phoneNumber && (
                <button
                  onClick={handleWhatsApp}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-2.5 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                >
                  <SocialIcon platform="whatsapp" className="h-4 w-4" />
                  {tc('chatOnWhatsApp')}
                </button>
              )}
            </div>
          )}

          <Separator className="bg-border/60" />

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { icon: Truck, title: locale === 'bn' ? 'ফ্রি ডেলিভারি' : 'Free Delivery', sub: locale === 'bn' ? '৳৫০০০+' : '৳5,000+' },
              { icon: Shield, title: locale === 'bn' ? 'ওয়ারেন্টি' : 'Warranty', sub: locale === 'bn' ? '১ বছর' : '1 Year' },
              { icon: RotateCcw, title: locale === 'bn' ? 'রিটার্ন' : 'Returns', sub: locale === 'bn' ? '৭ দিন' : '7 Days' },
            ].map(({ icon: Icon, title, sub }) => (
              <div
                key={title}
                className="border-border/60 bg-muted/30 flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition-colors hover:bg-muted/60 sm:gap-1.5 sm:p-3"
              >
                <Icon className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
                <p className="text-foreground text-[11px] font-semibold leading-tight sm:text-xs">{title}</p>
                <p className="text-muted-foreground text-[10px]">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Description ── */}
      {product.description && (
        <div className="space-y-4">
          <h2 className="text-heading-md font-semibold">Product Description</h2>
          <div
            className="prose prose-sm text-muted-foreground dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
          />
        </div>
      )}

      {/* ── Reviews ── */}
      <ReviewsSection productId={product.id} />

      {/* ── Related products ── */}
      <RelatedProducts slug={product.slug} />
    </div>
  );
}
