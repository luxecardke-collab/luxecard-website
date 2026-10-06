import { inject, type BeforeSendEvent } from '@vercel/analytics';

// Order references (Paystack's ?reference= on /order-confirmation) identify
// a customer's order, so they're stripped before a page view is recorded.
function withoutOrderReference(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  if (!url.searchParams.has('reference')) return event;
  url.searchParams.delete('reference');
  return { ...event, url: url.toString() };
}

/**
 * Vercel Web Analytics: page views on every page (each page is a full page
 * load). It's cookieless, so unlike the Meta Pixel it doesn't depend on the
 * cookie banner choice. The script is only added once the page has finished
 * loading and the browser is idle, so it never competes with the hero (its
 * shader, video or text) for the network or the main thread. Records
 * nothing outside a Vercel deployment's production/preview builds.
 */
export function initAnalytics() {
  const start = () => inject({ beforeSend: withoutOrderReference });
  const whenIdle = () => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(start, { timeout: 3000 });
    else setTimeout(start, 1);
  };
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
}
