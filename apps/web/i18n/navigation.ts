import { createNavigation } from 'next-intl/navigation';

import { routing } from '@/routing';

/**
 * Locale-aware navigation helpers (next-intl).
 * `useRouter().replace(path, { locale })` keeps the locale prefix on the URL
 * and sets the NEXT_LOCALE cookie so the choice sticks.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
