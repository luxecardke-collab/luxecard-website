import { OFFERS, type Offer } from '../../api/_lib/pricing';

// The offer a page was served with. Each card page is built twice: as it is
// with no offer, and with each offer that hadn't ended at build time
// (scripts/prerender.mjs, `<html data-offer="…">`). middleware.ts serves the
// one that applies by the server's clock, so the page's HTML itself shows the
// offer exactly while it's on, and drops it the moment it ends, without a
// redeploy. Until the page has read the server's time (utils/serverClock),
// it prices from this; afterwards from the server's time.

let prerenderOfferId: string | null = null;

/** Used by the build (entry-server.tsx) while rendering an offer's version. */
export function setPrerenderOffer(id: string | null): void {
  prerenderOfferId = id;
}

export function firstPaintOffer(): Offer | null {
  const id = typeof document === 'undefined' ? prerenderOfferId : document.documentElement.getAttribute('data-offer');
  return OFFERS.find((o) => o.id === id) ?? null;
}
