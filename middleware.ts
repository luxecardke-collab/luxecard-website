import { next, rewrite } from '@vercel/functions';
import { activeOffer } from './api/_lib/pricing.js';

// Vercel Routing Middleware for the card pages: while an offer is on by the
// server's clock, a card page's address serves the page as built with that
// offer (dist/_offer/<offer id>/<page>.html, from scripts/prerender.mjs);
// otherwise the page as it is. So the HTML itself carries the offer's prices
// exactly while it's on and drops them the moment it ends, with no redeploy
// and whatever the visitor's own clock says.
//
// The matcher lists every card page (scripts/prerender.mjs checks it does).
export const config = {
  matcher: ['/plastic', '/wood', '/metal', '/chairman', '/_offer/:path*'],
  runtime: 'nodejs',
};

export default function middleware(request: Request): Response {
  try {
    const url = new URL(request.url);
    const offer = activeOffer(new Date());

    // An offer's version at its own address: only while that offer is on;
    // otherwise (e.g. an old link, or after it ends) the page itself.
    const version = /^\/_offer\/([a-z0-9-]+)(\/[a-z-]+)$/.exec(url.pathname);
    if (version) {
      if (offer?.id === version[1]) return next();
      return Response.redirect(new URL(version[2] + url.search, url), 307);
    }

    if (!offer) return next();
    url.pathname = `/_offer/${offer.id}${url.pathname}`;
    return rewrite(url);
  } catch (err) {
    // Never fail a page over this: serve it as requested (the regular page
    // at its own address), which the browser then prices by the server's
    // clock as usual.
    console.error('Offer middleware failed; serving the page as requested:', err);
    return next();
  }
}
