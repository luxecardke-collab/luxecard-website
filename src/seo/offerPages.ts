import { OFFERS } from '../../api/_lib/pricing';

// Each card page is also built with each offer that hadn't ended when the
// site was built, at /_offer/<offer id>/<page> (scripts/prerender.mjs);
// middleware.ts serves that version at the page's own address while the
// offer is on by the server's clock. An offer that had already ended gets
// no version, so its price and badge are nowhere in the built pages.
export const OFFER_PAGE_OFFERS = OFFERS.filter((o) => /^[a-z0-9-]+$/.test(o.id) && Date.parse(o.endsAt) > __BUILD_TIME__);

/** Where an offer's version of a page file (e.g. "wood.html") is built. */
export function offerPageFile(offerId: string, file: string): string {
  return `_offer/${offerId}/${file}`;
}
