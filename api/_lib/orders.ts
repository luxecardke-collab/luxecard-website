// Records a paid order from Paystack transaction data - the exact same
// logic and validation for all three places that can learn a payment
// succeeded: the webhook (the normal, real-time path), order-status.ts's
// self-heal fallback (the customer's own confirmation page, in case the
// webhook is slow or never arrives), and the daily reconciliation cron (the
// last-resort safety net). Sharing this one function means all three stay
// identical instead of drifting apart, and - because it upserts on the
// orders.paystack_reference unique constraint (migration 0006) - calling it
// more than once for the same reference is always safe: only the first
// caller to win the race actually creates the row, sends the alert, and
// records any commission.
import { describeDiscount, describeItems, formatEat, formatKes, sendTeamEmail } from './email.js';
import { readEtims } from './kra.js';
import { attributionRows, isTestEnvironment, readAttribution } from './attribution.js';
import { describeMetaResult, sendMetaPurchase, type MetaResult } from './metaCapi.js';
import { getSupabaseAdmin } from './supabaseAdmin.js';
import { computeAuthoritativeTotals, type CheckoutItem } from './pricing.js';

export type PaystackOrderMetadata = {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  company?: string | null;
  items?: CheckoutItem[];
  referral_code?: string | null;
  needs_etims?: boolean;
  kra_pin?: string | null;
  kra_business_name?: string | null;
  // Where the customer came from (landing page UTM parameters + fbclid),
  // added by api/checkout.ts.
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  fbclid?: string | null;
  // Server time checkout priced the order at (api/checkout.ts); decides
  // which offer, if any, applied. Absent on orders from before offers.
  priced_at?: string | null;
  // Present only when the customer accepted cookies (see api/checkout.ts).
  meta_consent?: boolean;
  meta_fbp?: string | null;
  meta_fbc?: string | null;
  meta_client_user_agent?: string | null;
  meta_client_ip?: string | null;
  meta_event_source_url?: string | null;
};

// Where a call came from, only for labeling the team alert differently -
// the webhook's real-time path and order-status.ts's self-heal both read
// as an ordinary "New paid order"; the reconciliation cron (which only
// ever runs for something the other two missed) is flagged distinctly so
// the team knows to double check it.
export type OrderSource = 'webhook' | 'order-status' | 'cron';

// The parts of Paystack's own transaction record used here: what was
// actually collected (in KES cents) and when.
export type PaystackPayment = { amount?: number | null; paid_at?: string | null; paidAt?: string | null };

export type RecordOrderResult =
  | { ok: true; created: boolean; orderId: string | null }
  | { ok: false; error: string };

const COMMISSION_RATE = 0.1;

export async function recordPaidOrder(
  reference: string,
  metadata: PaystackOrderMetadata,
  source: OrderSource,
  payment: PaystackPayment = {}
): Promise<RecordOrderResult> {
  if (!metadata?.items || !metadata.customer_email || !metadata.customer_name || !metadata.customer_phone) {
    return { ok: false, error: 'Missing order metadata.' };
  }
  const { customer_name, customer_email, customer_phone } = metadata;

  const supabase = getSupabaseAdmin();

  // Re-validated here even though checkout.ts already checked it before the
  // customer paid: never drop a paid order over it, so a bad PIN just gets
  // flagged in the alert for the team to sort out with the customer.
  const etimsRequested = metadata.needs_etims === true;
  let etimsPin: string | null = null;
  let etimsName: string | null = null;
  let etimsProblem: string | null = null;
  if (etimsRequested) {
    const parsed = readEtims(true, metadata.kra_pin, metadata.kra_business_name);
    if ('error' in parsed) {
      etimsProblem = parsed.error;
      etimsPin = typeof metadata.kra_pin === 'string' ? metadata.kra_pin.trim().slice(0, 30) || null : null;
      etimsName = typeof metadata.kra_business_name === 'string' ? metadata.kra_business_name.trim().slice(0, 200) || null : null;
      console.error('Paid order has invalid eTIMS details:', parsed.error);
    } else if (parsed.etims) {
      etimsPin = parsed.etims.kraPin;
      etimsName = parsed.etims.businessName;
    }
  }

  // Priced exactly as checkout priced it, at the same moment - not now:
  // this can run hours later (the reconciliation cron), after an offer that
  // applied at checkout has ended, and must record what was actually
  // charged. Orders from before priced_at existed had no offer.
  const pricedAt =
    typeof metadata.priced_at === 'string' && !Number.isNaN(Date.parse(metadata.priced_at))
      ? new Date(metadata.priced_at)
      : null;
  let totals;
  try {
    totals = computeAuthoritativeTotals(metadata.items, pricedAt);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid order items.' };
  }

  const attribution = readAttribution(metadata);
  const isTest = isTestEnvironment();

  // Upsert on the DB's own unique constraint (migration 0006) rather than a
  // separate check-then-insert: whichever caller (webhook, self-heal, or
  // cron) gets here first for a given reference wins the row; every other
  // caller - even a genuinely concurrent one - gets no row back and treats
  // it as already-processed. This is what makes calling this function from
  // three different places for the same payment safe.
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .upsert(
      {
        customer_name,
        customer_email,
        customer_phone,
        company: metadata.company ?? null,
        items: metadata.items,
        subtotal: totals.subtotal,
        discount_applied: totals.discount > 0,
        total: totals.total,
        payment_status: 'paid',
        paystack_reference: reference,
        referral_code: metadata.referral_code ?? null,
        ...attribution,
        ...(isTest ? { is_test: true } : {}),
        ...(etimsRequested ? { needs_etims: true, kra_pin: etimsPin, kra_business_name: etimsName } : {}),
      },
      { onConflict: 'paystack_reference', ignoreDuplicates: true }
    )
    .select('id')
    .maybeSingle();

  if (orderError) {
    console.error('Failed to insert order:', orderError);
    return { ok: false, error: 'Failed to record order.' };
  }

  if (!order) {
    // Someone else (another caller, or a redelivered webhook) already
    // recorded this reference - the alert, Meta Purchase and any
    // commission were already sent then.
    return { ok: true, created: false, orderId: null };
  }

  let referralNote: string | null = null;
  if (metadata.referral_code) {
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, status')
      .eq('referral_code', metadata.referral_code)
      .maybeSingle();

    // Pending affiliates' codes are stored on the order for the record, but
    // don't earn a commission until manually approved (status flipped to
    // 'active' in Supabase).
    if (affiliate && affiliate.status === 'active') {
      const { error: commissionError } = await supabase.from('referral_commissions').insert({
        affiliate_id: affiliate.id,
        order_id: order.id,
        commission_amount: totals.total * COMMISSION_RATE,
        payout_status: 'unpaid',
      });
      if (commissionError) {
        console.error('Failed to insert referral commission:', commissionError);
        referralNote = `${metadata.referral_code} (commission could not be recorded, check the logs)`;
      } else {
        referralNote = `${metadata.referral_code} (active affiliate, commission recorded)`;
      }
    } else if (affiliate) {
      referralNote = `${metadata.referral_code} (affiliate is still pending approval, no commission)`;
    } else {
      referralNote = `${metadata.referral_code} (no affiliate has this code, no commission)`;
    }
  }

  // The order is saved. Everything below is best-effort and never affects
  // the caller's response: sendTeamEmail and sendMetaPurchase both log
  // their own failures instead of throwing, and both have their own
  // timeout. The Meta Purchase goes only to customers who accepted
  // cookies, and carries no KRA, name or company details. It's sent first
  // so the team's alert can say what happened to it.
  const paidValue = typeof payment.amount === 'number' && payment.amount > 0 ? payment.amount / 100 : totals.total;
  const paidAtRaw = payment.paid_at ?? payment.paidAt;
  const paidAtMs = paidAtRaw ? Date.parse(paidAtRaw) : NaN;
  const metaResult: MetaResult =
    metadata.meta_consent === true
      ? await sendMetaPurchase({
          reference,
          value: paidValue,
          eventTime: Number.isNaN(paidAtMs) ? undefined : Math.floor(paidAtMs / 1000),
          email: customer_email,
          phone: customer_phone,
          items: metadata.items.map((i) => ({ name: i.name, quantity: i.quantity })),
          eventSourceUrl: metadata.meta_event_source_url,
          clientUserAgent: metadata.meta_client_user_agent,
          clientIpAddress: metadata.meta_client_ip,
          fbp: metadata.meta_fbp,
          fbc: metadata.meta_fbc,
        })
      : { status: 'skipped', reason: "the buyer didn't accept cookies, so nothing may be sent" };

  const recovered = source === 'cron';
  const teamEmail = sendTeamEmail({
    subject: `${isTest ? '[TEST] ' : ''}${recovered ? 'Recovered order' : 'New paid order'}${etimsRequested ? ' (eTIMS invoice needed)' : ''}: ${customer_name} (${formatKes(totals.total)})`,
    heading: recovered ? 'Recovered order (missed by the webhook)' : 'New paid order',
    rows: [
      ['Customer', customer_name],
      ['Email', customer_email],
      ['Phone', customer_phone],
      ['Company', metadata.company],
      ['Items', describeItems(metadata.items)],
      ['Discount', describeDiscount(totals)],
      ['Total', formatKes(totals.total)],
      // When an offer applied, when checkout priced it, so a payment that
      // only went through after the offer ended is easy to spot.
      ['Priced at', totals.offer && pricedAt ? formatEat(pricedAt) : null],
      ['Payment reference', reference],
      ['Referral code', referralNote],
      ...attributionRows(attribution),
      ['Meta', describeMetaResult('Purchase', metaResult)],
      ...(etimsRequested
        ? ([
            ['eTIMS invoice', 'REQUESTED'],
            ['KRA PIN', etimsPin],
            ['Registered business name', etimsName],
          ] as [string, string | null][])
        : []),
    ],
    note:
      [
        recovered
          ? "This order's webhook never landed (or landed too late) - it was recovered by the daily reconciliation check against Paystack. Worth double-checking nothing else about it looks off."
          : '',
        etimsRequested
          ? etimsProblem
            ? `eTIMS invoice requested, but the details look wrong (${etimsProblem}) Contact the customer to confirm their KRA PIN and business name before issuing the invoice.`
            : `eTIMS invoice requested: issue a tax invoice to KRA PIN ${etimsPin}, business name ${etimsName}.`
          : '',
      ]
        .filter(Boolean)
        .join(' ') || undefined,
    replyTo: customer_email,
  });

  await teamEmail;

  return { ok: true, created: true, orderId: order.id };
}
