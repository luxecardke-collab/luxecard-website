import type { IncomingMessage } from 'http';
import { getClientIp } from './rateLimit.js';
import type { MetaUser } from './metaCapi.js';

// Shared by the endpoints the browser calls to send an event's server copy
// (api/meta-event.ts, api/whatsapp-click.ts).

const clip = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

// The browser's event ID for this event, shared with its Pixel copy.
export const EVENT_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

// Meta's matching data available for an anonymous visitor: their browser
// and click IDs (only ever sent by the browser after they accepted
// cookies), IP address and browser.
export function visitorMetaUser(req: IncomingMessage, body: { fbp?: unknown; fbc?: unknown }): MetaUser {
  const ip = getClientIp(req);
  return {
    fbp: clip(body.fbp, 256),
    fbc: clip(body.fbc, 512),
    clientIpAddress: ip === 'unknown' ? null : clip(ip, 64),
    clientUserAgent: clip(req.headers['user-agent'], 512),
  };
}

// The page the event happened on, only if it's on this site.
export function sameSiteUrl(req: IncomingMessage, value: unknown): string | null {
  const url = clip(value, 500);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.host === req.headers.host ? url : null;
  } catch {
    return null;
  }
}
