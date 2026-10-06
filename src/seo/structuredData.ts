import { FINISH_PRICES_BY_LABEL } from '../../api/_lib/pricing';
import { CARD_FINISHES, FAQS } from '../data/content';
import { LINKS } from '../data/links';
import { SITE_URL } from './pages';

// JSON-LD for the homepage (schema.org Organization, a Product with a KES
// Offer per card finish, and FAQPage), built from the same data the page
// shows: prices from the checkout's own price list, FAQ answers from FAQS.
// scripts/prerender.mjs puts it in the homepage's <head>.

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

// Social profile URLs without share/tracking query strings.
const profileUrl = (url: string) => url.split('?')[0];

function organization() {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: 'LuxeCard Africa',
    legalName: 'LuxeCard Limited',
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icon-512.png`,
    email: LINKS.EMAIL,
    telephone: LINKS.PHONE_DISPLAY,
    sameAs: Object.values(LINKS.SOCIAL).map(profileUrl),
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
    const finish = CARD_FINISHES.find((f) => f.name === label || f.name.startsWith(`${label}:`));
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

function faqPage() {
  return {
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      // "{contact}" renders as a "Contact us" link on the page.
      acceptedAnswer: { '@type': 'Answer', text: faq.a.replace(/\{contact\}/g, 'Contact us') },
    })),
  };
}

// A <script type="application/ld+json"> for the given page's <head>, or ''
// for pages without structured data.
export function renderJsonLd(path: string): string {
  if (path !== '/') return '';
  const graph = { '@context': 'https://schema.org', '@graph': [organization(), ...products(), faqPage()] };
  // "<" escaped so no string in the data can close the <script> early.
  return `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>`;
}
