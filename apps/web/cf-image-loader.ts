import type { ImageLoaderProps } from 'next/image';

/**
 * Cloudflare Image Resizing loader for Next.js <Image>.
 *
 * In production, images are served through Cloudflare CDN which supports
 * on-the-fly resizing via URL parameters:
 *   https://example.com/api/images/products/abc.jpg?w=400&f=auto&q=85
 *
 * Cloudflare fetches the original from R2, resizes at the edge, converts
 * format (WebP/AVIF) based on browser Accept header, and caches the result.
 *
 * In development, images are served as-is (no CDN).
 */
export default function cfImageLoader({ src, width, quality }: ImageLoaderProps) {
  // During build/SSR, src might be undefined
  if (!src) return '';

  // Hero images bypass the loader entirely (raw <img> with no transformation)
  // — identified by /hero/ path or explicit backgroundImage/mobileBackgroundImage.
  // Detect hero to avoid double-optimizing; product images get high-res treatment.
  const isHeroAsset = src.includes('/hero/') || src.includes('hero-') || src.includes('mobileBackground');
  const isProductAsset =
    src.includes('/api/images/products') ||
    src.includes('/products/') ||
    src.includes('/product/') ||
    src.includes('product-');

  // In development, serve raw (no CF resize) — but preserve requested width/quality for debugging
  if (process.env.NODE_ENV === 'development') {
    const params = new URLSearchParams();
    if (width) params.set('w', String(width));
    if (quality) params.set('q', String(quality));
    const qs = params.toString();
    return qs ? `${src}?${qs}` : src;
  }

  // Production: CF Image Resizing URL for non-hero images
  // Hero: return as-is (already handled via raw <img> — loader should not double-append)
  if (isHeroAsset) return src;

  // Product images: high-res, minimal compression for crisp catalog visibility
  // Other images: high quality but slightly more compressed for bandwidth
  // Ensure product assets never drop below 90 even if caller passes a lower quality
  let targetQuality: number;
  if (isProductAsset) {
    targetQuality = quality ? Math.max(quality, 90) : 92;
    if (targetQuality > 100) targetQuality = 100;
  } else {
    targetQuality = quality ?? 88;
  }
  const params = new URLSearchParams();
  if (width) params.set('w', String(width));
  params.set('f', 'auto'); // Format: auto (WebP/AVIF based on Accept header)
  params.set('q', String(targetQuality));
  // Hint Cloudflare to preserve detail on product thumbnails
  if (isProductAsset) params.set('sharpen', '1');
  return `${src}?${params.toString()}`;
}

/**
 * Append CF Image Resizing params to a URL for use in CSS background-image.
 *
 * CSS `background-image: url(...)` bypasses Next.js <Image>, so we manually
 * add the CF resize params to get the same optimization (WebP/AVIF, edge resize).
 *
 * Usage in components:
 *   style={{ backgroundImage: `url(${cfBackgroundUrl(src, 1920)})` }}
 */
export function cfBackgroundUrl(src: string, width = 1920, quality = 88): string {
  if (!src) return '';
  // Hero backgrounds are served as-is (no CF transform) — preserve original quality
  if (src.includes('/hero/')) return src;
  // In development, return as-is (no CF resize available)
  if (process.env.NODE_ENV === 'development') return src;
  // In production, append CF resize params
  const params = new URLSearchParams();
  params.set('w', String(width));
  params.set('f', 'auto');
  params.set('q', String(quality));
  return `${src}?${params.toString()}`;
}
