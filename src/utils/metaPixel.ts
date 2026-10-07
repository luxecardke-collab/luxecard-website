import { fbcFromVisit } from './attribution';
import { hasAdConsent, onConsentChange } from './consent';

// Meta Pixel, loaded only when VITE_META_PIXEL_ID is set AND the visitor has
// accepted cookies. Until then nothing is fetched from Meta and every
// trackMetaEvent call is a no-op. Server-side purchases go through the
// Conversions API instead (api/_lib/metaCapi.ts), deduplicated against the
// browser's Purchase by sharing the Paystack reference as the event ID.
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

// With no Pixel ID configured the site sets no advertising cookies, so there
// is nothing to ask consent for: the banner and the footer's Cookie settings
// link are hidden too.
export const META_PIXEL_ENABLED = !!PIXEL_ID;

let loaded = false;

// Meta's standard base code (the fbq stub that queues calls until
// fbevents.js arrives), written out rather than pasted as an inline script.
function installBaseCode() {
  if (window.fbq) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
}

function loadPixel() {
  if (!PIXEL_ID || loaded) return;
  // Visitors who arrived from an ad but only accept cookies on a later page
  // no longer have the fbclid in the URL for the Pixel to pick up, so its
  // click cookie is set from this visit's fbclid (kept first-party since
  // landing) before the Pixel starts.
  const visitFbc = fbcFromVisit();
  if (visitFbc && !readCookie('_fbc')) {
    document.cookie = `_fbc=${encodeURIComponent(visitFbc)}; Max-Age=${90 * 24 * 60 * 60}; path=/; SameSite=Lax`;
  }
  installBaseCode();
  window.fbq?.('init', PIXEL_ID);
  // Every page on this site is a full page load, so one PageView per load
  // (or on accepting, for the page the visitor is on) covers every page.
  window.fbq?.('track', 'PageView');
  loaded = true;
}

// Meta's first-party cookies. Removed when consent is withdrawn.
const META_COOKIES = ['_fbp', '_fbc'];

function deleteMetaCookies() {
  const parts = window.location.hostname.split('.');
  // Try the host and each parent domain (e.g. www.luxecard.co.ke, .luxecard.co.ke).
  const domains = ['', ...parts.map((_, i) => parts.slice(i).join('.')).filter((d) => d.includes('.'))];
  for (const name of META_COOKIES) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
    }
  }
}

export function initMetaPixel() {
  if (!PIXEL_ID) return;
  if (hasAdConsent()) loadPixel();
  onConsentChange((choice) => {
    if (choice === 'accepted') {
      if (loaded) window.fbq?.('consent', 'grant');
      else loadPixel();
    } else {
      // The script can't be unloaded, but Meta stops sending once consent is
      // revoked, trackMetaEvent stops calling it, and its cookies are cleared.
      if (loaded) window.fbq?.('consent', 'revoke');
      deleteMetaCookies();
    }
  });
}

export function trackMetaEvent(name: string, params?: Record<string, unknown>, eventId?: string) {
  if (!loaded || !hasAdConsent()) return;
  if (eventId) window.fbq?.('track', name, params ?? {}, { eventID: eventId });
  else window.fbq?.('track', name, params ?? {});
}

// Meta tracking is allowed right now: the Pixel is configured and the
// visitor has accepted cookies.
export function metaTrackingAllowed(): boolean {
  return loaded && hasAdConsent();
}

// A fresh ID shared by an event's browser (Pixel) and server (Conversions
// API) copies, so Meta counts it once.
export function newMetaEventId(): string {
  return crypto.randomUUID();
}

// Meta's browser and click IDs for server-side copies of events.
export function getMetaIds(): { fbp: string | null; fbc: string | null } {
  return { fbp: readCookie('_fbp'), fbc: readCookie('_fbc') ?? fbcFromVisit() };
}

/**
 * Fires a shopping event in the browser (Pixel) and sends the same event,
 * with the same event ID, to the Conversions API via /api/meta-event. Does
 * nothing at all without cookie consent. `user` (email/phone from the
 * order form) is only sent to our own server, which hashes it for Meta.
 */
export function trackMetaEventWithServer(
  name: 'ViewContent' | 'AddToCart' | 'InitiateCheckout',
  params: Record<string, unknown>,
  user?: { email?: string; phone?: string }
) {
  if (!metaTrackingAllowed()) return;
  const eventId = newMetaEventId();
  trackMetaEvent(name, params, eventId);
  sendServerCopy('/api/meta-event', {
    event_name: name,
    event_id: eventId,
    consent: true,
    ...getMetaIds(),
    source_url: window.location.href,
    custom_data: params,
    ...(user ? { user } : {}),
  });
}

// keepalive so the request survives the page navigating away (to checkout,
// or to WhatsApp). While testing (Preview), the server answers with Meta's
// response, which is logged here to compare with Events Manager.
export function sendServerCopy(url: string, body: Record<string, unknown>) {
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data?.meta) console.info(`[Meta Conversions API] ${String(body.event_name ?? 'Contact')} ${String(body.event_id)}:`, data.meta);
    })
    .catch(() => {});
}

const SENT_PURCHASES_KEY = 'luxecard_meta_purchases_sent';

// Browser half of the Purchase event. The Paystack reference is the event ID,
// matching the server's Conversions API event so Meta counts it once, and a
// small local list stops a reload of the confirmation page re-sending it.
export function trackMetaPurchase(reference: string, value: number, contents: { id: string; quantity: number }[] = []) {
  if (!loaded || !hasAdConsent()) return;
  let sent: string[] = [];
  try {
    sent = JSON.parse(localStorage.getItem(SENT_PURCHASES_KEY) ?? '[]');
    if (!Array.isArray(sent)) sent = [];
  } catch {
    sent = [];
  }
  if (sent.includes(reference)) return;
  trackMetaEvent(
    'Purchase',
    {
      value,
      currency: 'KES',
      content_type: 'product',
      content_ids: [...new Set(contents.map((c) => c.id))],
      contents,
      num_items: contents.reduce((n, c) => n + c.quantity, 0),
    },
    reference
  );
  try {
    localStorage.setItem(SENT_PURCHASES_KEY, JSON.stringify([...sent, reference].slice(-20)));
  } catch {
    // ignore unavailable storage
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

// Consent flag plus Meta's browser/click IDs, sent with the checkout request
// so the server-side Purchase can be matched to this visitor. Returns null
// when the visitor hasn't accepted, in which case no server event is sent.
export function getMetaCheckoutTracking(): { consent: true; fbp: string | null; fbc: string | null } | null {
  if (!PIXEL_ID || !hasAdConsent()) return null;
  return { consent: true, ...getMetaIds() };
}
