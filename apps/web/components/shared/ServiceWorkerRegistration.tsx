'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker on mount.
 * Must be rendered as a client component in the layout.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // In development (Turbopack) chunk URLs change on every rebuild, so a cached
    // service worker serves stale/missing assets → phantom "Failed to load
    // resource: 404". Only run the SW in production; in dev, tear down any SW
    // left over from a previous prod-like session and clear its caches.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Update found — reload page to get new version
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                // New SW activated and controlling page — next navigation picks it up.
                // Avoid hard reload which causes a flash on slow connections.
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn('Service worker registration failed:', error);
      });
  }, []);

  return null;
}
