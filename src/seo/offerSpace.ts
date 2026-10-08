import { OFFERS } from '../../api/_lib/pricing';

// A card page's hero shows the offer badge under the price on phones, but
// only once the page knows the server's time, so its space is kept from the
// first paint while an offer is on (otherwise the badge pushes the reviews,
// already on screen there, down). Whether an offer is on is decided here, in
// a tiny script in the page's <head> that runs before the first paint: it
// compares the visitor's clock with each offer's start and end (written in
// from OFFERS when the site is built) and adds the `offer-space` class to
// <html>. index.css reserves the space only with that class, so after an
// offer ends the space goes by itself, with no redeploy, and if the script
// fails or JavaScript is off nothing is reserved.
//
// Only the space follows the visitor's clock; the badge and the prices
// themselves keep following the server's (utils/serverClock).
export const OFFER_SPACE_CLASS = 'offer-space';

export function renderOfferSpaceScript(): string {
  const windows = OFFERS.map((o) => [Date.parse(o.startsAt), Date.parse(o.endsAt)]);
  return (
    '<script>(function(){try{' +
    `var o=${JSON.stringify(windows)},t=Date.now();` +
    'for(var i=0;i<o.length;i++){if(t>=o[i][0]&&t<o[i][1]){' +
    `document.documentElement.classList.add('${OFFER_SPACE_CLASS}');return}}` +
    '}catch(e){}})();</script>'
  );
}
