import { FINISH_PRICES_BY_LABEL } from '../../api/_lib/pricing';
import { cardPageFaqs, cardPageFor, type CardPage } from '../data/cardPages';
import { CARD_FINISHES, FAQS, faqAnswerText, type Faq } from '../data/content';
import { BUSINESS_ADDRESS, BUSINESS_GEO, OPENING_HOURS } from '../data/business';
import { GUIDES, type Guide } from '../data/guides';
import { LINKS } from '../data/links';
import { OG_IMAGE, PAGES, SITE_URL } from './pages';

// JSON-LD (schema.org) built from the same data the pages show. Every
// public page has the business (an Organization that is also a Store, the
// shop in Lavington); the homepage adds a Product with a KES Offer per card
// finish and its FAQPage, each card page that card and its FAQ. Prices come
// from the checkout's own price list, FAQ answers from FAQS.
// scripts/prerender.mjs puts it in each page's <head>.

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const GOOGLE_MAPS_URL = 'https://www.google.com/maps/place/?q=place_id:ChIJzc8o2GkbLxgRo6KtmHF-4k0';

// Social profile URLs without share/tracking query strings.
const profileUrl = (url: string) => url.split('?')[0];

// "KES 7,000–19,000": the cheapest and dearest card in the price list.
function priceRange() {
  const prices = Object.values(FINISH_PRICES_BY_LABEL);
  const kes = (n: number) => n.toLocaleString('en-US');
  return `KES ${kes(Math.min(...prices))}–${kes(Math.max(...prices))}`;
}

// The business: one entity (one @id), both the Organization and the Store.
function organization() {
  return {
    '@type': ['Organization', 'Store'],
    '@id': ORGANIZATION_ID,
    name: 'LuxeCard',
    legalName: 'LuxeCard Limited',
    alternateName: 'LuxeCard Africa',
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icon-512.png`,
    image: `${SITE_URL}/images/luxecard-hero-photo.webp`,
    email: LINKS.EMAIL,
    telephone: LINKS.PHONE_DISPLAY,
    address: { '@type': 'PostalAddress', ...BUSINESS_ADDRESS },
    geo: { '@type': 'GeoCoordinates', ...BUSINESS_GEO },
    hasMap: GOOGLE_MAPS_URL,
    areaServed: { '@type': 'Country', name: 'Kenya' },
    priceRange: priceRange(),
    ...(OPENING_HOURS.length
      ? {
          openingHoursSpecification: OPENING_HOURS.map((h) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: h.days,
            opens: h.opens,
            closes: h.closes,
          })),
        }
      : {}),
    sameAs: [...Object.values(LINKS.SOCIAL).map(profileUrl), GOOGLE_MAPS_URL],
    contactPoint: [LINKS.PHONE_DISPLAY, LINKS.PHONE2_DISPLAY].map((telephone) => ({
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone,
      email: LINKS.EMAIL,
      areaServed: 'KE',
    })),
  };
}

// One Product per finish in the price list, with its description and photo
// from the finish shown in the products section.
function products() {
  return Object.entries(FINISH_PRICES_BY_LABEL).map(([label, price]) => {
    const finish = CARD_FINISHES.find((f) => f.priceLabel === label);
    if (!finish) throw new Error(`No CARD_FINISHES entry for the "${label}" finish in the price list`);
    return {
      '@type': 'Product',
      name: `LuxeCard ${finish.name}`,
      description: finish.blurb,
      image: `${SITE_URL}${finish.image}`,
      brand: { '@type': 'Brand', name: 'LuxeCard' },
      offers: {
        '@type': 'Offer',
        price: String(price),
        priceCurrency: 'KES',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/#products`,
        seller: { '@id': ORGANIZATION_ID },
      },
    };
  });
}

function faqPage(faqs: Faq[] = FAQS) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faqAnswerText(faq.a) },
    })),
  };
}

// A <script type="application/ld+json"> for the given page's <head>, or ''
// for pages without structured data.
// A card page: that card as a Product (regular price, from the price list),
// and its FAQ.
function cardPageGraph(card: CardPage) {
  const finish = CARD_FINISHES.find((f) => f.priceLabel === card.priceLabel);
  if (!finish) throw new Error(`No CARD_FINISHES entry for the "${card.priceLabel}" card page`);
  return [
    organization(),
    {
      '@type': 'Product',
      name: `LuxeCard ${finish.name}`,
      description: card.productDescription ?? finish.blurb,
      image: `${SITE_URL}${finish.image}`,
      brand: { '@type': 'Brand', name: 'LuxeCard' },
      offers: {
        '@type': 'Offer',
        price: String(FINISH_PRICES_BY_LABEL[card.priceLabel]),
        priceCurrency: 'KES',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}${card.path}`,
        seller: { '@id': ORGANIZATION_ID },
      },
    },
    faqPage(cardPageFaqs(card)),
  ];
}

// A guide article: Article (author and publisher LuxeCard), a BreadcrumbList
// (Home > Guides > the article) and its FAQ.
function guideGraph(guide: Guide) {
  const url = `${SITE_URL}${guide.path}`;
  return [
    {
      '@type': 'Article',
      headline: guide.title,
      description: guide.description,
      image: OG_IMAGE,
      datePublished: guide.date,
      dateModified: guide.date,
      author: { '@type': 'Organization', name: guide.author, url: `${SITE_URL}/` },
      publisher: {
        '@type': 'Organization',
        name: 'LuxeCard',
        url: `${SITE_URL}/`,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` },
        { '@type': 'ListItem', position: 3, name: guide.title, item: url },
      ],
    },
    faqPage(guide.faqs),
  ];
}

export function renderJsonLd(path: string): string {
  const card = cardPageFor(path);
  const guide = GUIDES.find((g) => g.path === path);
  const page = PAGES.find((p) => p.path === path);
  // Pages kept out of search results (noindex) get none.
  if (!page || page.noindex) return '';
  const graph = {
    '@context': 'https://schema.org',
    '@graph': card
      ? cardPageGraph(card)
      : guide
        ? guideGraph(guide)
        : path === '/'
          ? [organization(), ...products(), faqPage()]
          : [organization()],
  };
  // "<" escaped so no string in the data can close the <script> early.
  return `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>`;
}
