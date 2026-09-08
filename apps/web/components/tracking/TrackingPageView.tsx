'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { trackPageView } from '@/lib/tracking';

/**
 * Fires PageView / page_view on SPA route changes.
 * The initial page view is already sent by the Pixel/GA4 init snippets,
 * so the first render is skipped to avoid double counting.
 */
export function TrackingPageView() {
  const pathname = usePathname();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    trackPageView(window.location.href);
  }, [pathname]);

  return null;
}
