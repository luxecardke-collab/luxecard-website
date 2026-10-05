import { LEGAL_DOCS } from '../data/legal';

// Every URL the site serves as its own page, with the <head> each one gets.
// scripts/prerender.mjs writes one HTML file per entry at build time, so each
// page's title, description and canonical are in the HTML crawlers and link
// previews receive, not only set later by JavaScript.

export const SITE_URL = 'https://www.luxecard.co.ke';
export const OG_IMAGE = `${SITE_URL}/og-image.png`;

export type PageMeta = {
  path: string;
  // The file the build writes for this page, relative to dist/ (served at
  // `path` via vercel.json's cleanUrls).
  file: string;
  title: string;
  description: string;
  // Pages that must not appear in search results: no canonical, and a
  // robots noindex instead.
  noindex?: boolean;
  // false for pages that only make sense in the browser (they read the URL's
  // query string to render): their HTML has an empty #root.
  prerender?: false;
};

export const HOME_PAGE: PageMeta = {
  path: '/',
  file: 'index.html',
  title: 'LuxeCard: Your introduction, upgraded.',
  description: 'One tap connects people to your contact, socials, portfolio, business and more.',
};

export const AFFILIATE_PAGE: PageMeta = {
  path: '/affiliate',
  file: 'affiliate.html',
  title: 'Affiliate Program | LuxeCard',
  description: 'Join the LuxeCard affiliate program. Share your link and earn 10% on every sale made through it.',
};

const LEGAL_DESCRIPTIONS: Record<string, string> = {
  '/terms': 'The terms that govern ordering, purchasing and using LuxeCard products and digital profiles from LuxeCard Limited.',
  '/privacy':
    'How LuxeCard Limited collects, uses and shares personal data under the Data Protection Act, 2019, and your rights.',
  '/returns':
    'How LuxeCard handles returns and refunds for customised products, defective products and cancellations.',
};

// Same title format LegalPage sets as document.title.
export const LEGAL_PAGES: PageMeta[] = LEGAL_DOCS.map((doc) => ({
  path: doc.path,
  file: `${doc.path.slice(1)}.html`,
  title: `${doc.title} | LuxeCard`,
  description: LEGAL_DESCRIPTIONS[doc.path],
}));

// Where Paystack sends a customer after paying; reads ?reference= to show
// the order, so it's rendered in the browser only.
export const ORDER_CONFIRMATION_PAGE: PageMeta = {
  path: '/order-confirmation',
  file: 'order-confirmation.html',
  title: 'Order Confirmation | LuxeCard',
  description: HOME_PAGE.description,
  prerender: false,
};

export const PAGES: PageMeta[] = [HOME_PAGE, AFFILIATE_PAGE, ...LEGAL_PAGES, ORDER_CONFIRMATION_PAGE];

const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The per-page <head> tags, as an HTML string for index.html's <!--app-head-->.
export function renderHeadTags(page: PageMeta): string {
  const url = `${SITE_URL}${page.path}`;
  const title = escapeAttr(page.title);
  const description = escapeAttr(page.description);
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    page.noindex ? `<meta name="robots" content="noindex" />` : `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
  ];
  return tags.join('\n    ');
}
