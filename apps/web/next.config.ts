import createNextIntlPlugin from 'next-intl/plugin';

import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  // Cloudflare Image Resizing via custom loader.
  // <Image> components generate srcset with multiple widths.
  // Cloudflare CDN resizes on-the-fly at the edge, converts to WebP/AVIF
  // based on browser Accept header, and caches the result.
  // Quality preserved at 85% — no visible quality loss.
  images: {
    loader: 'custom',
    loaderFile: './cf-image-loader.ts',
    formats: ['image/avif', 'image/webp'],
    // Must list every value passed to <Image quality={...}>; Next warns (and
    // refuses to optimize) for qualities missing from this list.
    qualities: [75, 88, 90, 92],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.tuktakdot.com',
      },
      {
        protocol: 'https',
        hostname: '*.tuktakdot.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.tuktakdot.com',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'fastly.picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
  },
  // Proxy /api/* requests to the Cloudflare Worker backend
  // This ensures cookies are same-origin (no cross-origin issues with auth)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
