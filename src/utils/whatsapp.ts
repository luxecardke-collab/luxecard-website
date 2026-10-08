import type { MouseEvent } from 'react';
import { LINKS } from '../data/links';
import { getAttribution } from './attribution';
import { getMetaIds, metaTrackingAllowed, newMetaEventId, sendServerCopy, trackMetaEvent } from './metaPixel';
import { getReferralCode } from './referralCode';

// Every WhatsApp button: its pre-filled message, and the button/section
// labels its taps are recorded under (Meta "Contact" event, and the
// whatsapp_clicks table).
export type WhatsAppSource = { button: string; section: string; message: string };

export const WHATSAPP_SOURCES = {
  floating: {
    button: 'floating-button',
    section: 'site-wide',
    message: "Hi LuxeCard, I'd like to know more about getting a LuxeCard.",
  },
  floatingAffiliate: {
    button: 'floating-button',
    section: 'affiliate-page',
    message: 'Hi LuxeCard, I have a question about the affiliate program.',
  },
  finalCta: {
    button: 'talk-to-us',
    section: 'final-cta',
    message: "Hi LuxeCard, I'm ready to order my LuxeCard. Can you help me get started?",
  },
  forBusiness: {
    button: 'talk-to-luxecard',
    section: 'for-business',
    message: "Hi LuxeCard, I'd like LuxeCards for my team. Can we talk about a business order?",
  },
  contactSection: { button: 'whatsapp', section: 'contact-section', message: 'Hi LuxeCard, I have a question.' },
  contactPopup: { button: 'whatsapp', section: 'contact-popup', message: 'Hi LuxeCard, I have a question.' },
  footer: { button: 'contact', section: 'footer', message: "Hi LuxeCard, I'd like to get in touch." },
  faq: { button: 'contact-us', section: 'faq', message: "Hi LuxeCard, I have a question that isn't in your FAQ." },
} satisfies Record<string, WhatsAppSource>;

// The visitor's reference code, "LC-" + 6 characters from an alphabet with
// no look-alikes (no 0/O, 1/I). Made on their first WhatsApp tap and reused
// on every later one (it's kept in this browser), so one code ties all of a
// visitor's WhatsApp chats to where they came from. Separate from affiliate
// referral codes.
const REF_KEY = 'luxecard_whatsapp_ref';
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function visitorWhatsAppRef(): string {
  try {
    const existing = localStorage.getItem(REF_KEY);
    if (existing && /^LC-[A-HJ-NP-Z2-9]{4,6}$/.test(existing)) return existing;
  } catch {
    // fall through to a fresh code
  }
  const random = crypto.getRandomValues(new Uint32Array(6));
  const code = `LC-${Array.from(random, (n) => REF_ALPHABET[n % REF_ALPHABET.length]).join('')}`;
  try {
    localStorage.setItem(REF_KEY, code);
  } catch {
    // storage unavailable: the code still goes on this message
  }
  return code;
}

export function whatsappHref(message: string, code?: string): string {
  const text = code ? `${message} (Ref: ${code})` : message;
  return `https://wa.me/${LINKS.WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

// Records a tap: the code, button and section (and where the visitor came
// from) go to /api/whatsapp-click; for visitors who accepted cookies, Meta's
// "Contact" event fires in the browser and, with the same event ID, from
// the server. Never delays WhatsApp opening.
function recordTap(code: string, source: WhatsAppSource) {
  const consent = metaTrackingAllowed();
  const eventId = newMetaEventId();
  if (consent) trackMetaEvent('Contact', { content_name: source.button, content_category: source.section }, eventId);
  sendServerCopy('/api/whatsapp-click', {
    code,
    button: source.button,
    section: source.section,
    page: window.location.pathname,
    event_id: eventId,
    consent,
    ...(consent ? getMetaIds() : {}),
    source_url: window.location.href,
    attribution: getAttribution(),
    // An affiliate's code (?ref=), so a WhatsApp sale can still earn it.
    referral_code: getReferralCode(),
  });
}

/**
 * Props for a WhatsApp <a>. The href rendered (and prerendered) is the
 * plain message; the visitor's reference code is added at the moment they
 * tap, just before the browser follows the link.
 */
export function whatsappLinkProps(source: WhatsAppSource, { newTab = true } = {}) {
  return {
    href: whatsappHref(source.message),
    ...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
    onClick: (e: MouseEvent<HTMLAnchorElement>) => {
      const code = visitorWhatsAppRef();
      e.currentTarget.href = whatsappHref(source.message, code);
      recordTap(code, source);
    },
  };
}
