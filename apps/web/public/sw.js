/**
 * Tuktak Service Worker
 * Provides offline caching with network-first strategy for pages
 * and cache-first strategy for static assets.
 */

const CACHE_NAME = 'tuktak-v1';
const OFFLINE_URL = '/offline.html';

/** Assets to precache on install — only files that definitely exist */
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable.png',
  '/apple-touch-icon.png',
];

/** Max age for cached pages (24 hours) */
const _PAGE_CACHE_MAX_AGE = 86400;
/** Max age for cached static assets (30 days) */
const _STATIC_CACHE_MAX_AGE = 2592000;
/** Max items in page cache */
const _PAGE_CACHE_MAX_ITEMS = 50;

/* ─── Install ───────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

/* ─── Activate ──────────────────────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    })
  );
  self.clients.claim();
});

/* ─── Fetch ─────────────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  // Skip API requests
  if (url.pathname.startsWith('/api/')) return;

  // NEVER cache Next.js build output — Turbopack chunks are already versioned
  // and the SW caching them causes stale-module errors after updates
  if (url.pathname.startsWith('/_next/')) return;
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Pages: network-first with offline fallback
  event.respondWith(networkFirst(request));
});

/* ─── Strategies ────────────────────────────────────────── */

/**
 * Cache-first: Try cache, fall back to network, then cache the response.
 * Best for static assets like images, fonts, CSS, JS.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Network-first: Try network, fall back to cache.
 * If offline and no cache, show offline page for navigation requests.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // For navigation requests, show offline page
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match(OFFLINE_URL);
      if (offlinePage) return offlinePage;
    }

    return new Response('Offline — Tuktak', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/* ─── Helpers ───────────────────────────────────────────── */

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.avif') ||
    pathname.endsWith('.ico')
  );
}
