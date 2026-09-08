import { revalidatePath, revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * On-demand revalidation endpoint (Next.js ISR).
 *
 * The admin panel calls this after saving the news ticker (and future
 * admin-managed content) so changes reflect on the storefront immediately,
 * instead of waiting for the ISR revalidate window.
 *
 * Guarded by `NEXT_REVALIDATE_SECRET` (set in Vercel env / .env.local).
 * Not proxied to the backend: it lives under `/revalidate` (not `/api/*`),
 * so Next's rewrite of `/api/*` to the Cloudflare Worker never intercepts it.
 */
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') ?? req.headers.get('x-revalidate-secret');
  const expected = process.env.NEXT_REVALIDATE_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const tag = req.nextUrl.searchParams.get('tag') || undefined;
  const path = req.nextUrl.searchParams.get('path') || undefined;

  try {
    if (tag) revalidateTag(tag, 'default');
    if (path) revalidatePath(path, 'layout');
    return NextResponse.json({
      revalidated: true,
      revalidatedTag: tag ?? null,
      revalidatedPath: path ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { revalidated: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
