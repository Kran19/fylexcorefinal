"use client";

/**
 * Centralized Meta Pixel (Facebook Ads) Tracking Utility for FYLEX
 * Ensures every commerce event (`ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`)
 * includes numeric `value` and `currency: 'INR'` for accurate Meta ROAS & conversion value tracking.
 */

const CURRENCY = 'INR';

function toNumericValue(val) {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Number(num.toFixed(2));
}

function safeFbq(method, eventName, params, options) {
  if (typeof window === 'undefined') return;
  if (typeof window.fbq !== 'function') return;
  try {
    if (options) {
      window.fbq(method, eventName, params, options);
    } else if (params) {
      window.fbq(method, eventName, params);
    } else {
      window.fbq(method, eventName);
    }
  } catch (err) {
    console.warn(`[MetaPixel] Failed to fire ${eventName}:`, err);
  }
}

export function trackMetaPageView() {
  safeFbq('track', 'PageView');
}

export function trackMetaViewContent({ id, sku, name, category = 'Luxury Watches', value }) {
  const numericValue = toNumericValue(value);
  const contentId = String(sku || id || 'FYLEX-WATCH');

  safeFbq('track', 'ViewContent', {
    content_ids: [contentId],
    contents: [{ id: contentId, quantity: 1, item_price: numericValue }],
    content_name: name || 'FYLEX Timepiece',
    content_category: category,
    content_type: 'product',
    value: numericValue,
    currency: CURRENCY,
  });
}

export function trackMetaAddToCart({ id, sku, name, quantity = 1, unitPrice = 0, value }) {
  const qty = Math.max(1, Number(quantity || 1));
  const price = toNumericValue(unitPrice);
  const totalValue = value !== undefined ? toNumericValue(value) : toNumericValue(price * qty);
  const contentId = String(sku || id || 'FYLEX-ITEM');

  safeFbq('track', 'AddToCart', {
    content_ids: [contentId],
    contents: [{ id: contentId, quantity: qty, item_price: price }],
    content_name: name || 'FYLEX Timepiece',
    content_type: 'product',
    num_items: qty,
    value: totalValue,
    currency: CURRENCY,
  });
}

export function trackMetaInitiateCheckout({ items = [], value = 0, coupon = '' }) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const contents = normalizedItems.map((item) => {
    const qty = Math.max(1, Number(item.qty ?? item.quantity ?? 1));
    const unitPrice = toNumericValue(item.unitPrice ?? item.price ?? 0);
    return {
      id: String(item.sku || item.variantId || item.productId || item.id || 'FYLEX-ITEM'),
      quantity: qty,
      item_price: unitPrice,
    };
  });

  const computedFallback = contents.reduce((s, c) => s + c.item_price * c.quantity, 0);
  const totalValue = toNumericValue(value > 0 ? value : computedFallback);
  const numItems = contents.reduce((s, c) => s + c.quantity, 0) || 1;

  const payload = {
    content_ids: contents.map((c) => c.id),
    contents,
    content_type: 'product',
    num_items: numItems,
    value: totalValue,
    currency: CURRENCY,
  };
  if (coupon) payload.coupon = String(coupon);

  safeFbq('track', 'InitiateCheckout', payload);
}

export function savePendingMetaPurchaseSnapshot(snapshot) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('fylex_last_purchase_meta', JSON.stringify(snapshot));
  } catch {}
}

export function trackMetaPurchase({ orderId, orderNumber, value = 0, items = [], coupon = '' }) {
  if (typeof window === 'undefined') return;
  const uniqueOrderRef = String(orderNumber || orderId || '').trim();

  // Deduplicate so reloading /thank-you never double-fires Purchase
  if (uniqueOrderRef) {
    const dedupeKey = `fylex_fbq_purchased_${uniqueOrderRef}`;
    try {
      if (sessionStorage.getItem(dedupeKey) === '1') return;
      sessionStorage.setItem(dedupeKey, '1');
    } catch {}
  }

  const normalizedItems = Array.isArray(items) ? items : [];
  const contents = normalizedItems.map((item) => {
    const qty = Math.max(1, Number(item.quantity ?? item.qty ?? 1));
    const unitPrice = toNumericValue(item.unitPrice ?? item.price ?? 0);
    return {
      id: String(item.sku || item.productVariantId || item.variantId || item.productId || 'FYLEX-ITEM'),
      quantity: qty,
      item_price: unitPrice,
    };
  });

  const computedFallback = contents.reduce((s, c) => s + c.item_price * c.quantity, 0);
  const totalValue = toNumericValue(value > 0 ? value : computedFallback);
  const numItems = contents.reduce((s, c) => s + c.quantity, 0) || 1;

  const payload = {
    content_ids: contents.length ? contents.map((c) => c.id) : ['FYLEX-ORDER'],
    contents: contents.length ? contents : [{ id: 'FYLEX-ORDER', quantity: 1, item_price: totalValue }],
    content_type: 'product',
    num_items: numItems,
    value: totalValue,
    currency: CURRENCY,
  };
  if (uniqueOrderRef) payload.order_id = uniqueOrderRef;
  if (coupon) payload.coupon = String(coupon);

  const eventOptions = uniqueOrderRef ? { eventID: `purchase_${uniqueOrderRef}` } : undefined;
  safeFbq('track', 'Purchase', payload, eventOptions);
}
