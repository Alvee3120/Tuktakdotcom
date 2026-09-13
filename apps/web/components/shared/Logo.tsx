'use client';

import Image from 'next/image';
import Link from 'next/link';

import { useTheme } from '@/components/providers/ThemeProviderWrapper';
import { cn } from '@/lib/utils';

type LogoProps = {
  /** Show text fallback next to logo */
  showText?: boolean;
  /** Link href — set to empty string to render as a div (block logo, no link) */
  href?: string;
  /** Size variant — controls the rendered box dimensions */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Override logo image for light mode (admin branding). Empty = default. */
  lightSrc?: string;
  /** Override logo image for dark mode (admin branding). Empty = default. */
  darkSrc?: string;
  /**
   * Render as if on a dark surface: uses the dark-mode artwork + default
   * regardless of the active theme. Needed for the storefront header, whose bar
   * is near-black in BOTH themes.
   */
  onDark?: boolean;
};

/**
 * Fixed box dimensions per size. The logo is rendered inside this box via
 * `next/image` `fill` + `object-contain`, so it is ALWAYS pinned to its
 * intended size and never to the source image's intrinsic dimensions.
 *
 * NOTE: the default logo assets are 1698x926 PNGs. The previous implementation
 * passed `width`/`height` props together with `className="object-contain h-auto
 * w-auto"`. Tailwind's `w-auto` compiles to `width: auto`, which (as author
 * CSS) outranks the `width`/`height` HTML attributes — those attributes are
 * only presentational hints at user-agent priority. With CSS `width: auto` and
 * a loaded image resource, the browser falls back to the image's intrinsic
 * width (1698px) and the header exploded on first paint. `h-auto` had the same
 * effect on height.
 */
const sizeMap: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'relative w-[110px] h-[60px] sm:w-[140px] sm:h-[76px]',
  md: 'relative w-[160px] h-[87px] sm:w-[200px] sm:h-[109px]',
  lg: 'relative w-[200px] h-[109px] sm:w-[260px] sm:h-[142px]',
};

const sizesMap: Record<'sm' | 'md' | 'lg', string> = {
  sm: '(max-width: 640px) 110px, 140px',
  md: '(max-width: 640px) 160px, 200px',
  lg: '(max-width: 640px) 200px, 260px',
};

export function Logo({
  showText = false,
  href = '/',
  size = 'sm',
  className,
  lightSrc,
  darkSrc,
  onDark = false,
}: LogoProps) {
  // Reuse the app-wide theme from ThemeProviderWrapper instead of re-implementing
  // theme detection with `useState('light')` + requestAnimationFrame + a
  // MutationObserver. The root layout applies the `dark` class before first
  // paint (beforeInteractive script), so the shared provider resolves the
  // correct theme on the first client render. The previous self-detection
  // always started on `light` and only corrected itself in a rAF callback,
  // flipping the logo src AFTER first paint — combined with the old `w-auto
  // h-auto` sizing this produced the "header too big on first render, then
  // shrinks as the logo src/size flipped" flicker (worst when an admin
  // uploaded light/dark logos of different dimensions).
  const { theme } = useTheme();

  // `onDark` pins the choice to the dark-mode artwork regardless of the active
  // theme (the storefront header bar is near-black in both themes).
  const preferDark = onDark || theme === 'dark';
  const defaultSrc = preferDark ? '/logo/logo_dark_mode.png' : '/logo/logo_light_mode.png';
  const override = preferDark ? darkSrc : lightSrc;
  // Fall back across modes if only one custom logo is provided, then to defaults.
  const logoUrl = override || lightSrc || darkSrc || defaultSrc;

  const content = (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className={sizeMap[size]}>
        {/* `fill` locks the image to the fixed box above (set via the parent's
            width/height), and `object-contain` preserves the logo aspect ratio
            without distortion. Because the box size is independent of which
            `src` is loaded, swapping between light/dark or admin-uploaded
            logos never reflows the header. */}
        <Image
          src={logoUrl}
          alt="Tuktak"
          fill
          sizes={sizesMap[size]}
          className="object-contain"
          priority
        />
      </div>
      {showText && (
        <span className="text-foreground text-xl font-bold tracking-tight">
          Tuk<span className="text-primary">tak</span>
        </span>
      )}
    </div>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}
