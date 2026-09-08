'use client';

import { MotionConfig } from 'framer-motion';

type MotionProviderProps = {
  children: React.ReactNode;
};

/**
 * Global framer-motion defaults:
 * - `reducedMotion="user"` disables transform/layout animations for users who
 *   opt into OS-level reduced motion (accessibility + battery/perf win).
 * - Framer-motion only ships to the browser from components that import it, so
 *   this wrapper is intentionally dependency-light.
 */
export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.15 }}>
      {children}
    </MotionConfig>
  );
}
