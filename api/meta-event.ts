import type { IncomingMessage, ServerResponse } from 'http';
import { isEmail } from './_lib/input.js';
import { metaTestMode, sendMetaEvent, type MetaEvent } from './_lib/metaCapi.js';
import { EVENT_ID_PATTERN, sameSiteUrl, visitorMetaUser } from './_lib/metaRequest.js';
import { PRODUCT_IDS_BY_LABEL } from './_lib/pricing.js';
import { getClientIp, isRateLimited } from './_lib/rateLimit.js';

type VercelRequest = IncomingMessage & { body?: unknown };
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

// The server (Conversions API) copy of the site's shopping events, sent by
// the browser alongside its own Pixel copy with the same event_id, so Meta
// counts each once. Only ever called, and only ever forwards anything,
// for visitors who accepted cookies. Purchase isn't here: it's sent when
// the payment is recorded (api/_lib/orders.ts), and Contact by
// api/whatsapp-click.ts.
const EVENTS = new Set(['ViewContent', 'AddToCart', 'InitiateCheckout']);
const PRODUCT_IDS = new Set(Object.values(PRODUCT_IDS_BY_LABEL));
const MAX_PER_IP = 200;
const WINDOW_MS = 10 * 60 * 1000;

const num = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : undefined);

// Only the fields Meta's standard events use, with sane values.
function cleanCustomData(input: unknown): Record<string, unknown> {
  const d = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const contents = Array.isArray(d.contents)
    ? d.contents
        .slice(0, 20)
        .map((c) => (c && typeof c === 'object' ? (c as Record<string, unknown>) : {}))
        .filter((c) => typeof c.id === 'string' && PRODUCT_IDS.has(c.id))
        .map((c) => ({
          id: c.id as string,
          quantity: Number.isInteger(c.quantity) ? Math.min(c.quantity as number, 10000) : 1,
          ...(num(c.item_price, 1e6) !== undefined ? { item_price: c.item_price } : {}),
        }))
    : undefined;
  const contentIds = Array.isArray(d.content_ids)
    ? d.content_ids.filter((id): id is string => typeof id === 'string' && PRODUCT_IDS.has(id)).slice(0, 10)
    : undefined;
  return {
    ...(num(d.value, 1e8) !== undefined ? { value: d.value } : {}),
    currency: 'KES',
    content_type: 'product',
    ...(typeof d.content_name === 'string' ? { content_name: d.content_name.slice(0, 100) } : {}),
    ...(contentIds?.length ? { content_ids: contentIds } : {}),
    ...(contents?.length ? { contents } : {}),
    ...(Number.isInteger(d.num_items) ? { num_items: Math.min(d.num_items as number, 1e6) } : {}),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  let body: Record<string, unknown>;
  try {
    body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as Record<string, unknown>;
  } catch {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }
  if (!body || body.consent !== true) {
    // Never forwards anything without the visitor's consent.
    res.status(200).json({ ok: true, sent: false });
    return;
  }
  const name = body.event_name;
  const eventId = body.event_id;
  if (typeof name !== 'string' || !EVENTS.has(name) || typeof eventId !== 'string' || !EVENT_ID_PATTERN.test(eventId)) {
    res.status(400).json({ error: 'Invalid event.' });
    return;
  }
  if (await isRateLimited('meta-event', getClientIp(req), MAX_PER_IP, WINDOW_MS)) {
    res.status(429).json({ error: 'Too many requests.' });
    return;
  }

  // AddToCart/InitiateCheckout happen after the order form, so the
  // customer's own email and phone (hashed before sending) improve matching.
  const userInput = body.user && typeof body.user === 'object' ? (body.user as Record<string, unknown>) : {};
  const email = typeof userInput.email === 'string' && isEmail(userInput.email.trim()) ? userInput.email.trim() : null;
  const phone = typeof userInput.phone === 'string' ? userInput.phone.trim().slice(0, 50) : null;

  const event: MetaEvent = {
    name: name as MetaEvent['name'],
    eventId,
    eventSourceUrl: sameSiteUrl(req, body.source_url),
    user: { ...visitorMetaUser(req, body), email, phone },
    customData: cleanCustomData(body.custom_data),
  };
  const result = await sendMetaEvent(event);
  // Meta's answer is only returned while testing (Preview), to check
  // against Events Manager > Test events.
  res.status(200).json(metaTestMode() ? { ok: true, meta: result } : { ok: true });
}
