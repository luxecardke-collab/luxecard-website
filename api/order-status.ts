import type { IncomingMessage, ServerResponse } from 'http';
import { fetchWithTimeout } from './_lib/http.js';
import { recordPaidOrder, type PaystackOrderMetadata } from './_lib/orders.js';
import { getClientIp, isRateLimited } from './_lib/rateLimit.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { productId, type CheckoutItem } from './_lib/pricing.js';
import { isPaymentLinkSale } from './_lib/paymentLinkSale.js';

// Product IDs and quantities only (nothing about the customer), so the
// confirmation page's browser Purchase carries the same products as the
// server's.
function purchaseContents(items: unknown): { id: string; quantity: number }[] {
  if (!Array.isArray(items)) return [];
  return (items as CheckoutItem[])
    .filter((i) => i && typeof i.name === 'string' && typeof i.quantity === 'number')
    .map((i) => ({ id: productId(i.name), quantity: i.quantity }));
}

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

// The confirmation page polls this every couple of seconds while waiting
// for payment to land, so this needs real headroom - comfortably above
// what even an unusually long wait would produce for one genuine
// customer (or several sharing an office/mobile-carrier IP), while still
// capping a scripted flood (a miss here calls Paystack's own API too).
const MAX_ATTEMPTS_PER_IP = 60;
const WINDOW_MS = 5 * 60 * 1000;
const PAYSTACK_TIMEOUT_MS = 8000;

export default async function handler(req: IncomingMessage, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const reference = new URL(req.url ?? '', 'http://localhost').searchParams.get('reference');
  if (!reference) {
    res.status(400).json({ error: 'Missing reference.' });
    return;
  }

  if (await isRateLimited('order-status', getClientIp(req), MAX_ATTEMPTS_PER_IP, WINDOW_MS)) {
    res.status(429).json({ error: 'Too many requests. Please try again in a few minutes.' });
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: order } = await supabase
    .from('orders')
    .select('payment_status, total, items, order_source')
    .eq('paystack_reference', reference)
    .maybeSingle();

  // `value` (the order total in KES, nothing else about the order) lets the
  // confirmation page report the Purchase to Meta with the right amount.
  // A WhatsApp sale's Purchase is decided on the server (only a full or
  // deposit payment, only with cookie consent): its confirmation page gets
  // no value, so it never sends a browser Purchase of its own.
  if (order?.payment_status === 'paid') {
    res
      .status(200)
      .json(order.order_source === 'whatsapp' ? { paid: true } : { paid: true, value: Number(order.total), contents: purchaseContents(order.items) });
    return;
  }

  // No paid row yet — either the webhook hasn't landed, or this payment
  // never succeeded and never will. Ask Paystack directly to tell those
  // two cases apart instead of leaving the caller to guess.
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    res.status(200).json({ paid: false });
    return;
  }

  try {
    const verifyRes = await fetchWithTimeout(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
      PAYSTACK_TIMEOUT_MS
    );
    const verifyData = (await verifyRes.json()) as {
      data?: {
        status?: string;
        amount?: number;
        paid_at?: string | null;
        paidAt?: string | null;
        metadata?: PaystackOrderMetadata;
        customer?: { email?: string | null; first_name?: string | null; last_name?: string | null; phone?: string | null } | null;
      };
    };
    const paid = verifyRes.ok && verifyData?.data?.status === 'success';

    // Self-heal: Paystack confirms this was paid, but our own webhook
    // either hasn't landed yet or never will. Create the order right now,
    // with the exact same validation, alert and commission logic the
    // webhook itself uses (recordPaidOrder upserts on paystack_reference,
    // so if the webhook wins the race a moment later, or already did, this
    // is a safe no-op). Never lets a failure here affect the response the
    // customer's own confirmation page is waiting on.
    if (paid && verifyData.data?.metadata) {
      try {
        await recordPaidOrder(reference, verifyData.data.metadata, 'order-status', verifyData.data);
      } catch (err) {
        console.error('order-status self-heal failed:', err);
      }
    }

    const amount = verifyData?.data?.amount;
    // Paystack amounts are in the smallest subunit (KES cents).
    res
      .status(200)
      .json(
        paid && typeof amount === 'number' && !isPaymentLinkSale(verifyData.data?.metadata)
          ? { paid, value: amount / 100, contents: purchaseContents(verifyData.data?.metadata?.items) }
          : { paid }
      );
  } catch {
    res.status(200).json({ paid: false });
  }
}
