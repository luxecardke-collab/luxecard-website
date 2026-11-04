import { fetchWithTimeout } from './http.js';
import { BULK_DISCOUNT_RATE, type CartTotals, type CheckoutItem } from './pricing.js';

// Where replies to an alert go by default. Ready for when ALERT_FROM_EMAIL
// switches to a no-reply style address on the LuxeCard domain.
const DEFAULT_REPLY_TO = 'luxecardke@gmail.com';
// Used until a domain is verified in Resend (it only delivers to the
// Resend account owner's own address from this sender).
const FALLBACK_FROM = 'LuxeCard <onboarding@resend.dev>';
const SEND_TIMEOUT_MS = 5000;
// An email carrying a file uploads more, so it gets longer.
const SEND_WITH_ATTACHMENT_TIMEOUT_MS = 10000;

export type AlertRow = [label: string, value: string | number | null | undefined];

export type TeamEmail = {
  subject: string;
  heading: string;
  rows: AlertRow[];
  note?: string;
  // Overrides the default reply-to (e.g. the customer's own address).
  replyTo?: string;
  // Files attached to the email (e.g. a quote request's PDF quotation).
  attachments?: { filename: string; content: Uint8Array }[];
  // Also send a copy to the sales team (SALES_ALERT_EMAIL), as its own
  // email. Only for alerts that aren't about payments or paid orders:
  // those stay with ORDER_ALERT_EMAIL alone. `{ rows }` gives the sales
  // copy different rows (e.g. without an order's amount and status).
  salesCopy?: true | { rows: AlertRow[] };
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Header values must stay on one line.
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
}

export function describeItems(items: CheckoutItem[]): string {
  return items
    .map((item) => `${item.name}${item.subOption ? ` (${item.subOption})` : ''} x${item.quantity}`)
    .join('\n');
}

export function formatKes(value: number): string {
  return `KES ${value.toLocaleString('en-US')}`;
}

// The discount line for an alert, e.g. "Customer Service Week 10% off
// (-KES 2,800)", or null when no discount applied.
export function describeDiscount(totals: CartTotals): string | null {
  if (totals.discountType === 'offer' && totals.offer) {
    return `${totals.offer.name} ${Math.round(totals.offer.rate * 100)}% off (-${formatKes(totals.discount)})`;
  }
  if (totals.discountType === 'bulk') {
    return `Bulk ${Math.round(BULK_DISCOUNT_RATE * 100)}% off 4+ cards (-${formatKes(totals.discount)})`;
  }
  return null;
}

// e.g. "Sun 11 Oct 2026, 23:58 EAT".
export function formatEat(date: Date): string {
  return `${new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)} EAT`;
}

function render(email: TeamEmail) {
  const rows = email.rows.filter(([, value]) => value !== null && value !== undefined && String(value) !== '');

  const text = [
    email.heading,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ...(email.note ? ['', email.note] : []),
  ].join('\n');

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#666;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>` +
        `<td style="padding:6px 0;vertical-align:top;white-space:pre-wrap">${escapeHtml(String(value))}</td></tr>`
    )
    .join('');
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111">` +
    `<h2 style="margin:0 0 16px;font-size:18px">${escapeHtml(email.heading)}</h2>` +
    `<table style="border-collapse:collapse">${htmlRows}</table>` +
    (email.note ? `<p style="margin:20px 0 0;padding:12px;background:#fff8d6;border-radius:6px">${escapeHtml(email.note)}</p>` : '') +
    `</div>`;

  return { text, html };
}

// What happened to an alert: Resend accepted it (with its email id), or why
// it didn't go. Callers that need a record of it (api/profile-details.ts)
// store this; the others can ignore it.
export type EmailResult = { status: 'sent'; id: string | null; to: string[] } | { status: 'failed'; reason: string };

// One line for a record, e.g. "sent (Resend id …)" or "failed: <reason>".
export function describeEmailResult(result: EmailResult): string {
  return result.status === 'sent' ? `sent (Resend id ${result.id ?? 'unknown'})` : `failed: ${result.reason}`.slice(0, 500);
}

// Comma-separated addresses from an environment variable.
function addresses(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);
}

// Sends an alert to the team through Resend. Never throws and never blocks
// for long: an alert failing must not break saving an order, lead or signup,
// so every problem is logged (and returned) instead.
//
// The result is the main alert's (to ORDER_ALERT_EMAIL). A sales copy
// (email.salesCopy) goes as a separate email to SALES_ALERT_EMAIL, so
// Resend refusing or failing it can never stop the main one; its problems
// are only logged. Without SALES_ALERT_EMAIL set, no copy is sent.
export async function sendTeamEmail(email: TeamEmail): Promise<EmailResult> {
  const to = addresses(process.env.ORDER_ALERT_EMAIL);
  // Addresses already getting the main alert don't get a second copy.
  const mainSet = new Set(to.map((address) => address.toLowerCase()));
  const salesTo = email.salesCopy
    ? addresses(process.env.SALES_ALERT_EMAIL).filter((address) => !mainSet.has(address.toLowerCase()))
    : [];

  const [main] = await Promise.all([
    deliver(email, to, 'ORDER_ALERT_EMAIL'),
    salesTo.length
      ? deliver(typeof email.salesCopy === 'object' ? { ...email, rows: email.salesCopy.rows } : email, salesTo, 'SALES_ALERT_EMAIL').then(
          (result) => {
            if (result.status === 'failed') console.error(`Sales copy of the alert not sent: ${result.reason}`);
          }
        )
      : null,
  ]);
  return main;
}

async function deliver(email: TeamEmail, to: string[], toVariable: string): Promise<EmailResult> {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey || to.length === 0) {
      const missing = [!apiKey && 'RESEND_API_KEY', to.length === 0 && toVariable].filter(Boolean).join(' and ');
      const reason = `${missing} not set in this environment (${process.env.VERCEL_ENV ?? 'local'})`;
      console.error(`Alert email skipped: ${reason}.`);
      return { status: 'failed', reason };
    }
    const replyTo =
      email.replyTo && EMAIL_PATTERN.test(email.replyTo.trim())
        ? email.replyTo.trim()
        : process.env.ALERT_REPLY_TO || DEFAULT_REPLY_TO;
    const { text, html } = render(email);

    const res = await fetchWithTimeout('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.ALERT_FROM_EMAIL || FALLBACK_FROM,
        to,
        reply_to: replyTo,
        subject: oneLine(email.subject),
        text,
        html,
        ...(email.attachments?.length
          ? {
              attachments: email.attachments.map((file) => ({
                filename: file.filename,
                content: Buffer.from(file.content).toString('base64'),
              })),
            }
          : {}),
      }),
    }, email.attachments?.length ? SEND_WITH_ATTACHMENT_TIMEOUT_MS : SEND_TIMEOUT_MS);

    const body = await res.text().catch(() => '');
    if (!res.ok) {
      console.error('Resend rejected the alert email:', res.status, body);
      return { status: 'failed', reason: `Resend refused it (HTTP ${res.status}): ${body.slice(0, 300)}` };
    }
    let id: string | null = null;
    try {
      id = (JSON.parse(body) as { id?: string }).id ?? null;
    } catch {
      // accepted; keep the id unknown
    }
    return { status: 'sent', id, to };
  } catch (err) {
    console.error('Failed to send alert email:', err);
    return { status: 'failed', reason: err instanceof Error ? err.message : String(err) };
  }
}
