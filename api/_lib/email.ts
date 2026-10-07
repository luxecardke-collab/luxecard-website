import { BULK_DISCOUNT_RATE, type CartTotals, type CheckoutItem } from './pricing.js';

// Where replies to an alert go by default. Ready for when ALERT_FROM_EMAIL
// switches to a no-reply style address on the LuxeCard domain.
const DEFAULT_REPLY_TO = 'luxecardke@gmail.com';
// Used until a domain is verified in Resend (it only delivers to the
// Resend account owner's own address from this sender).
const FALLBACK_FROM = 'LuxeCard <onboarding@resend.dev>';
const SEND_TIMEOUT_MS = 5000;

export type AlertRow = [label: string, value: string | number | null | undefined];

export type TeamEmail = {
  subject: string;
  heading: string;
  rows: AlertRow[];
  note?: string;
  // Overrides the default reply-to (e.g. the customer's own address).
  replyTo?: string;
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

// Sends an alert to the team through Resend. Never throws and never blocks
// for long: an alert failing must not break saving an order, lead or signup,
// so every problem is logged and swallowed.
export async function sendTeamEmail(email: TeamEmail): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const to = (process.env.ORDER_ALERT_EMAIL ?? '')
      .split(',')
      .map((address) => address.trim())
      .filter(Boolean);

    if (!apiKey || to.length === 0) {
      console.error('Alert email skipped: RESEND_API_KEY or ORDER_ALERT_EMAIL is not set.');
      return;
    }

    const replyTo =
      email.replyTo && EMAIL_PATTERN.test(email.replyTo.trim())
        ? email.replyTo.trim()
        : process.env.ALERT_REPLY_TO || DEFAULT_REPLY_TO;
    const { text, html } = render(email);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.ALERT_FROM_EMAIL || FALLBACK_FROM,
        to,
        reply_to: replyTo,
        subject: oneLine(email.subject),
        text,
        html,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error('Resend rejected the alert email:', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.error('Failed to send alert email:', err);
  }
}
