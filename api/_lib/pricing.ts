// Authoritative price list, keyed by the same label strings the cart stores on
// each CartItem.name. Never trust a client-submitted price/total directly: the
// amount actually charged is recomputed from this list, not from whatever the
// browser sent.
//
// This file is also the single source for the frontend: the order form
// (InquiryModal), the cart (CartProvider), the products section and the
// homepage FAQ import these values, so changing a price, the bulk discount
// or an offer here updates all of them.
// Keep it dependency-free so it stays safe to bundle into the browser.
export const FINISH_PRICES_BY_LABEL: Record<string, number> = {
  Plastic: 7000,
  Wood: 9000,
  Metallic: 12000,
  "Chairman's Card": 19000,
};

// Stable product IDs, one per finish, for ad platforms (Meta content_ids).
// The labels above are display names and can change; these must not, or
// Meta stops matching new events to past ones.
export const PRODUCT_IDS_BY_LABEL: Record<string, string> = {
  Plastic: 'plastic',
  Wood: 'wood',
  Metallic: 'metal',
  "Chairman's Card": 'chairman',
};

export function productId(label: string): string {
  return PRODUCT_IDS_BY_LABEL[label] ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

// 10% off once an order has more than 3 cards.
export const BULK_DISCOUNT_THRESHOLD = 3;
export const BULK_DISCOUNT_RATE = 0.1;

// Time-limited offers: a percentage off every card between two moments.
// This list is the one place to set one up; the products section, order
// form, cart, FAQ and checkout all follow it, and it switches itself on and
// off at these exact times with no redeploy. Times are ISO strings with an
// explicit +03:00 (East Africa Time) offset; `endsAt` is exclusive, so an
// offer "until Sunday 23:59:59" ends at the following midnight.
//
// Whether an offer is on is always decided by the server's clock when
// money is involved (checkout, paid orders, quotes); the site only uses the
// server's time too, read from /api/offer, never the visitor's device clock.
// An offer never combines with the bulk discount: an order gets whichever
// single discount is larger.
export type Offer = {
  id: string;
  name: string;
  rate: number;
  startsAt: string;
  endsAt: string;
};

export const OFFERS: Offer[] = [
  {
    id: 'customer-service-week-2026',
    name: 'Customer Service Week',
    rate: 0.1,
    startsAt: '2026-10-07T00:00:00+03:00',
    endsAt: '2026-10-12T00:00:00+03:00',
  },
];

export function activeOffer(at: Date | null): Offer | null {
  if (!at) return null;
  const t = at.getTime();
  return OFFERS.find((o) => t >= Date.parse(o.startsAt) && t < Date.parse(o.endsAt)) ?? null;
}

// The next moment any offer starts or ends after `at`, so a page left open
// can switch prices at exactly that moment.
export function nextOfferChange(at: Date): Date | null {
  const t = at.getTime();
  const upcoming = OFFERS.flatMap((o) => [Date.parse(o.startsAt), Date.parse(o.endsAt)]).filter((x) => x > t);
  return upcoming.length ? new Date(Math.min(...upcoming)) : null;
}

// A card's price with an offer applied (whole shillings).
export function offerUnitPrice(price: number, offer: Offer | null): number {
  return offer ? Math.round(price * (1 - offer.rate)) : price;
}

export type PricedLine = { price: number; quantity: number };

export type CartTotals = {
  // At regular prices.
  subtotal: number;
  discount: number;
  total: number;
  totalCount: number;
  // Which discount applied: the offer, the bulk discount, or none.
  discountType: 'offer' | 'bulk' | null;
  offer: Offer | null;
};

// The one totals calculation, shared by checkout (via
// computeAuthoritativeTotals below) and the cart's own display, so what the
// cart shows is exactly what checkout charges.
export function computeTotals(lines: PricedLine[], offer: Offer | null): CartTotals {
  let subtotal = 0;
  let offerTotal = 0;
  let totalCount = 0;
  for (const { price, quantity } of lines) {
    subtotal += price * quantity;
    offerTotal += offerUnitPrice(price, offer) * quantity;
    totalCount += quantity;
  }
  const offerDiscount = offer ? subtotal - offerTotal : 0;
  const bulkDiscount = totalCount > BULK_DISCOUNT_THRESHOLD ? subtotal * BULK_DISCOUNT_RATE : 0;
  // Never both: whichever single discount is larger (the offer on a tie).
  const discountType = offerDiscount > 0 && offerDiscount >= bulkDiscount ? 'offer' : bulkDiscount > 0 ? 'bulk' : null;
  const discount = discountType === 'offer' ? offerDiscount : discountType === 'bulk' ? bulkDiscount : 0;
  return {
    subtotal,
    discount,
    total: subtotal - discount,
    totalCount,
    discountType,
    offer: discountType === 'offer' ? offer : null,
  };
}

// Which sub-options exist for a finish (the label strings the cart actually
// stores, not the form's internal <select> values). Plastic and Chairman's
// Card have none. KEEP IN SYNC with the SUB_OPTIONS map in
// src/components/InquiryModal.tsx — the form itself only ever offers these,
// but this is what stops anything else (including a removed option, like
// Metallic's old Gold) from being submitted directly to the API.
export const SUB_OPTIONS_BY_LABEL: Record<string, string[]> = {
  Wood: ['Natural', 'Black'],
  Metallic: ['Silver', 'Black'],
};

export type CheckoutItem = {
  name: string;
  subOption?: string;
  quantity: number;
};

export type ValidatedTotals = CartTotals;

// Hard caps against an absurd cart (a huge item count or a huge quantity on
// one item) - shared by every caller of computeAuthoritativeTotals, so
// checkout.ts and the webhook are covered exactly the same as cart-leads.ts
// already was. The length check runs before the loop below, so an
// oversized array is rejected in O(1) rather than iterated first.
export const MAX_ITEMS = 20;
export const MAX_QUANTITY = 10000;

// Throws if any item references an unknown finish, a non-positive or
// excessive quantity, or the cart has too many line items - so a tampered
// or malicious request fails loudly instead of silently charging the
// wrong amount (or being processed at all).
//
// `pricedAt` is the server time the prices are for (whichever offer was on
// then applies); null means no offer, for orders priced before offers
// existed.
export function computeAuthoritativeTotals(items: CheckoutItem[], pricedAt: Date | null): ValidatedTotals {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart is empty.');
  }
  if (items.length > MAX_ITEMS) {
    throw new Error(`Too many items in the cart (max ${MAX_ITEMS}).`);
  }

  const lines: PricedLine[] = [];

  for (const item of items) {
    const price = FINISH_PRICES_BY_LABEL[item.name];
    if (price === undefined) {
      throw new Error(`Unknown finish: ${item.name}`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > MAX_QUANTITY) {
      throw new Error(`Invalid quantity for ${item.name}`);
    }
    const allowedSubOptions = SUB_OPTIONS_BY_LABEL[item.name];
    if (allowedSubOptions) {
      if (!item.subOption || !allowedSubOptions.includes(item.subOption)) {
        throw new Error(`Invalid sub-option for ${item.name}: ${item.subOption ?? '(none)'}`);
      }
    } else if (item.subOption) {
      throw new Error(`${item.name} does not take a sub-option.`);
    }
    lines.push({ price, quantity: item.quantity });
  }

  return computeTotals(lines, activeOffer(pricedAt));
}
