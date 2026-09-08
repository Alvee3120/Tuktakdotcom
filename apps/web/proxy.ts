import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { routing } from './routing';

const handleI18n = createMiddleware(routing);

// Server-side auth guard for protected areas.
//
// Checks for Better Auth's session cookie and redirects anonymous visitors to
// /login. This layers enrolment-level
// protection on top of the API's own requireAuth / requireRole gates, so
// /admin and /account pages are never server-rendered for logged-out users.
// /checkout is intentionally NOT protected — guests can place orders with
// contact details (checkout itself renders a guest form when not signed in).
//
// Note: this is a presence check, not a full server-side session verify —
// role/permission enforcement stays on the API (which the UI calls with
// credentials). Fine-grained authorization is handled there.
// Better Auth cookies its session under `better-auth.session_token` in dev
// (http://) but prefixes it with `__Secure-` in production (Secure cookies),
// so accept both names when guarding protected pages.
const SESSION_COOKIES = ['better-auth.session_token', '__Secure-better-auth.session_token'];
const PROTECTED_TOP_LEVELS = new Set(['account', 'admin']);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);

  // Strip the optional locale prefix (e.g. /bn/checkout → checkout).
  let rest = segments;
  if ((routing.locales as readonly string[]).includes(rest[0] ?? '')) rest = rest.slice(1);

  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));

  if (PROTECTED_TOP_LEVELS.has(rest[0] ?? '') && !hasSession) {
    const url = request.nextUrl.clone();
    const hasLocalePrefix = segments.length - rest.length === 1;
    url.pathname = hasLocalePrefix ? `/${segments[0]}/login` : '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return handleI18n(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/', '/(bn|en)/:path*'],
};
