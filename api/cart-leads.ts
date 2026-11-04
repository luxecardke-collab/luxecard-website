import type { IncomingMessage, ServerResponse } from 'http';
import { sendTeamEmail, describeDiscount, describeEmailResult, describeItems, formatEat, formatKes } from './_lib/email.js';
import { cleanString, isEmail, isHoneypotTripped, oneHourAgo, MAX_MESSAGE, MAX_SHORT } from './_lib/input.js';
import { readEtims } from './_lib/kra.js';
import { computeAuthoritativeTotals, MAX_ITEMS, type CheckoutItem, type ValidatedTotals } from './_lib/pricing.js';
import { getClientIp, isRateLimited } from './_lib/rateLimit.js';
import { makeQuotation, storeQuotation, QUOTATIONS_BUCKET } from './_lib/quotation.js';
import { formatCalendarDay } from './_lib/quotePdf.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { attributionRows, isTestEnvironment, readAttribution } from './_lib/attribution.js';

type CartLeadBody = {
  type?: unknown;
  fullName?: unknown;
  jobTitle?: unknown;
  company?: unknown;
  email?: unknown;
  phone?: unknown;
  items?: unknown;
  message?: unknown;
  needsEtims?: unknown;
  kraPin?: unknown;
  kraBusinessName?: unknown;
  // Business only: the cart's "Request a quote" link, sent with the same
  // details already captured on the order form (no separate form).
  quoteRequested?: unknown;
  // Landing page UTM parameters + fbclid (src/utils/attribution.ts).
  attribution?: unknown;
  hp?: unknown;
};

type VercelRequest = IncomingMessage & { body?: unknown };
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

const MAX_LEADS_PER_EMAIL_PER_HOUR = 10;
// Stops a bot spamming business submissions from burning the email quota
// and burying real enquiries; the lead is still saved, only the email skips.
const MAX_BUSINESS_ALERTS_PER_HOUR = 20;
// Alongside the per-email limit above: a scripted flood using a fresh fake
// email on every request would otherwise never trip that one at all (each
// new email starts with zero history). Generous enough that a shared
// office/mobile-carrier IP with several real customers adding to cart
// around the same time is never affected.
const MAX_ATTEMPTS_PER_IP_PER_HOUR = 30;
const HOUR_MS = 60 * 60 * 1000;

// Add-to-cart is never blocked by this route: the browser adds to the cart
// first and calls this fire-and-forget. A failed save is logged here, and a
// business submission still emails the team even if the save failed, since
// it carries a message that needs a reply. A quote request (quoteRequested)
// reuses this same endpoint and its rate limits, saved as its own fresh row
// (never an update to an earlier one, since the cart may have changed since)
// — the cart drawer calls this one directly and awaits the result instead.
// A quote request also gets a numbered PDF quotation (api/_lib/quotation.ts),
// attached to the team's alert and kept in the private "quotations" bucket;
// the team forwards it to the customer themselves.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body: CartLeadBody;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as CartLeadBody);
  } catch {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  // A bot filled the hidden field: pretend it worked and store nothing.
  if (isHoneypotTripped(body?.hp)) {
    res.status(200).json({ ok: true });
    return;
  }

  if (await isRateLimited('cart-leads', getClientIp(req), MAX_ATTEMPTS_PER_IP_PER_HOUR, HOUR_MS)) {
    res.status(429).json({ error: 'Too many submissions. Please try again later.' });
    return;
  }

  const type = body?.type === 'individual' || body?.type === 'business' ? body.type : null;
  const fullName = cleanString(body?.fullName, MAX_SHORT);
  const jobTitle = cleanString(body?.jobTitle, MAX_SHORT);
  const company = cleanString(body?.company, MAX_SHORT);
  const email = cleanString(body?.email, MAX_SHORT).toLowerCase();
  const phone = cleanString(body?.phone, 50);
  const message = cleanString(body?.message, MAX_MESSAGE);

  if (!type || !fullName || !phone || !isEmail(email)) {
    res.status(400).json({ error: 'Missing or invalid name, email, or phone.' });
    return;
  }

  // eTIMS details only exist on business submissions; anything sent with an
  // individual one (or without the box ticked) is discarded, not stored.
  const etimsResult =
    type === 'business' ? readEtims(body?.needsEtims, body?.kraPin, body?.kraBusinessName) : { etims: null };
  if ('error' in etimsResult) {
    res.status(400).json({ error: etimsResult.error });
    return;
  }
  const { etims } = etimsResult;

  // Where they came from (landing page UTM parameters + fbclid).
  const attribution = readAttribution(body?.attribution);
  const isTest = isTestEnvironment();

  // Only meaningful for a business submission; a spoofed flag on an
  // individual one is silently ignored, same as eTIMS above.
  const quoteRequested = type === 'business' && body?.quoteRequested === true;

  // A generous ceiling just to bound worst-case work before validation
  // even runs - the real limit (MAX_ITEMS) is enforced by
  // computeAuthoritativeTotals below, which now rejects an oversized or
  // over-quantity cart outright rather than this route silently clamping
  // it (the same shared check checkout.ts and the webhook rely on).
  const rawItems = Array.isArray(body?.items) ? body.items.slice(0, MAX_ITEMS * 10) : [];
  const items: CheckoutItem[] = rawItems.map((item: { name?: unknown; subOption?: unknown; quantity?: unknown }) => ({
    name: cleanString(item?.name, MAX_SHORT),
    subOption: cleanString(item?.subOption, MAX_SHORT) || undefined,
    quantity: typeof item?.quantity === 'number' ? item.quantity : 0,
  }));

  // At today's prices by the server's clock, including any offer on now.
  const requestedAt = new Date();
  let totals: ValidatedTotals;
  try {
    totals = computeAuthoritativeTotals(items, requestedAt);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid items.' });
    return;
  }

  let saved = false;
  let savedId: string | null = null;
  let sendAlert = type === 'business';
  let supabase: ReturnType<typeof getSupabaseAdmin> | null = null;

  try {
    supabase = getSupabaseAdmin();
    const since = oneHourAgo();

    const { count: fromThisEmail } = await supabase
      .from('cart_leads')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', since);
    if ((fromThisEmail ?? 0) >= MAX_LEADS_PER_EMAIL_PER_HOUR) {
      res.status(429).json({ error: 'Too many submissions. Please try again later.' });
      return;
    }

    if (type === 'business') {
      const { count: recentBusiness } = await supabase
        .from('cart_leads')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'business')
        .gte('created_at', since);
      if ((recentBusiness ?? 0) >= MAX_BUSINESS_ALERTS_PER_HOUR) {
        console.error('Business alert email skipped: hourly alert limit reached.');
        sendAlert = false;
      }
    }

    const { data, error } = await supabase.from('cart_leads').insert({
      type,
      full_name: fullName,
      job_title: jobTitle || null,
      company: company || null,
      email,
      phone,
      items,
      total: totals.total,
      message: message || null,
      ...attribution,
      ...(isTest ? { is_test: true } : {}),
      // Only sent when requested, so ordinary leads don't depend on these columns.
      ...(etims ? { needs_etims: true, kra_pin: etims.kraPin, kra_business_name: etims.businessName } : {}),
      ...(quoteRequested ? { quote_requested: true, quote_requested_at: requestedAt.toISOString() } : {}),
    }).select('id').single();
    if (error) {
      console.error('Failed to save cart lead:', error);
    } else {
      saved = true;
      savedId = data.id;
    }
  } catch (err) {
    console.error('Failed to save cart lead:', err);
  }

  // The PDF quotation, made even when the alert itself is skipped, so it's
  // always in the bucket.
  const preparedFor = company || fullName;
  const quotation = quoteRequested
    ? await makeQuotation(supabase, { quotedAt: requestedAt, isTest, preparedFor, items, totals })
    : null;
  const stored = quotation?.pdf && quotation.quoteNumber ? await storeQuotation(supabase, quotation.quoteNumber, quotation.pdf.bytes) : null;
  const quoteNote = !quotation
    ? ''
    : quotation.pdf
      ? `The PDF quotation ${quotation.quoteNumber} is attached: check it, then forward it to the customer at ${email}.` +
        (stored && 'path' in stored
          ? ` A copy is saved in Supabase Storage (${QUOTATIONS_BUCKET}/${stored.path}).`
          : ` It could NOT be saved to Supabase Storage (${stored && 'error' in stored ? stored.error : 'unknown error'}), so this email has the only copy.`)
      : `The PDF quotation could NOT be generated (${quotation.pdfError}), so none is attached: send them a written quotation for the items and total above.`;

  let alertStatus = 'skipped: hourly alert limit reached';
  if (sendAlert) {
    const alert = await sendTeamEmail({
      subject: (isTest ? '[TEST] ' : '') + (quoteRequested
        ? `Quotation requested: ${company || fullName}${etims ? ' (eTIMS invoice requested)' : ''}`
        : `New business enquiry${etims ? ' (eTIMS invoice requested)' : ''}: ${company || fullName}`),
      heading: quoteRequested ? 'Quotation requested' : 'New business enquiry (items added to cart)',
      rows: [
        ['Organization', company],
        ['Contact', fullName],
        ['Email', email],
        ['Phone', phone],
        ['Items', describeItems(items)],
        ['Discount', describeDiscount(totals)],
        ['Total', formatKes(totals.total)],
        ['Message', message],
        ...(quotation
          ? ([
              ['Quote number', quotation.quoteNumber],
              ['Valid until', formatCalendarDay(quotation.validUntil)],
            ] as [string, string | null][])
          : []),
        ...attributionRows(attribution),
        ...(etims
          ? ([
              ['eTIMS invoice', 'REQUESTED'],
              ['KRA PIN', etims.kraPin],
              ['Registered business name', etims.businessName],
            ] as [string, string][])
          : []),
      ],
      note:
        [
          quoteNote,
          // The offer price is only good until the offer ends; checkout
          // charges whatever applies when they actually pay.
          totals.offer
            ? `The total includes ${totals.offer.name} pricing, which ends ${formatEat(new Date(Date.parse(totals.offer.endsAt) - 60_000))}.`
            : '',
          etims ? `eTIMS invoice requested with this enquiry: issue a tax invoice to KRA PIN ${etims.kraPin}, business name ${etims.businessName} once they pay.` : '',
          saved ? '' : `This ${quoteRequested ? 'quote request' : 'enquiry'} could NOT be saved to Supabase, so this email is the only record of it.`,
        ]
          .filter(Boolean)
          .join(' ') || undefined,
      // A quote request must not let a reply reach the customer directly
      // (same reasoning as the affiliate signup fix); the ordinary
      // enquiry keeps replyTo so the team can reply straight to them.
      ...(quoteRequested ? {} : { replyTo: email }),
      ...(quotation?.pdf ? { attachments: [{ filename: quotation.pdf.fileName, content: quotation.pdf.bytes }] } : {}),
    });
    alertStatus = `${describeEmailResult(alert)}, ${quotation?.pdf ? `with ${quotation.pdf.fileName}` : 'no PDF attached'}`;
  }

  // Links the quotation to its request: the number, where its PDF is, and
  // what happened to the alert.
  if (quotation && savedId && supabase) {
    const { error } = await supabase
      .from('cart_leads')
      .update({
        quote_number: quotation.quoteNumber,
        quote_pdf_path: stored && 'path' in stored ? `${QUOTATIONS_BUCKET}/${stored.path}` : null,
        quote_alert: alertStatus.slice(0, 500),
      })
      .eq('id', savedId);
    if (error) console.error(`Quote request ${savedId}: couldn't record its quotation:`, error);
  }

  if (!saved) {
    res.status(500).json({ error: 'Could not save.' });
    return;
  }
  res.status(200).json({ ok: true });
}
