import crypto from 'crypto';
import { productId } from './pricing.js';

// Meta Conversions API: the server-side copy of the site's events, sent only
// for visitors who accepted cookies (the browser tells us, per request).
// Each shares its event_id with the browser Pixel's copy of the same event,
// so Meta counts it once.
//
// Env: META_CAPI_TOKEN (server-only access token, never VITE_-prefixed) and
// the Pixel ID (META_PIXEL_ID, falling back to the browser's
// VITE_META_PIXEL_ID so only one ID has to be configured). Optional
// META_TEST_EVENT_CODE routes events to Events Manager > Test events; set
// it for the Preview environment only, never Production.
const GRAPH_API_VERSION = 'v26.0';
const TIMEOUT_MS = 4000;

export type MetaUser = {
  email?: string | null;
  phone?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

export type MetaEvent = {
  name: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase' | 'Contact';
  eventId: string;
  // Seconds since the epoch; defaults to now.
  eventTime?: number;
  eventSourceUrl?: string | null;
  user: MetaUser;
  customData?: Record<string, unknown>;
  // Meta's action_source; 'website' unless stated.
  actionSource?: 'website' | 'chat' | 'system_generated';
};

// What happened to one event: shown in team alerts, logged, and returned to
// the browser in test mode so it can be checked against Events Manager.
export type MetaResult =
  | { status: 'sent'; eventsReceived: number; fbtraceId: string | null; testMode: boolean }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string };

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

// Meta: trim + lowercase before hashing.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Meta: digits only, including the country code, no leading zeros or "+".
// Kenyan numbers are often typed locally (0712 345 678 or 712 345 678), so
// those get the 254 prefix.
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith('0')) return `254${digits.slice(1)}`;
  if (digits.length === 9 && /^[17]/.test(digits)) return `254${digits}`;
  return digits;
}

export const metaTestMode = () => !!process.env.META_TEST_EVENT_CODE;

function userData(user: MetaUser): Record<string, unknown> {
  const phone = user.phone ? normalizePhone(user.phone) : '';
  return {
    ...(user.email ? { em: [sha256(normalizeEmail(user.email))] } : {}),
    ...(phone ? { ph: [sha256(phone)] } : {}),
    ...(user.clientUserAgent ? { client_user_agent: user.clientUserAgent } : {}),
    ...(user.clientIpAddress ? { client_ip_address: user.clientIpAddress } : {}),
    ...(user.fbp ? { fbp: user.fbp } : {}),
    ...(user.fbc ? { fbc: user.fbc } : {}),
  };
}

// Never throws and never blocks for long: a failed or slow Meta call is
// logged and reported back, so it can't affect saving an order or a
// response. Every outcome is logged, including a missing token.
export async function sendMetaEvent(event: MetaEvent): Promise<MetaResult> {
  const token = process.env.META_CAPI_TOKEN;
  const pixelId = process.env.META_PIXEL_ID ?? process.env.VITE_META_PIXEL_ID;
  if (!token || !pixelId) {
    const reason = !token ? 'META_CAPI_TOKEN is not set' : 'no Pixel ID is set';
    console.warn(`Meta Conversions API: ${event.name} ${event.eventId} not sent: ${reason}.`);
    return { status: 'skipped', reason };
  }

  const testCode = process.env.META_TEST_EVENT_CODE;
  const body = {
    data: [
      {
        event_name: event.name,
        event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        action_source: event.actionSource ?? 'website',
        ...(event.eventSourceUrl ? { event_source_url: event.eventSourceUrl } : {}),
        user_data: userData(event.user),
        ...(event.customData ? { custom_data: event.customData } : {}),
      },
    ],
    ...(testCode ? { test_event_code: testCode } : {}),
    access_token: token,
  };

  // A plain timer (rather than AbortSignal.timeout, whose timer doesn't keep
  // the process alive on its own) so the cut-off always fires.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(pixelId)}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      // Meta's error body names the problem; it contains no customer data.
      const error = `HTTP ${res.status} ${text.slice(0, 300)}`;
      console.error(`Meta Conversions API rejected ${event.name} ${event.eventId}: ${error}`);
      return { status: 'failed', error };
    }
    let parsed: { events_received?: number; fbtrace_id?: string } = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep defaults
    }
    const result: MetaResult = {
      status: 'sent',
      eventsReceived: parsed.events_received ?? 0,
      fbtraceId: parsed.fbtrace_id ?? null,
      testMode: !!testCode,
    };
    console.info(
      `Meta Conversions API ${event.name} ${event.eventId}: events_received=${result.eventsReceived} fbtrace_id=${result.fbtraceId}${testCode ? ' (test event)' : ''}`
    );
    return result;
  } catch (err) {
    const reason = controller.signal.aborted ? controller.signal.reason : err;
    const error = reason instanceof Error ? reason.message : String(reason);
    console.error(`Meta Conversions API call failed for ${event.name} ${event.eventId}: ${error}`);
    return { status: 'failed', error };
  } finally {
    clearTimeout(timer);
  }
}

// One line for a team alert, e.g. "Purchase sent to Meta (events_received 1)".
export function describeMetaResult(name: string, result: MetaResult): string {
  if (result.status === 'sent') {
    return `${name} sent to Meta (events_received ${result.eventsReceived}${result.testMode ? ', test event' : ''})`;
  }
  if (result.status === 'skipped') return `${name} not sent to Meta: ${result.reason}`;
  return `${name} to Meta FAILED: ${result.error}`;
}

export type MetaPurchase = {
  reference: string;
  // The amount actually paid, in KES.
  value: number;
  // When the customer paid (seconds since the epoch), if known.
  eventTime?: number;
  email: string;
  phone: string;
  items: { name: string; quantity: number }[];
  eventSourceUrl?: string | null;
  clientUserAgent?: string | null;
  clientIpAddress?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

// The server-side Purchase. event_id is the Paystack reference, the same
// ID the confirmation page's browser Purchase uses.
export function sendMetaPurchase(purchase: MetaPurchase): Promise<MetaResult> {
  const contents = purchase.items.map((i) => ({ id: productId(i.name), quantity: i.quantity }));
  return sendMetaEvent({
    name: 'Purchase',
    eventId: purchase.reference,
    eventTime: purchase.eventTime,
    eventSourceUrl: purchase.eventSourceUrl,
    user: {
      email: purchase.email,
      phone: purchase.phone,
      clientUserAgent: purchase.clientUserAgent,
      clientIpAddress: purchase.clientIpAddress,
      fbp: purchase.fbp,
      fbc: purchase.fbc,
    },
    customData: {
      value: purchase.value,
      currency: 'KES',
      content_type: 'product',
      content_ids: [...new Set(contents.map((c) => c.id))],
      contents,
      num_items: purchase.items.reduce((n, i) => n + i.quantity, 0),
    },
  });
}
