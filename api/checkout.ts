import type { IncomingMessage, ServerResponse } from 'http';
import { fetchWithTimeout } from './_lib/http.js';
import { isEmail } from './_lib/input.js';
import { readEtims } from './_lib/kra.js';
import { getClientIp, isRateLimited } from './_lib/rateLimit.js';
import { computeAuthoritativeTotals, type CheckoutItem } from './_lib/pricing.js';

const PAYSTACK_TIMEOUT_MS = 8000;

type CheckoutRequestBody = {
  items: CheckoutItem[];
  customer: {
    name: string;
    email: string;
    phone: string;
    company?: string;
    // Present only when the business form's "I need an eTIMS tax invoice" box was ticked.
    etims?: { kraPin?: unknown; businessName?: unknown };
  };
  referralCode?: string | null;
  // Sent by the browser only when the visitor accepted cookies.
  metaTracking?: { consent?: unknown; fbp?: unknown; fbc?: unknown };
  // The total the cart showed the customer. Checkout is refused if the
  // server's total differs (e.g. an offer ended while the cart was open),
  // so they're never charged an amount they didn't see.
  expectedTotal?: unknown;
};

const clip = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

// The details the Paystack webhook needs to send this purchase to Meta's
// Conversions API, carried through Paystack's transaction metadata. Only
// built when the visitor accepted cookies; otherwise nothing is added and the
// webhook never contacts Meta. Deliberately excludes KRA and payment details.
function metaTrackingMetadata(req: VercelRequest, tracking: CheckoutRequestBody['metaTracking'], origin: string) {
  if (tracking?.consent !== true) return {};
  const ip = getClientIp(req);
  return {
    meta_consent: true,
    meta_fbp: clip(tracking.fbp, 256),
    meta_fbc: clip(tracking.fbc, 512),
    meta_client_user_agent: clip(req.headers['user-agent'], 512),
    meta_client_ip: clip(ip === 'unknown' ? null : ip, 64),
    meta_event_source_url: `${origin}/order-confirmation`,
  };
}

type VercelRequest = IncomingMessage & { body?: unknown };
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

// A real customer submits this once (occasionally retrying after a
// hiccup); this is sized to comfortably clear a shared office/mobile-
// carrier IP with several genuine customers checking out around the same
// time, while still capping a scripted flood (each attempt here also
// calls Paystack's own paid API).
const MAX_ATTEMPTS_PER_IP = 30;
const WINDOW_MS = 10 * 60 * 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ error: 'Server is missing PAYSTACK_SECRET_KEY.' });
    return;
  }

  if (await isRateLimited('checkout', getClientIp(req), MAX_ATTEMPTS_PER_IP, WINDOW_MS)) {
    res.status(429).json({ error: 'Too many attempts. Please try again in a few minutes.' });
    return;
  }

  let body: CheckoutRequestBody;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as CheckoutRequestBody);
  } catch {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  const { items, customer, referralCode, metaTracking, expectedTotal } = body ?? {};

  if (!customer?.name || !customer?.email || !customer?.phone) {
    res.status(400).json({ error: 'Missing customer name, email, or phone.' });
    return;
  }
  if (!isEmail(customer.email)) {
    res.status(400).json({ error: 'Invalid customer email.' });
    return;
  }

  // Priced by the server's clock, never the visitor's: this is the moment
  // that decides whether an offer applies, and it's stored with the order
  // (priced_at) so recording the payment later prices it the same way.
  const pricedAt = new Date();
  let totals;
  try {
    totals = computeAuthoritativeTotals(items, pricedAt);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid cart.' });
    return;
  }

  if (typeof expectedTotal === 'number' && Math.round(expectedTotal) !== Math.round(totals.total)) {
    res.status(409).json({
      error: `Prices have changed since your cart was updated. Your total is now KES ${Math.round(totals.total).toLocaleString('en-US')}. Please check your cart and try again.`,
      code: 'PRICE_CHANGED',
      total: totals.total,
    });
    return;
  }

  // Validate before any money moves: a bad PIN must never reach Paystack.
  const etimsResult = readEtims(!!customer.etims, customer.etims?.kraPin, customer.etims?.businessName);
  if ('error' in etimsResult) {
    res.status(400).json({ error: etimsResult.error });
    return;
  }
  const { etims } = etimsResult;

  const origin =
    (req.headers.origin as string | undefined) ??
    `https://${req.headers.host}`;

  try {
    const paystackRes = await fetchWithTimeout(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customer.email,
          // Paystack amounts are in the smallest currency subunit (KES cents).
          amount: Math.round(totals.total * 100),
          currency: 'KES',
          callback_url: `${origin}/order-confirmation`,
          metadata: {
            customer_name: customer.name,
            customer_email: customer.email,
            customer_phone: customer.phone,
            company: customer.company ?? null,
            items,
            subtotal: totals.subtotal,
            discount_applied: totals.discount > 0,
            discount: totals.discount,
            offer_id: totals.offer?.id ?? null,
            priced_at: pricedAt.toISOString(),
            total: totals.total,
            referral_code: referralCode ?? null,
            needs_etims: !!etims,
            kra_pin: etims?.kraPin ?? null,
            kra_business_name: etims?.businessName ?? null,
            // Shown on the transaction page in the Paystack dashboard.
            custom_fields: etims
              ? [
                  { display_name: 'eTIMS invoice', variable_name: 'etims_invoice', value: 'Requested' },
                  { display_name: 'KRA PIN', variable_name: 'kra_pin', value: etims.kraPin },
                  { display_name: 'Registered business name', variable_name: 'kra_business_name', value: etims.businessName },
                ]
              : undefined,
            // Sends the user back here with their cart reopened when they
            // cancel from Paystack's checkout page (the X button), rather
            // than leaving them on whatever default Paystack falls back to.
            cancel_action: `${origin}/?checkout=cancelled`,
            ...metaTrackingMetadata(req, metaTracking, origin),
          },
        }),
      },
      PAYSTACK_TIMEOUT_MS
    );

    const paystackData = (await paystackRes.json()) as {
      status: boolean;
      message?: string;
      data?: { authorization_url: string };
    };

    if (!paystackRes.ok || !paystackData?.status || !paystackData.data) {
      res.status(502).json({ error: paystackData?.message ?? 'Paystack initialization failed.' });
      return;
    }

    res.status(200).json({ authorization_url: paystackData.data.authorization_url });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unexpected server error.' });
  }
}
