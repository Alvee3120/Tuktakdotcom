/**
 * Client-side tracking event layer.
 *
 * Every helper is guarded: when a script (Pixel / gtag / GTM) isn't loaded
 * (IDs not configured in admin settings) the call is a silent no-op, so
 * these can be wired unconditionally throughout the app.
 *
 * Purchase uses eventID = orderId — the same value the server sends to the
 * Meta Conversions API as event_id, letting Meta deduplicate the pair.
 */

type TrackedItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

const CURRENCY = 'BDT';

function pushDataLayer(event: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.dataLayer) return;
  // Reset the ecommerce object first per GTM best practice
  if (event.ecommerce) window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push(event);
}

function fbq(...args: unknown[]) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq(...args);
}

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag(...args);
}

function toGaItems(items: TrackedItem[]) {
  return items.map((item) => ({
    item_id: item.productId,
    item_name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));
}

/** SPA route change — fires Pixel PageView + GA4 page_view */
export function trackPageView(url: string) {
  fbq('track', 'PageView');
  gtag('event', 'page_view', { page_location: url });
  pushDataLayer({ event: 'page_view', page_location: url });
}

/** Product detail page viewed */
export function trackViewContent(product: {
  id: string;
  name: string;
  price: number;
  categoryName?: string;
}) {
  fbq('track', 'ViewContent', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    content_category: product.categoryName,
    value: product.price,
    currency: CURRENCY,
  });
  const gaPayload = {
    currency: CURRENCY,
    value: product.price,
    items: toGaItems([
      { productId: product.id, name: product.name, price: product.price, quantity: 1 },
    ]),
  };
  gtag('event', 'view_item', gaPayload);
  pushDataLayer({ event: 'view_item', ecommerce: gaPayload });
}

/** Item added to the cart */
export function trackAddToCart(item: TrackedItem) {
  const value = item.price * item.quantity;
  fbq('track', 'AddToCart', {
    content_ids: [item.productId],
    content_name: item.name,
    content_type: 'product',
    value,
    currency: CURRENCY,
  });
  const gaPayload = { currency: CURRENCY, value, items: toGaItems([item]) };
  gtag('event', 'add_to_cart', gaPayload);
  pushDataLayer({ event: 'add_to_cart', ecommerce: gaPayload });
}

/** Checkout page opened with items in the cart */
export function trackInitiateCheckout(items: TrackedItem[], value: number) {
  fbq('track', 'InitiateCheckout', {
    content_ids: items.map((i) => i.productId),
    content_type: 'product',
    num_items: items.reduce((sum, i) => sum + i.quantity, 0),
    value,
    currency: CURRENCY,
  });
  const gaPayload = { currency: CURRENCY, value, items: toGaItems(items) };
  gtag('event', 'begin_checkout', gaPayload);
  pushDataLayer({ event: 'begin_checkout', ecommerce: gaPayload });
}

/** Order placed — eventID/event_id keyed to orderId for Pixel↔CAPI dedup */
export function trackPurchase(order: {
  orderId: string;
  orderNumber: string;
  value: number;
  items: TrackedItem[];
}) {
  fbq(
    'track',
    'Purchase',
    {
      content_ids: order.items.map((i) => i.productId),
      content_type: 'product',
      num_items: order.items.reduce((sum, i) => sum + i.quantity, 0),
      value: order.value,
      currency: CURRENCY,
    },
    { eventID: order.orderId }
  );
  const gaPayload = {
    transaction_id: order.orderNumber,
    currency: CURRENCY,
    value: order.value,
    items: toGaItems(order.items),
  };
  gtag('event', 'purchase', gaPayload);
  pushDataLayer({ event: 'purchase', ecommerce: gaPayload });
}

/** Site search submitted */
export function trackSearch(query: string) {
  if (!query.trim()) return;
  fbq('track', 'Search', { search_string: query });
  gtag('event', 'search', { search_term: query });
  pushDataLayer({ event: 'search', search_term: query });
}

/** Coupon applied successfully at checkout (custom event) */
export function trackApplyCoupon(code: string, discount: number) {
  fbq('trackCustom', 'ApplyCoupon', { coupon: code, discount, currency: CURRENCY });
  gtag('event', 'apply_coupon', { coupon: code, discount });
  pushDataLayer({ event: 'apply_coupon', coupon: code, discount });
}
