'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

const SLOW_THRESHOLD_MS = 2000;

const MESSAGES = [
  'Analyzing your experience…',
  'Preparing the page…',
  'Optimizing your view…',
  'Almost ready…',
];

export function CreativeLoader({ loading }: { loading: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  const [showCreative, setShowCreative] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!loading) {
      setShowCreative(false);
      setMessageIndex(0);
      return;
    }
    const timer = setTimeout(() => setShowCreative(true), SLOW_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!showCreative || shouldReduceMotion) return;
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [showCreative, shouldReduceMotion]);

  if (!loading) return null;

  return (
    <AnimatePresence mode="wait">
      {showCreative && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="flex min-h-[40vh] flex-col items-center justify-center gap-5 px-4 text-center"
        >
          {!shouldReduceMotion && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className="text-primary h-8 w-8" />
            </motion.div>
          )}
          {shouldReduceMotion ? <Sparkles className="text-primary h-8 w-8" /> : null}
          <div className="space-y-2">
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="text-muted-foreground text-sm font-medium"
              >
                {MESSAGES[messageIndex]}
              </motion.p>
            </AnimatePresence>
            {!shouldReduceMotion && (
              <motion.div className="bg-muted mx-auto h-1 w-32 overflow-hidden rounded-full">
                <motion.div
                  className="bg-primary h-full rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: SLOW_THRESHOLD_MS / 1000, ease: 'easeInOut' }}
                />
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { SLOW_THRESHOLD_MS };
