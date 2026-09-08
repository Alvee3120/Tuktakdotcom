'use client';

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PremiumButton } from '@/components/ui/PremiumButton';
import { cn } from '@/lib/utils';

export type HeroSlide = {
  id: string;
  title: string;
  titleBn: string | null;
  subtitle: string | null;
  subtitleBn: string | null;
  description: string | null;
  descriptionBn: string | null;
  image: string;
  backgroundImage: string | null;
  mobileBackgroundImage: string | null;
  ctaText: string | null;
  ctaTextBn: string | null;
  ctaLink: string | null;
  ctaSecondaryText: string | null;
  ctaSecondaryTextBn: string | null;
  ctaSecondaryLink: string | null;
  overlayColor: string;
  textAlign: string;
  textColor: string;
  badge: string | null;
  badgeBn: string | null;
  badgeVariant: string;
  animation: string;
  animationDuration: number | null;
  titleFontSize: string;
  subtitleFontSize: string;
  productId: string | null;
  showTrustBadges: boolean;
  showTitle: boolean;
  showSubtitle: boolean;
  sortOrder: number;
  isActive: boolean;
};

const FALLBACK_SLIDE: HeroSlide = {
  id: 'fallback',
  title: 'Premium Electronics',
  titleBn: null,
  subtitle: null,
  subtitleBn: null,
  description: null,
  descriptionBn: null,
  image: '',
  backgroundImage: null,
  mobileBackgroundImage: null,
  ctaText: 'Shop Now',
  ctaTextBn: null,
  ctaLink: '/products',
  ctaSecondaryText: null,
  ctaSecondaryTextBn: null,
  ctaSecondaryLink: null,
  overlayColor: '',
  textAlign: 'left',
  textColor: '',
  badge: null,
  badgeBn: null,
  badgeVariant: 'default',
  animation: 'fade',
  animationDuration: 700,
  titleFontSize: 'lg',
  subtitleFontSize: 'md',
  productId: null,
  showTrustBadges: false,
  showTitle: true,
  showSubtitle: true,
  sortOrder: 0,
  isActive: true,
};

const TITLE_SIZE_MAP = {
  sm: 'text-lg sm:text-xl lg:text-2xl',
  md: 'text-xl sm:text-2xl lg:text-3xl',
  lg: 'text-2xl sm:text-3xl lg:text-4xl',
  xl: 'text-3xl sm:text-4xl lg:text-5xl',
} as const;

const SUBTITLE_SIZE_MAP = {
  sm: 'text-xs sm:text-xs lg:text-sm',
  md: 'text-xs sm:text-sm lg:text-base',
  lg: 'text-sm sm:text-sm lg:text-base',
  xl: 'text-sm sm:text-base lg:text-lg',
} as const;

const BADGE_VARIANT_MAP: Record<string, string> = {
  default: 'border-primary/30 bg-primary/15 text-primary',
  secondary: 'border-border bg-muted text-muted-foreground',
  destructive: 'border-destructive/30 bg-destructive/15 text-destructive',
  outline: 'border-foreground/30 bg-foreground/5 text-foreground',
};

const EASING = [0.22, 1, 0.36, 1] as const;

// Full-bleed offsets — 100% ensures directional slides fully cover (96px was invisible)
const OFFSET_Y = 64;

function getSlideVariants(animation: string) {
  switch (animation) {
    case 'top-to-bottom':
      // Pure slide, no fade — slides push one-by-one from top
      return {
        enter: { y: '-100%' },
        center: { y: '0%' },
        exit: { y: '100%' },
      };
    case 'bottom-to-top':
      return {
        enter: { y: '100%' },
        center: { y: '0%' },
        exit: { y: '-100%' },
      };
    case 'left-to-right':
      return {
        enter: { x: '-100%' },
        center: { x: '0%' },
        exit: { x: '100%' },
      };
    case 'right-to-left':
      return {
        enter: { x: '100%' },
        center: { x: '0%' },
        exit: { x: '-100%' },
      };
    case 'scale-up':
      return {
        enter: { scale: 0.88, opacity: 0 },
        center: { scale: 1, opacity: 1 },
        exit: { scale: 1.06, opacity: 0 },
      };
    case 'zoom-out':
      return {
        enter: { scale: 1.18, opacity: 0 },
        center: { scale: 1, opacity: 1 },
        exit: { scale: 0.92, opacity: 0 },
      };
    case 'parallax':
      return {
        enter: { y: -OFFSET_Y * 0.6, opacity: 0 },
        center: { y: 0, opacity: 1 },
        exit: { y: OFFSET_Y * 0.6, opacity: 0 },
      };
    case 'fade':
    default:
      return {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      };
  }
}

function HeroBackground({ slide }: { slide: HeroSlide }) {
  const { backgroundImage, mobileBackgroundImage } = slide;
  if (!backgroundImage && !mobileBackgroundImage) return null;

  // Single source: serve the original uploaded asset directly (no transformation).
  if (backgroundImage && !mobileBackgroundImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={backgroundImage}
        alt=""
        fetchPriority="high"
        loading="eager"
        decoding="async"
        width={1920}
        height={1080}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  if (mobileBackgroundImage && !backgroundImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={mobileBackgroundImage}
        alt=""
        fetchPriority="high"
        loading="eager"
        decoding="async"
        width={750}
        height={1000}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }

  // Both desktop + mobile assets: <picture> serves exactly one (no duplicate download).
  // Each asset is served as-is — no transformation, no resizing, no format conversion.
  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={mobileBackgroundImage!} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={backgroundImage!}
        alt=""
        fetchPriority="high"
        loading="eager"
        decoding="async"
        width={1920}
        height={1080}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </picture>
  );
}

function getSlideOverlay(slide: HeroSlide) {
  // Always apply overlay color when set — whether backgroundImage exists or not
  if (slide.overlayColor) {
    return <div className={cn('absolute inset-0 bg-gradient-to-r', slide.overlayColor)} />;
  }
  return null;
}

function getSlideDecorations() {
  return (
    <>
      <div className="bg-primary/20 dark:bg-primary/25 pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl" />
      <div className="bg-primary/15 dark:bg-primary/20 pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--primary) 25%, transparent) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
      />
    </>
  );
}

function ParallaxHero({
  slide,
  isBn,
  isFull,
  duration,
}: {
  slide: HeroSlide;
  isBn: boolean;
  isFull: boolean;
  duration: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const RANGE = shouldReduceMotion ? 0 : 15;
  // Promote animated layers to their own compositor layers so the parallax
  // transforms never touch the main thread. When reduced motion is on we skip
  // the handlers entirely (RANGE is 0) so getBoundingClientRect never runs.
  const skipParallax = shouldReduceMotion === true || RANGE === 0;
  const bgX = useTransform(mouseX, [-1, 1], [-RANGE, RANGE]);
  const bgY = useTransform(mouseY, [-1, 1], [-RANGE, RANGE]);
  const contentX = useTransform(mouseX, [-1, 1], [RANGE, -RANGE]);
  const contentY = useTransform(mouseY, [-1, 1], [RANGE, -RANGE]);

  const rectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);

  // Invalidate cached rect when the slide changes (different dimensions/position)
  useEffect(() => {
    rectRef.current = null;
  }, [slide.id]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (skipParallax) return;
      // Cache the bounding rect — only re-read on bounding-box change, not per-event.
      // left/top don't change as the mouse moves within the element.
      if (!rectRef.current) {
        rectRef.current = e.currentTarget.getBoundingClientRect();
      }
      const { left, top, width, height } = rectRef.current;
      if (width === 0 || height === 0) return;
      const x = ((e.clientX - left) / width) * 2 - 1;
      const y = ((e.clientY - top) / height) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    },
    [mouseX, mouseY, skipParallax]
  );

  const handleMouseLeave = useCallback(() => {
    if (skipParallax) return;
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY, skipParallax]);

  return (
    <motion.div
      key={slide.id}
      initial={{ y: '-100%', opacity: 0 }}
      animate={{ y: '0%', opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ duration: duration / 1000, ease: EASING }}
      style={{ willChange: 'transform, opacity' }}
      className={cn(
        'from-primary/5 via-background to-primary/10 dark:from-primary/20 dark:via-card dark:to-primary/10 absolute inset-0 bg-gradient-to-br',
        isFull && 'flex items-center'
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <HeroBackground slide={slide} />

      {getSlideOverlay(slide)}
      {!slide.backgroundImage && !slide.mobileBackgroundImage && getSlideDecorations()}

      <motion.div
        style={{ x: bgX, y: bgY, willChange: 'transform' }}
        className="bg-primary/15 dark:bg-primary/20 pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full blur-3xl"
      />

      <motion.div
        style={{ x: contentX, y: contentY, willChange: 'transform' }}
        className={cn(
          'relative z-10 grid w-full gap-3 px-2 py-4 sm:px-3 sm:py-5 lg:grid-cols-2 lg:gap-5 lg:px-4 lg:py-5',
          isFull && 'mx-auto max-w-screen-2xl px-2 sm:px-3 lg:px-4'
        )}
      >
        <SlideContent slide={slide} isBn={isBn} />
      </motion.div>
    </motion.div>
  );
}

function StandardHero({
  slide,
  isBn,
  isFull,
  duration,
}: {
  slide: HeroSlide;
  isBn: boolean;
  isFull: boolean;
  duration: number;
}) {
  const variants = useMemo(() => getSlideVariants(slide.animation), [slide.animation]);
  // Directional slides are pure translation (no opacity) so they feel like one slide pushes the next
  const isDirectional = ['top-to-bottom', 'bottom-to-top', 'left-to-right', 'right-to-left'].includes(
    slide.animation
  );

  return (
    <motion.div
      key={slide.id}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={
        isDirectional
          ? { duration: duration / 1000, ease: EASING }
          : { duration: duration / 1000, ease: EASING, opacity: { duration: duration / 1000 * 0.7, ease: 'easeOut' } }
      }
      style={{ willChange: 'transform, opacity' }}
      className={cn(
        'from-primary/5 via-background to-primary/10 dark:from-primary/20 dark:via-card dark:to-primary/10 absolute inset-0 bg-gradient-to-br',
        isFull && 'flex items-center'
      )}
    >
      {/* Background + overlay + content move together as one unit — even when only background image exists */}
      <HeroBackground slide={slide} />
      {getSlideOverlay(slide)}
      {!slide.backgroundImage && !slide.mobileBackgroundImage && getSlideDecorations()}

      <div
        className={cn(
          'relative z-10 grid w-full gap-3 px-2 py-4 sm:px-3 sm:py-5 lg:grid-cols-2 lg:gap-5 lg:px-4 lg:py-5',
          isFull && 'mx-auto max-w-screen-2xl px-2 sm:px-3 lg:px-4'
        )}
      >
        <SlideContent slide={slide} isBn={isBn} />
      </div>
    </motion.div>
  );
}

function SlideContent({ slide, isBn }: { slide: HeroSlide; isBn: boolean }) {
  const text = useMemo(
    () => ({
      title: isBn && slide.titleBn ? slide.titleBn : slide.title,
      subtitle: isBn && slide.subtitleBn ? slide.subtitleBn : slide.subtitle,
      description: isBn && slide.descriptionBn ? slide.descriptionBn : slide.description,
      badge: isBn && slide.badgeBn ? slide.badgeBn : slide.badge,
      ctaText: isBn && slide.ctaTextBn ? slide.ctaTextBn : slide.ctaText,
      ctaSecondaryText:
        isBn && slide.ctaSecondaryTextBn ? slide.ctaSecondaryTextBn : slide.ctaSecondaryText,
      showTitle: slide.showTitle ?? true,
      showSubtitle: slide.showSubtitle ?? true,
    }),
    [slide, isBn]
  );

  const textColor = slide.textColor || undefined;
  const textAlign = (slide.textAlign || 'left') as 'left' | 'center' | 'right';
  const textAlignClass =
    textAlign === 'center'
      ? 'text-center items-center'
      : textAlign === 'right'
        ? 'text-right items-end'
        : 'text-left items-start';
  const badgeCls = BADGE_VARIANT_MAP[slide.badgeVariant] ?? BADGE_VARIANT_MAP.default;

  return (
    <>
      <div className={cn('flex h-full flex-col justify-center gap-2 sm:gap-3', textAlignClass)}>
        {text.badge && (
          <span
            className={cn(
              'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-[11px]',
              badgeCls
            )}
          >
            <span className="relative flex h-1 w-1 sm:h-1.5 sm:w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
              <span className="relative inline-flex h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-current" />
            </span>
            {text.badge}
          </span>
        )}

        {text.showTitle && slide.title && (
          <h1
            style={textColor ? { color: textColor } : undefined}
            className={cn(
              'text-foreground font-bold leading-tight',
              TITLE_SIZE_MAP[slide.titleFontSize as keyof typeof TITLE_SIZE_MAP] ??
                TITLE_SIZE_MAP.lg
            )}
          >
            {text.title.split('\n').map((line, i, arr) => (
              <span
                key={i}
                className={cn(
                  'block uppercase',
                  i === arr.length - 1 && arr.length > 1 && 'text-gradient'
                )}
              >
                {line}
              </span>
            ))}
          </h1>
        )}

        {text.showSubtitle && text.subtitle && (
          <p
            style={textColor ? { color: textColor, opacity: 0.8 } : undefined}
            className={cn(
              'text-muted-foreground max-w-md',
              SUBTITLE_SIZE_MAP[slide.subtitleFontSize as keyof typeof SUBTITLE_SIZE_MAP] ??
                SUBTITLE_SIZE_MAP.md
            )}
          >
            {text.subtitle}
          </p>
        )}

        {text.description && (
          <p
            style={textColor ? { color: textColor, opacity: 0.7 } : undefined}
            className="text-muted-foreground max-w-md text-sm"
          >
            {text.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {text.ctaText && (
            <Link href={slide.ctaLink ?? '/products'}>
              <PremiumButton size="md" variant="gradient">
                {text.ctaText}
              </PremiumButton>
            </Link>
          )}
          {text.ctaSecondaryText && (
            <Link href={slide.ctaSecondaryLink ?? '/products'}>
              <PremiumButton size="md" variant="outline">
                {text.ctaSecondaryText}
              </PremiumButton>
            </Link>
          )}
        </div>
      </div>

      {slide.image && (
        <div className="relative hidden items-end justify-center lg:flex">
          <div className="from-primary/20 to-primary/10 pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr blur-2xl" />
          <div className="relative aspect-[4/3] w-full max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.image}
              alt={text.title}
              loading="lazy"
              decoding="async"
              width={800}
              height={600}
              className="absolute inset-0 h-full w-full object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}

export function HeroSection({
  slides = [],
  variant = 'boxed',
}: {
  slides?: HeroSlide[];
  variant?: 'boxed' | 'full';
}) {
  const locale = useLocale();
  const isBn = locale === 'bn';
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const isFull = variant === 'full';

  const displaySlides = useMemo(() => (slides.length > 0 ? slides : [FALLBACK_SLIDE]), [slides]);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % displaySlides.length);
  }, [displaySlides.length]);

  const goTo = useCallback((idx: number) => {
    setCurrent(idx);
  }, []);

  const goToPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + displaySlides.length) % displaySlides.length);
  }, [displaySlides.length]);

  useEffect(() => {
    if (displaySlides.length <= 1 || paused) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [displaySlides.length, next, paused]);

  const slide = displaySlides[current];
  const duration = slide.animationDuration ?? 700;
  const isDirectional = ['top-to-bottom', 'bottom-to-top', 'left-to-right', 'right-to-left'].includes(slide.animation);

  return (
    <section className={isFull ? 'w-full' : 'mx-auto max-w-screen-2xl px-2 py-3 sm:px-3 sm:py-5 lg:px-4 lg:py-5'}>
      <div
        className={cn(
          'group/hero relative overflow-hidden',
          isFull
            ? 'aspect-[16/9] sm:aspect-[21/9] lg:aspect-[5/2] border-primary/10 border-b'
            : 'aspect-[16/9] sm:aspect-[21/9] lg:aspect-[5/2] border-primary/10 rounded-2xl border sm:rounded-3xl'
        )}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence mode={isDirectional ? 'popLayout' : 'wait'} initial={false}>
          {slide.animation === 'parallax' ? (
            <ParallaxHero
              key={slide.id}
              slide={slide}
              isBn={isBn}
              isFull={isFull}
              duration={duration}
            />
          ) : (
            <StandardHero
              key={slide.id}
              slide={slide}
              isBn={isBn}
              isFull={isFull}
              duration={duration}
            />
          )}
        </AnimatePresence>

        {displaySlides.length > 1 && (
          <>
            <div className="absolute bottom-3 left-4 z-20 flex items-center gap-1.5 sm:left-8 lg:left-12">
              {displaySlides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={cn(
                    'h-1 rounded-full transition-all duration-300 sm:h-1.5',
                    i === current ? 'bg-primary w-5 sm:w-7' : 'bg-primary/25 hover:bg-primary/50 w-1 sm:w-1.5'
                  )}
                />
              ))}
            </div>

            <div className="absolute bottom-3 right-4 z-20 hidden items-center gap-1.5 opacity-0 transition-opacity duration-300 group-hover/hero:opacity-100 lg:flex">
              <button
                onClick={goToPrev}
                aria-label="Previous slide"
                className="border-border/60 bg-background/70 text-foreground hover:bg-primary flex h-7 w-7 items-center justify-center rounded-full border backdrop-blur-md transition-colors hover:text-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={next}
                aria-label="Next slide"
                className="border-border/60 bg-background/70 text-foreground hover:bg-primary flex h-7 w-7 items-center justify-center rounded-full border backdrop-blur-md transition-colors hover:text-white"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}

        {displaySlides.length > 1 && (
          <div className="absolute bottom-3 right-4 z-20 flex items-center gap-1.5 lg:hidden">
            <span className="text-primary text-[11px] font-bold tabular-nums">
              {String(current + 1).padStart(2, '0')}
            </span>
            <span className="bg-primary/30 h-px w-4" />
            <span className="text-muted-foreground text-[11px] tabular-nums">
              {String(displaySlides.length).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
