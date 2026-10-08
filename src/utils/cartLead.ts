import { getAttribution } from './attribution';

export type CartLeadPayload = {
  type: 'individual' | 'business';
  fullName: string;
  jobTitle?: string;
  company?: string;
  email: string;
  phone: string;
  items: { name: string; subOption?: string; quantity: number }[];
  message?: string;
  // Business form only, when "I need an eTIMS tax invoice" is ticked.
  needsEtims?: boolean;
  kraPin?: string;
  kraBusinessName?: string;
  // The cart's "Request a quote" link, not the order form.
  quoteRequested?: boolean;
  hp: string;
};

// Records an add-to-cart submission. Deliberately fire-and-forget: adding to
// the cart must always work, so a failed save is only logged (the server logs
// its own failures too), never shown to the customer.
export function sendCartLead(payload: CartLeadPayload) {
  fetch('/api/cart-leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Which campaign/ad set/ad the visitor came from, for the team's alert.
    body: JSON.stringify({ ...payload, attribution: getAttribution() }),
    keepalive: true,
  })
    .then((res) => {
      if (!res.ok) console.error(`Cart lead was not saved (server returned ${res.status}).`);
    })
    .catch((err) => console.error('Cart lead was not saved:', err));
}

// A quote request is user-initiated and promises a specific outcome ("we'll
// email your quotation"), so unlike sendCartLead above it's awaited: the
// caller only shows that confirmation once this resolves true.
export async function sendQuoteRequest(payload: CartLeadPayload): Promise<boolean> {
  try {
    const res = await fetch('/api/cart-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, attribution: getAttribution() }),
    });
    if (!res.ok) console.error(`Quote request was not saved (server returned ${res.status}).`);
    return res.ok;
  } catch (err) {
    console.error('Quote request was not saved:', err);
    return false;
  }
}
