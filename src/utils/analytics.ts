import { inject, type BeforeSendEvent } from '@vercel/analytics';
import { afterPageLoad } from './afterPageLoad';

// Order references (Paystack's ?reference= on /order-confirmation, and the
// ?ref= on /details, an order or WhatsApp reference) identify a customer, so
// they're stripped before a page view is recorded.
function withoutOrderReference(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  const onDetails = url.pathname.replace(/\/+$/, '') === '/details' && url.searchParams.has('ref');
  if (!url.searchParams.has('reference') && !onDetails) return event;
  url.searchParams.delete('reference');
  if (onDetails) url.searchParams.delete('ref');
  return { ...event, url: url.toString() };
}

/**
 * Vercel Web Analytics: page views on every page (each page is a full page
 * load). It's cookieless, so unlike the Meta Pixel it doesn't depend on the
 * cookie banner choice. The script is only added once the page has finished
 * loading and the browser is idle (afterPageLoad). Records
 * nothing outside a Vercel deployment's production/preview builds.
 */
export function initAnalytics() {
  afterPageLoad(() => inject({ beforeSend: withoutOrderReference }));
}
