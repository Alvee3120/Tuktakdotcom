'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Image-only hero slider.
 *
 * Contained, rounded banner inside the storefront container gutters, rendered
 * below the site Header. There is deliberately no copy here — the slide
 * contributes only imagery.
 *
 * Image resolution (kept because existing slides store assets in different
 * columns): desktop prefers `backgroundImage`, mobile prefers
 * `mobileBackgroundImage`, and both fall back to the legacy `image` field.
 */
export type HeroSlide = {
  id: string;
  image: string;
  backgroundImage: string | null;
  mobileBackgroundImage: string | null;
  animation: string;
  animationDuration: number | null;
  sortOrder: number;
  isActive: boolean;
};

const FALLBACK_SLIDE: HeroSlide = {
  id: 'fallback',
  image: '',
  backgroundImage: null,
  mobileBackgroundImage: null,
  animation: 'fade',
  animationDuration: 900,
  sortOrder: 0,
  isActive: true,
};

const EASING = [0.22, 1, 0.36, 1] as const;

function getSlideVariants(animation: string) {
  switch (animation) {
    case 'top-to-bottom':
      return { enter: { y: '-100%' }, center: { y: '0%' }, exit: { y: '100%' } };
    case 'bottom-to-top':
      return { enter: { y: '100%' }, center: { y: '0%' }, exit: { y: '-100%' } };
    case 'left-to-right':
      return { enter: { x: '-100%' }, center: { x: '0%' }, exit: { x: '100%' } };
    case 'right-to-left':
      return { enter: { x: '100%' }, center: { x: '0%' }, exit: { x: '-100%' } };
    case 'scale-up':
      return {
        enter: { scale: 0.9, opacity: 0 },
        center: { scale: 1, opacity: 1 },
        exit: { scale: 1.05, opacity: 0 },
      };
    case 'zoom-out':
      return {
        enter: { scale: 1.15, opacity: 0 },
        center: { scale: 1, opacity: 1 },
        exit: { scale: 0.95, opacity: 0 },
      };
    case 'parallax':
      return {
        enter: { y: '-8%', opacity: 0 },
        center: { y: '0%', opacity: 1 },
        exit: { y: '8%', opacity: 0 },
      };
    case 'fade':
    default:
      return { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };
  }
}

/** Desktop + mobile sources, each falling back to the legacy single-image field. */
function SlideImage({ slide }: { slide: HeroSlide }) {
  const desktop = slide.backgroundImage || slide.image || '';
  const mobile = slide.mobileBackgroundImage || desktop;

  // No asset configured — show a neutral gradient rather than a broken image.
  if (!desktop) {
    return <div className="from-primary/10 to-primary/5 absolute inset-0 bg-gradient-to-br" />;
  }

  return (
    <picture>
      {mobile && <source media="(max-width: 767px)" srcSet={mobile} />}
      <img
        src={desktop}
        alt=""
        fetchPriority="high"
        loading="eager"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </picture>
  );
}

export function HeroSection({ slides = [] }: { slides?: HeroSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

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
  const duration = slide.animationDuration ?? 900;
  const variants = useMemo(() => getSlideVariants(slide.animation), [slide.animation]);
  const isDirectional = [
    'top-to-bottom',
    'bottom-to-top',
    'left-to-right',
    'right-to-left',
  ].includes(slide.animation);

  return (
    <section className="mx-auto w-full max-w-screen-2xl px-2 py-3 sm:px-3 sm:py-5 lg:px-4 lg:py-5">
      <div
        className="group/hero border-primary/10 relative aspect-[16/9] w-full overflow-hidden rounded-2xl border sm:aspect-[21/9] sm:rounded-3xl lg:aspect-[5/2]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence mode={isDirectional ? 'popLayout' : 'wait'} initial={false}>
          <motion.div
            key={slide.id}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: duration / 1000, ease: EASING }}
            style={{ willChange: 'transform, opacity' }}
            className="absolute inset-0"
          >
            <SlideImage slide={slide} />
          </motion.div>
        </AnimatePresence>

        {displaySlides.length > 1 && (
          <>
            <div className="absolute bottom-3 left-4 z-20 flex items-center gap-1.5 sm:bottom-5 sm:left-8 lg:left-12">
              {displaySlides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={cn(
                    'h-1 rounded-full transition-all duration-300 sm:h-1.5',
                    i === current
                      ? 'w-5 bg-white sm:w-7'
                      : 'w-1 bg-white/50 hover:bg-white/80 sm:w-1.5'
                  )}
                />
              ))}
            </div>

            <div className="absolute bottom-3 right-4 z-20 flex items-center gap-1.5 sm:bottom-5 lg:right-12">
              <button
                onClick={goToPrev}
                aria-label="Previous slide"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-md transition-colors hover:bg-black/45"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={next}
                aria-label="Next slide"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-md transition-colors hover:bg-black/45"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
