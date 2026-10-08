import { FINISH_PRICES_BY_LABEL, offerUnitPrice, productId, type Offer } from '../../api/_lib/pricing';
import type { CustomerInfo } from '../context/cartContext';
import { getAttribution } from './attribution';
import { getMetaCheckoutTracking, trackMetaEventWithServer } from './metaPixel';
import { getReferralCode } from './referralCode';
import { syncServerClock } from './serverClock';

// The one way into Paystack checkout, used by the cart and by the card
// pages' order form, so both send exactly the same request to /api/checkout
// (which re-prices everything itself) and the same Meta events.

export type CheckoutLine = { name: string; subOption?: string; quantity: number };

// AddToCart, browser + Conversions API with the same event ID; no-op
// without cookie consent. Value is after any offer.
export function trackAddToCart(
  line: { name: string; price: number; quantity: number },
  offer: Offer | null,
  customer?: { email?: string; phone?: string }
) {
  const unitPrice = offerUnitPrice(FINISH_PRICES_BY_LABEL[line.name] ?? line.price, offer);
  const id = productId(line.name);
  trackMetaEventWithServer(
    'AddToCart',
    {
      value: unitPrice * line.quantity,
      currency: 'KES',
      content_type: 'product',
      content_name: line.name,
      content_ids: [id],
      contents: [{ id, quantity: line.quantity, item_price: unitPrice }],
    },
    customer
  );
}

export type CheckoutResult =
  | { status: 'redirecting' }
  // e.g. the offer ended while the form was open: checkout refused to charge
  // a total the customer hadn't seen. `total` is the server's new total.
  | { status: 'price-changed'; total: number | null; message: string }
  | { status: 'error'; message: string };

export async function startCheckout({
  items,
  customer,
  total,
  itemOffer,
  returnTo,
}: {
  items: CheckoutLine[];
  customer: CustomerInfo;
  // The total the customer was shown; checkout refuses to charge anything else.
  total: number;
  // The offer shown on each item's price, if that's the discount that applies.
  itemOffer: Offer | null;
  // A card page to come back to if they cancel on Paystack (default: the cart).
  returnTo?: string;
}): Promise<CheckoutResult> {
  // Browser + Conversions API, same event ID; no-op without cookie consent.
  trackMetaEventWithServer(
    'InitiateCheckout',
    {
      value: total,
      currency: 'KES',
      num_items: items.reduce((n, i) => n + i.quantity, 0),
      content_type: 'product',
      content_ids: [...new Set(items.map((i) => productId(i.name)))],
      contents: items.map((i) => ({
        id: productId(i.name),
        quantity: i.quantity,
        item_price: offerUnitPrice(FINISH_PRICES_BY_LABEL[i.name], itemOffer),
      })),
    },
    { email: customer.email, phone: customer.phone }
  );

  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((i) => ({ name: i.name, subOption: i.subOption, quantity: i.quantity })),
        customer,
        referralCode: getReferralCode(),
        // Only present when the visitor accepted cookies; without it the
        // server never sends this purchase to Meta.
        metaTracking: getMetaCheckoutTracking() ?? undefined,
        expectedTotal: total,
        // Which campaign/ad set/ad they came from, saved on the order.
        attribution: getAttribution(),
        ...(returnTo ? { returnTo } : {}),
      }),
    });
    const data = await res.json();
    if (res.status === 409 && data.code === 'PRICE_CHANGED') {
      void syncServerClock(true);
      return { status: 'price-changed', total: typeof data.total === 'number' ? data.total : null, message: data.error };
    }
    if (!res.ok || !data.authorization_url) {
      throw new Error(data.error ?? 'Could not start checkout.');
    }
    window.location.href = data.authorization_url;
    return { status: 'redirecting' };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Please try again.' };
  }
}
