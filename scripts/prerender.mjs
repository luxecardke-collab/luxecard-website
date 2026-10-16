// Runs after `vite build` and `vite build --ssr src/entry-server.tsx`.
// Writes one HTML file per page into dist/ (see src/seo/pages.ts), each with
// its own <head> tags (and, for the homepage, JSON-LD structured data) in
// place of index.html's <!--app-head--> placeholder and, for every page
// except browser-only ones, the page itself already rendered into #root for
// main.tsx to hydrate. vercel.json's cleanUrls
// serves dist/affiliate.html at /affiliate, etc. Each card page is also
// written once per offer that hadn't ended (src/seo/offerPages.ts), as it is
// while that offer is on, for middleware.ts to serve then.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const { PAGES, renderHeadTags, renderJsonLd, renderPage, routeKey, HYDRATABLE_MEDIA, cardPageHeroImage, OFFER_PAGE_OFFERS, offerPageFile } = await import(
  pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href
);

const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
const HTML_TAG = '<html lang="en-KE">';
if (!template.includes(HTML_TAG)) throw new Error(`dist/index.html has no ${HTML_TAG}`);

// The card pages middleware.ts serves offer versions of (its matcher).
const middleware = await fs.readFile(path.join(root, 'middleware.ts'), 'utf8');
const OFFER_PAGE_PATHS = [...(middleware.match(/matcher:\s*\[([^\]]*)\]/)?.[1] ?? '').matchAll(/'(\/[a-z-]+)'/g)].map((m) => m[1]);
const ROOT = '<div id="root"></div>';
if (!template.includes('<!--app-head-->') || !template.includes(ROOT)) {
  throw new Error('dist/index.html is missing <!--app-head--> or an empty #root; was it already prerendered?');
}

// React puts resource hints it finds while rendering (e.g. a preload for the
// nav logo, from its fetchPriority="high") at the very start of the markup.
// index.html's <head> (or the page's own head tags, e.g. a card page's hero
// photo) already preloads everything the pages need this way, so these are
// dropped rather than left inside #root; anything new would fail the build
// so it gets a proper home in index.html or the page's head.
function withoutHoistedLinks(html, head) {
  return html.replace(/^(?:<link [^>]*\/>)+/, (links) => {
    for (const href of links.matchAll(/href="([^"]+)"/g)) {
      if (!template.includes(`href="${href[1]}"`) && !head.includes(`href="${href[1]}"`)) {
        throw new Error(`Rendered markup hoists a <link> to ${href[1]} that index.html doesn't have`);
      }
    }
    return '';
  });
}

// main.tsx only hydrates the prerendered markup on screens it was rendered
// for (HYDRATABLE_MEDIA: phones, motion on); everywhere else it renders from
// scratch. There the markup is hidden from the start, so the browser doesn't
// lay out and paint a whole page that's about to be replaced — those screens
// load exactly as they did before prerendering. Crawlers still read it all.
// Google Search Console's ownership check: GSC_VERIFICATION (a Vercel
// environment variable, read at build time) is the token from its "HTML
// tag" method; the whole <meta …> tag Search Console shows is accepted too.
// Unset, empty or malformed: no tag at all (a malformed one is warned about
// in the build log rather than failing the build).
const gscToken = (process.env.GSC_VERIFICATION ?? '').trim().match(/content=["']([^"']+)["']/)?.[1] ?? (process.env.GSC_VERIFICATION ?? '').trim();
const GSC_TAG = /^[A-Za-z0-9_-]+$/.test(gscToken) ? `<meta name="google-site-verification" content="${gscToken}" />` : '';
if (gscToken && !GSC_TAG) console.warn('WARNING: GSC_VERIFICATION is set but is not a Search Console token (letters, digits, - and _ only); no verification tag added.');

const HIDE_UNHYDRATED = `<style>@media not all and ${HYDRATABLE_MEDIA} { #root[data-route] > * { display: none } }</style>`;

for (const page of PAGES) {
  // A card page's first photo, fetched at high priority on desktop (it's
  // the page's largest paint there; phones don't show it).
  const heroImage = cardPageHeroImage(page.path);
  const preload = heroImage
    ? heroImage.srcSet
      ? `<link rel="preload" as="image" imagesrcset="${heroImage.srcSet}" imagesizes="${heroImage.sizes}" media="(min-width: 900px)" fetchpriority="high" />`
      : `<link rel="preload" as="image" href="${heroImage.image}" media="(min-width: 900px)" fetchpriority="high" />`
    : '';
  const head = [renderHeadTags(page), GSC_TAG, preload, page.prerender === false ? '' : HIDE_UNHYDRATED, renderJsonLd(page.path)]
    .filter(Boolean)
    .join('\n    ');
  // data-route tells main.tsx which page this markup was rendered for, so it
  // only hydrates markup that matches the page it's on.
  const render = async (offerId) =>
    page.prerender === false
      ? ROOT
      : `<div id="root" data-route="${routeKey(page.path)}">${withoutHoistedLinks(await renderPage(page.path, offerId), head)}</div>`;
  await fs.writeFile(path.join(dist, page.file), template.replace('<!--app-head-->', head).replace(ROOT, await render(null)));
  console.log(`prerendered ${page.path} -> dist/${page.file}`);

  // A card page's version for each offer: the offer's prices and badge in
  // the HTML, and data-offer on <html> so the page keeps them while
  // hydrating (src/utils/firstPaintOffer.ts).
  if (!heroImage) continue;
  if (!OFFER_PAGE_PATHS.includes(page.path)) {
    throw new Error(`${page.path} is a card page but middleware.ts doesn't serve its offer versions; add it to its matcher`);
  }
  for (const offer of OFFER_PAGE_OFFERS) {
    const file = offerPageFile(offer.id, page.file);
    const html = template
      .replace(HTML_TAG, `<html lang="en-KE" data-offer="${offer.id}">`)
      .replace('<!--app-head-->', head)
      .replace(ROOT, await render(offer.id));
    await fs.mkdir(path.dirname(path.join(dist, file)), { recursive: true });
    await fs.writeFile(path.join(dist, file), html);
    console.log(`prerendered ${page.path} with ${offer.id} -> dist/${file}`);
  }
}
