import { findAffiliate, recordCommission } from './affiliateCommission.js';
import { attributionRows, isTestEnvironment, readAttribution } from './attribution.js';
import { formatEat, formatKes, sendTeamEmail, type AlertRow } from './email.js';
import { describeMetaResult, sendMetaEvent, type MetaResult } from './metaCapi.js';
import type { OrderSource, PaystackPayment, RecordOrderResult } from './orders.js';
import { getSupabaseAdmin } from './supabaseAdmin.js';

// A sale closed on WhatsApp and paid through a Paystack payment link (a
// Payment Page). The payment carries no cart, only what the team filled in
// on the link's custom fields:
//   "WhatsApp reference"  the customer's LC- code from their WhatsApp message
//   "Payment type"        Full / Deposit / Balance
//   "Referral code"       optional, an affiliate's code
// Recorded from the same three places as website orders (webhook,
// confirmation self-heal, nightly reconciliation); every payment is stored
// once (order_payments.paystack_reference is unique), so it never matters
// which of them sees it first, or how often.

export type PaymentType = 'full' | 'deposit' | 'balance';

// Meta's action_source for these Purchases. The visitor came from an ad to
// the website and tapped WhatsApp there; the sale is the end of that same
// website journey, matched by the click ID saved at the tap. Reported as a
// website event so it counts with the site's other purchases for the
// campaigns that optimise on them ('chat' would be the alternative).
const WHATSAPP_SALE_ACTION_SOURCE = 'website';

type CustomField = { display_name?: unknown; variable_name?: unknown; value?: unknown };

const fieldKey = (s: unknown) => (typeof s === 'string' ? s.toLowerCase().replace(/[^a-z0-9]/g, '') : '');

// A Payment Page custom field's value, by its name (either the display
// name or Paystack's variable name, ignoring case, spaces and underscores).
export function customField(metadata: unknown, names: string[]): string | null {
  const fields = metadata && typeof metadata === 'object' ? (metadata as { custom_fields?: unknown }).custom_fields : null;
  if (!Array.isArray(fields)) return null;
  const wanted = new Set(names.map(fieldKey));
  for (const f of fields as CustomField[]) {
    if (!f || typeof f !== 'object') continue;
    if (wanted.has(fieldKey(f.variable_name)) || wanted.has(fieldKey(f.display_name))) {
      const value = typeof f.value === 'string' ? f.value.trim() : typeof f.value === 'number' ? String(f.value) : '';
      if (value) return value.slice(0, 200);
    }
  }
  return null;
}

const REFERENCE_FIELD = ['WhatsApp reference', 'whatsapp_reference'];
const PAYMENT_TYPE_FIELD = ['Payment type', 'payment_type'];
const REFERRAL_FIELD = ['Referral code', 'referral_code'];

// True for a payment made through one of our WhatsApp payment links (it has
// our custom fields); any other Paystack payment without a cart is left
// alone, as before.
export function isPaymentLinkSale(metadata: unknown): boolean {
  return !!(customField(metadata, PAYMENT_TYPE_FIELD) || customField(metadata, REFERENCE_FIELD));
}

// "lc 4f2a7k", "LC4F2A7K", " Lc-4F2A7K " -> "LC-4F2A7K"; anything that
// can't be a code -> null.
export function normalizeRefCode(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.toUpperCase().replace(/\s+/g, '');
  const m = /^LC-?([A-Z0-9]{4,6})$/.exec(s);
  return m ? `LC-${m[1]}` : null;
}

export function parsePaymentType(raw: string | null): PaymentType | null {
  const s = (raw ?? '').trim().toLowerCase();
  return s === 'full' || s === 'deposit' || s === 'balance' ? s : null;
}

export async function recordPaymentLinkSale(
  reference: string,
  metadata: unknown,
  source: OrderSource,
  payment: PaystackPayment
): Promise<RecordOrderResult> {
  if (typeof payment.amount !== 'number' || payment.amount <= 0) {
    return { ok: false, error: 'Payment-link sale without an amount.' };
  }
  const supabase = getSupabaseAdmin();
  const isTest = isTestEnvironment();
  const amount = payment.amount / 100;
  const paidAtRaw = payment.paid_at ?? payment.paidAt ?? null;
  const paidAtMs = paidAtRaw ? Date.parse(paidAtRaw) : NaN;
  const paidAt = Number.isNaN(paidAtMs) ? null : new Date(paidAtMs).toISOString();

  // Already recorded (a redelivered webhook, or another of the three
  // callers got here first): nothing more to do, no second alert.
  const { data: seen } = await supabase.from('order_payments').select('id').eq('paystack_reference', reference).maybeSingle();
  if (seen) return { ok: true, created: false, orderId: null };

  const customer = payment.customer ?? {};
  const customerEmail = (customer.email ?? '').trim();
  const customerName =
    [customer.first_name, customer.last_name].filter((x) => typeof x === 'string' && x.trim()).join(' ').trim() ||
    customField(metadata, ['Full name', 'Name']) ||
    customerEmail ||
    'Unknown customer';
  const customerPhone = (customer.phone ?? customField(metadata, ['Phone', 'Phone number']) ?? '').trim();

  const rawCode = customField(metadata, REFERENCE_FIELD);
  const code = normalizeRefCode(rawCode);
  const typedType = parsePaymentType(customField(metadata, PAYMENT_TYPE_FIELD));
  const paymentType: PaymentType = typedType ?? 'full';

  // The visitor behind the code, with the ad they came from.
  const { data: ref } = code
    ? await supabase
        .from('whatsapp_refs')
        .select('code, cookie_consent, fbc, fbp, first_page, utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, referral_code')
        .eq('code', code)
        .maybeSingle()
    : { data: null };
  const attribution = readAttribution(ref ?? {});
  const referralCode = customField(metadata, REFERRAL_FIELD) ?? ref?.referral_code ?? null;
  const affiliate = await findAffiliate(supabase, referralCode);

  // A balance is recorded against the deposit's order (the latest deposit
  // for the same code); with no such order it's saved as its own order.
  let orderId: string | null = null;
  let attachedTo: { id: string; total: number } | null = null;
  if (paymentType === 'balance' && code) {
    const { data: deposit } = await supabase
      .from('orders')
      .select('id, total')
      .eq('order_source', 'whatsapp')
      .eq('whatsapp_ref', code)
      .eq('payment_type', 'deposit')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (deposit) attachedTo = { id: deposit.id, total: Number(deposit.total) };
  }

  if (attachedTo) {
    orderId = attachedTo.id;
  } else {
    const { data: order, error } = await supabase
      .from('orders')
      .upsert(
        {
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          items: [],
          subtotal: amount,
          discount_applied: false,
          total: amount,
          payment_status: 'paid',
          paystack_reference: reference,
          referral_code: affiliate ? referralCode : null,
          order_source: 'whatsapp',
          whatsapp_ref: ref ? code : null,
          payment_type: paymentType,
          ...attribution,
          ...(isTest ? { is_test: true } : {}),
        },
        { onConflict: 'paystack_reference', ignoreDuplicates: true }
      )
      .select('id')
      .maybeSingle();
    if (error) {
      console.error('Failed to record payment-link sale:', error);
      return { ok: false, error: 'Failed to record order.' };
    }
    if (!order) return { ok: true, created: false, orderId: null };
    orderId = order.id;
  }

  const { data: paymentRow, error: paymentError } = await supabase
    .from('order_payments')
    .upsert(
      { order_id: orderId, paystack_reference: reference, payment_type: paymentType, amount, paid_at: paidAt, ...(isTest ? { is_test: true } : {}) },
      { onConflict: 'paystack_reference', ignoreDuplicates: true }
    )
    .select('id')
    .maybeSingle();
  if (paymentError) {
    console.error('Failed to record payment:', paymentError);
    return { ok: false, error: 'Failed to record payment.' };
  }
  // A concurrent caller recorded this payment between the check above and
  // here: it sends the alert, not us.
  if (!paymentRow) return { ok: true, created: false, orderId };

  const newTotal = attachedTo ? attachedTo.total + amount : amount;
  if (attachedTo) {
    const { error } = await supabase.from('orders').update({ total: newTotal, subtotal: newTotal, payment_type: 'balance' }).eq('id', orderId);
    if (error) console.error('Failed to update the order total after a balance payment:', error);
  }

  const referralNote = await recordCommission(supabase, referralCode, affiliate, orderId, amount);

  // Meta: only a Full or Deposit payment is a Purchase (a balance completes
  // one already reported), and only for a visitor who accepted cookies on
  // the site when they tapped WhatsApp. Without that, nothing is sent:
  // no cookies, no hashed email/phone.
  let meta: MetaResult;
  if (!ref) {
    meta = { status: 'skipped', reason: 'No ad match: check the reference' };
  } else if (paymentType === 'balance') {
    meta = { status: 'skipped', reason: 'balance payment, the Purchase was counted with the deposit' };
  } else if (!ref.cookie_consent) {
    meta = { status: 'skipped', reason: "the visitor didn't accept cookies on the site, so nothing may be sent" };
  } else {
    meta = await sendMetaEvent({
      name: 'Purchase',
      eventId: reference,
      eventTime: Number.isNaN(paidAtMs) ? undefined : Math.floor(paidAtMs / 1000),
      actionSource: WHATSAPP_SALE_ACTION_SOURCE,
      eventSourceUrl: ref.first_page ? `https://www.luxecard.co.ke${ref.first_page}` : null,
      user: { email: customerEmail || null, phone: customerPhone || null, fbc: ref.fbc, fbp: ref.fbp },
      customData: { value: amount, currency: 'KES', order_source: 'whatsapp', payment_type: paymentType },
    });
  }
  const metaLine = describeMetaResult('Purchase', meta);
  if (!attachedTo) {
    const { error } = await supabase
      .from('orders')
      .update({ meta_status: meta.status === 'sent' ? `${metaLine} fbtrace_id ${meta.fbtraceId}` : metaLine })
      .eq('id', orderId);
    if (error) console.error('Failed to save the Meta outcome on the order:', error);
  }

  const typeLabel = { full: 'Full', deposit: 'Deposit', balance: 'Balance' }[paymentType];
  const noMatch = !ref;
  const balanceNote =
    paymentType === 'balance'
      ? attachedTo
        ? `Balance recorded against the deposit order for ${code}; order total now ${formatKes(newTotal)}.`
        : 'Balance payment with no matching deposit order for this reference: saved as its own order. Check the reference.'
      : '';
  const rows: AlertRow[] = [
    ['Customer', customerName],
    ['Email', customerEmail],
    ['Phone', customerPhone],
    ['Payment type', typedType ? typeLabel : `${typeLabel} (no payment type given, treated as Full)`],
    ['Amount paid', formatKes(amount)],
    ['Order total so far', paymentType === 'balance' ? formatKes(newTotal) : null],
    ['Paid at', paidAt ? formatEat(new Date(paidAt)) : null],
    ['WhatsApp reference', noMatch ? `No ad match: check the reference${rawCode ? ` (entered: "${rawCode}")` : ' (none entered)'}` : code],
    ['Payment reference', reference],
    ['Referral code', referralNote],
    ...attributionRows(attribution),
    ['Meta', metaLine],
  ];
  await sendTeamEmail({
    subject: `${isTest ? '[TEST] ' : ''}${source === 'cron' ? 'Recovered ' : 'New '}WhatsApp sale (${typeLabel}): ${customerName} (${formatKes(amount)})${noMatch ? ' - no ad match' : ''}`,
    heading: `WhatsApp sale: ${typeLabel} payment`,
    rows,
    note:
      [
        noMatch ? 'No ad match: check the reference. The order is saved, but it is not linked to an ad and nothing was sent to Meta.' : '',
        balanceNote,
        source === 'cron' ? "This payment's webhook never landed: it was recovered by the daily check against Paystack." : '',
      ]
        .filter(Boolean)
        .join(' ') || undefined,
    ...(customerEmail ? { replyTo: customerEmail } : {}),
  });

  return { ok: true, created: true, orderId };
}
