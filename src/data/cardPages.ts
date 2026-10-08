import { BULK_DISCOUNT_RATE, BULK_DISCOUNT_THRESHOLD } from '../../api/_lib/pricing';
import metallicBlackPlaceholder from '../assets/portfolio/metallic-04.webp';
import woodBlackPlaceholder from '../assets/portfolio/wood-14.webp';
import { CARD_PAGE_SEO, type CardPageSeo } from './cardPageSeo';
import { FAQS, type Faq, type PhotoMaterial } from './content';

// One landing page per card (/wood, …), all rendered by CardLandingPage
// from an entry here. Only card-specific copy lives here: prices, the offer,
// finish names, testimonials, shared FAQ answers, the production note and
// contact details all come from the site's shared sources, so they can't
// drift from the rest of the site.
//
// Headlines mark the gold part in [square brackets].

export type CardSlug = CardPageSeo['slug'];

export type CardFinishChoice = {
  // Exactly as the server's allow-list has it (SUB_OPTIONS_BY_LABEL).
  label: string;
  image: string;
  // Smaller copies for phones, as an <img srcset>.
  srcSet?: string;
  alt: string;
  // 'contain' for a cut-out card photo; 'cover' for a photo with a
  // background, cropped to the card (objectPosition says where).
  fit: 'contain' | 'cover';
  objectPosition?: string;
};

export type CardPage = {
  slug: CardSlug;
  path: `/${CardSlug}`;
  // Key into the price list (api/_lib/pricing.ts), also the order's item name.
  priceLabel: string;
  // How customers see the card's name ("Metallic", not "metal").
  name: string;
  cta: string;
  hero: { eyebrow: string; headline: string; subtext: string };
  // Swatches, or null for a card with no choice (see finishNote).
  finishes: CardFinishChoice[] | null;
  // The one picture for a card without swatches (its label is the caption).
  image?: CardFinishChoice;
  // Shown instead of swatches (hero and order form).
  finishNote?: string;
  // The Product description in the page's structured data, where the
  // products section's line for this card isn't right for its page.
  productDescription?: string;
  why: { eyebrow: string; headline: string; body: string; points: { title: string; body: string }[] };
  how: { headline: string };
  whatYouGet: { headline: string; items: string[] };
  // null: no gallery until there are photos. `exclude` leaves out portfolio
  // photos of another card (e.g. gold cards from the metallic folder) by
  // file name; `labels` captions photos by file name ("wood-03").
  gallery: { headline: string; material: PhotoMaterial; exclude?: string[]; labels?: Record<string, string> } | null;
  // Names of existing testimonials (content.ts).
  testimonials: string[];
  whoFor: { headline: string; tags: string[]; line: string };
  // Card-specific questions first, then the site's own answers by id.
  faqs: Faq[];
  sharedFaqIds: string[];
  order: { headline: string };
  finalCta: { headline: string };
};

// Photos added later in src/assets/landing/<card>/hero-<finish>.webp (or
// hero.webp for a card without finishes) replace the placeholders below
// automatically.
const LANDING_IMAGES = import.meta.glob<string>('/src/assets/landing/*/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

function heroImage(slug: CardSlug, file: string, placeholder: Omit<CardFinishChoice, 'label' | 'alt'>) {
  const added = LANDING_IMAGES[`/src/assets/landing/${slug}/${file}.webp`];
  return added ? { image: added, fit: 'contain' as const } : placeholder;
}

// The bulk-discount line, from the same values checkout uses.
export const BULK_LINE = `Ordering more than ${BULK_DISCOUNT_THRESHOLD}? Get ${Math.round(BULK_DISCOUNT_RATE * 100)}% off automatically.`;

// "What you get" items every card shares (each page adds its own first).
const SHARED_ITEMS = [
  'NFC tap and a QR code backup',
  'Your digital profile: change your details, links or photo any time',
  'Your name, title, company, a short introduction, contact details, WhatsApp, socials, website, portfolio and other links, in one place',
  'A custom design, with a mockup you approve before production',
];
const SHARED_FAQ_IDS = ['how-it-works', 'phones', 'update-profile', 'fees', 'teams', 'etims', 'after-order'];
const HOW = { headline: 'TAP. [CONNECT.] DONE.' };
const FINAL_CTA = { headline: 'MAKE YOUR NEXT INTRODUCTION [COUNT.]' };

// Card photos with a phone-sized copy alongside (<name>-640.webp).
const cardPhoto = (name: string, width: number) => ({
  image: `/images/${name}.webp`,
  srcSet: `/images/${name}-640.webp 640w, /images/${name}.webp ${width}w`,
  fit: 'contain' as const,
});

const PLASTIC: CardPage = {
  slug: 'plastic',
  path: '/plastic',
  priceLabel: 'Plastic',
  name: 'Plastic',
  cta: 'Get my Plastic LuxeCard',
  hero: {
    eyebrow: 'LUXECARD PLASTIC · NFC BUSINESS CARD',
    headline: 'YOUR BRAND. [YOUR COLOURS.]',
    subtext: 'Lightweight, durable and built for everyday carry. One tap shares your contact, socials and more. No app needed.',
  },
  finishes: null,
  image: { label: 'Any colour you like', alt: 'LuxeCard in plastic', ...heroImage('plastic', 'hero', cardPhoto('card-plastic', 960)) },
  finishNote: 'Any colour you like. You choose your colour when we design your card.',
  why: {
    eyebrow: 'WHY PLASTIC',
    headline: 'BUILT FOR [EVERY DAY.]',
    body: 'A plastic LuxeCard goes wherever you do: lightweight, durable, and in any colour you like, so it can match your brand.',
    points: [
      { title: 'Any colour you like', body: 'Matched to your brand.' },
      { title: 'Lightweight and durable', body: 'Built for everyday carry.' },
    ],
  },
  how: HOW,
  whatYouGet: { headline: 'ONE CARD. [EVERYTHING] YOU NEED.', items: ['A plastic card in any colour you like', ...SHARED_ITEMS] },
  gallery: { headline: 'PLASTIC CARDS WE’VE [MADE.]', material: 'plastic' },
  testimonials: ['Lyban Mbatha', 'K. Keli', 'Stanley Juma'],
  whoFor: {
    headline: 'MADE FOR PEOPLE WHO [MEET PEOPLE.]',
    tags: ['Teams', 'Sales', 'Founders', 'Consultants', 'Real estate', 'Hospitality', 'Events', 'Creatives'],
    line: 'The everyday card for people who make a lot of introductions.',
  },
  faqs: [
    {
      q: 'What colours are available?',
      a: 'Any colour you like. You choose it when we design your card, and you’ll see it on your mockup before production.',
    },
    { q: 'Why choose plastic?', a: 'It’s lightweight, durable and built for everyday carry.' },
  ],
  sharedFaqIds: SHARED_FAQ_IDS,
  order: { headline: 'ORDER YOUR [PLASTIC] LUXECARD' },
  finalCta: FINAL_CTA,
};

const WOOD: CardPage = {
  slug: 'wood',
  path: '/wood',
  priceLabel: 'Wood',
  name: 'Wood',
  cta: 'Get my Wood LuxeCard',
  hero: {
    eyebrow: 'LUXECARD WOOD · NFC BUSINESS CARD',
    headline: 'A BUSINESS CARD PEOPLE [REMEMBER.]',
    subtext: 'Crafted from real wood. One tap shares your contact, socials and more. No app needed.',
  },
  finishes: [
    {
      label: 'Natural',
      alt: 'LuxeCard in natural wood',
      ...heroImage('wood', 'hero-natural', cardPhoto('card-wood', 960)),
    },
    {
      label: 'Black',
      alt: 'LuxeCard in black wood',
      // Until hero-black.webp is added: a black wood card from the portfolio.
      ...heroImage('wood', 'hero-black', { image: woodBlackPlaceholder, fit: 'cover', objectPosition: '50% 72%' }),
    },
  ],
  why: {
    eyebrow: 'WHY WOOD',
    headline: 'STAND OUT BEFORE YOU [SAY A WORD.]',
    body: 'People feel a wood card before they read it. The real grain and warm finish show you chose it on purpose.',
    points: [
      { title: 'Real wood grain', body: 'Warm and distinctive.' },
      { title: 'Naturally lightweight', body: 'Easy to carry every day.' },
    ],
  },
  how: HOW,
  whatYouGet: { headline: 'ONE CARD. [EVERYTHING] YOU NEED.', items: ['A real wood card in Natural or Black', ...SHARED_ITEMS] },
  gallery: { headline: 'WOOD CARDS WE’VE [MADE.]', material: 'wood' },
  testimonials: ['Lyban Mbatha', 'CR Advocates LLP', 'Stanley Juma'],
  whoFor: {
    headline: 'MADE FOR PEOPLE WHO DON’T [BLEND IN.]',
    tags: ['Founders', 'Executives', 'Consultants', 'Lawyers', 'Doctors', 'Real estate', 'Hospitality', 'Creatives'],
    line: 'If your personal brand matters, your business card should show it.',
  },
  faqs: [
    {
      q: 'Why choose wood?',
      a: 'For a warm, natural look that stands out. It’s real wood: naturally lightweight, with a warm, distinctive grain.',
    },
    {
      q: 'What finishes are available?',
      a: 'Natural and Black. Choose when you order; you’ll see it on your mockup before production.',
    },
  ],
  sharedFaqIds: SHARED_FAQ_IDS,
  order: { headline: 'ORDER YOUR [WOOD] LUXECARD' },
  finalCta: FINAL_CTA,
};

const METALLIC: CardPage = {
  slug: 'metal',
  path: '/metal',
  priceLabel: 'Metallic',
  name: 'Metallic',
  cta: 'Get my Metallic LuxeCard',
  hero: {
    eyebrow: 'LUXECARD METALLIC · NFC BUSINESS CARD',
    headline: 'A CARD WITH [REAL WEIGHT.]',
    // "Solid metal weight": the products section's own words for this card.
    subtext: 'Solid metal weight, in Silver or Black. One tap shares your contact, socials and more. No app needed.',
  },
  finishes: [
    { label: 'Silver', alt: 'LuxeCard in silver metallic', ...heroImage('metal', 'hero-silver', cardPhoto('card-metallic', 960)) },
    {
      label: 'Black',
      alt: 'LuxeCard in black metallic',
      // Until hero-black.webp is added: a black metallic card from the portfolio.
      ...heroImage('metal', 'hero-black', { image: metallicBlackPlaceholder, fit: 'cover', objectPosition: '50% 55%' }),
    },
  ],
  why: {
    eyebrow: 'WHY METALLIC',
    headline: 'FELT BEFORE IT’S [READ.]',
    body: 'Solid metal weight makes a metallic LuxeCard a tactile statement piece.',
    points: [
      { title: 'Solid metal weight', body: 'A tactile statement piece.' },
      { title: 'Silver or Black', body: 'The finish that suits your brand.' },
    ],
  },
  how: HOW,
  whatYouGet: { headline: 'ONE CARD. [EVERYTHING] YOU NEED.', items: ['A metallic card in Silver or Black', ...SHARED_ITEMS] },
  gallery: {
    headline: 'METALLIC CARDS WE’VE [MADE.]',
    material: 'metallic',
    // Gold cards (the Chairman's Card's finish, not a Metallic option),
    // and two whose colour isn't clearly Silver or Black.
    exclude: [
      'metallic-01', 'metallic-03', 'metallic-06', 'metallic-08', 'metallic-11', 'metallic-13', 'metallic-16',
      'metallic-18', 'metallic-21', 'metallic-23', 'metallic-26', 'metallic-28', 'metallic-10', 'metallic-22',
    ],
  },
  testimonials: ['Chirag Solanki', 'K. Keli', 'CR Advocates LLP'],
  whoFor: {
    headline: 'FOR INTRODUCTIONS THAT [CARRY WEIGHT.]',
    tags: ['Executives', 'Banking & finance', 'Legal', 'Real estate', 'Aviation', 'Government', 'Founders', 'Consultants'],
    line: 'When your card should say as much as your title.',
  },
  faqs: [
    {
      q: 'What finishes are available?',
      a: 'Silver and Black. Choose when you order; you’ll see it on your mockup before production.',
    },
    { q: 'Why choose metallic?', a: 'For solid metal weight: a tactile statement piece.' },
  ],
  sharedFaqIds: SHARED_FAQ_IDS,
  order: { headline: 'ORDER YOUR [METALLIC] LUXECARD' },
  finalCta: FINAL_CTA,
};

const CHAIRMAN: CardPage = {
  slug: 'chairman',
  path: '/chairman',
  priceLabel: "Chairman's Card",
  name: "Chairman's Card",
  cta: 'Get my Chairman’s Card',
  hero: {
    eyebrow: 'LUXECARD CHAIRMAN’S CARD · NFC BUSINESS CARD',
    headline: 'RESERVED FOR THE [BOLDEST INTRODUCTIONS.]',
    subtext: 'A gold finish. One tap shares your contact, socials and more. No app needed.',
  },
  finishes: null,
  image: { label: 'Gold finish', alt: 'LuxeCard Chairman’s Card in gold', ...heroImage('chairman', 'hero', cardPhoto('card-chairman', 912)) },
  finishNote: 'Gold finish.',
  productDescription: 'A gold finish, reserved for the boldest introductions.',
  why: {
    eyebrow: 'WHY THE CHAIRMAN’S CARD',
    headline: 'THE CARD AT THE [HEAD OF THE TABLE.]',
    body: 'A gold finish, reserved for the boldest introductions. And delivery is on us: LuxeCard covers all transport costs.',
    points: [
      { title: 'Gold finish', body: 'Reserved for the boldest introductions.' },
      { title: 'Delivery included', body: 'LuxeCard covers all transport costs.' },
    ],
  },
  how: HOW,
  whatYouGet: {
    headline: 'ONE CARD. [EVERYTHING] YOU NEED.',
    items: ['A Chairman’s Card with a gold finish', 'Delivery included: LuxeCard covers all transport costs', ...SHARED_ITEMS],
  },
  // Until there are Chairman's Card photos.
  gallery: null,
  testimonials: ['Lyban Mbatha', 'K. Keli', 'CR Advocates LLP'],
  whoFor: {
    headline: 'FOR LEADERS WHO [SET THE TONE.]',
    tags: ['Chairpersons', 'CEOs', 'Board members', 'Founders', 'Senior partners', 'Executives'],
    line: 'For leaders whose card should speak before they do.',
  },
  faqs: [
    {
      q: 'What makes the Chairman’s Card different?',
      a: 'A gold finish, reserved for the boldest introductions, and LuxeCard covers all transport costs.',
    },
    { q: 'Is delivery included?', a: 'Yes. For the Chairman’s Card, LuxeCard covers all transport costs.' },
  ],
  sharedFaqIds: SHARED_FAQ_IDS,
  order: { headline: 'ORDER YOUR [CHAIRMAN’S] CARD' },
  finalCta: FINAL_CTA,
};

// The pages in cardPageSeo.ts (the ones that are built), in that order.
const ALL_CARD_PAGES: CardPage[] = [PLASTIC, WOOD, METALLIC, CHAIRMAN];
export const CARD_PAGES: CardPage[] = CARD_PAGE_SEO.map((seo) => {
  const page = ALL_CARD_PAGES.find((p) => p.slug === seo.slug);
  if (!page) throw new Error(`No card page content for "${seo.slug}"`);
  return page;
});

// How wide a card page's hero photo shows, for its srcset.
export const HERO_IMAGE_SIZES = '(min-width: 900px) 620px, calc(100vw - 40px)';

// The image a card page shows first (for a high-priority preload).
export function cardPageHeroImage(path: string): { image: string; srcSet?: string; sizes: string } | undefined {
  const card = cardPageFor(path);
  const first = card?.finishes?.[0] ?? card?.image;
  return first && { image: first.image, srcSet: first.srcSet, sizes: HERO_IMAGE_SIZES };
}

export function cardPageFor(path: string): CardPage | undefined {
  return CARD_PAGES.find((p) => p.path === path);
}

// The card's own questions, then the site's shared answers it reuses (same
// wording, without the homepage's group headings).
export function cardPageFaqs(card: CardPage): Faq[] {
  const shared = card.sharedFaqIds.map((id) => {
    const faq = FAQS.find((f) => f.id === id);
    if (!faq) throw new Error(`No FAQ with id "${id}" (card page ${card.path})`);
    return { q: faq.q, a: faq.cardPageA ?? faq.a };
  });
  return [...card.faqs, ...shared];
}

// "A [GOLD] word" → parts, for headlines.
export function headlineParts(headline: string): { text: string; gold: boolean }[] {
  return headline
    .split(/(\[[^\]]+\])/)
    .filter(Boolean)
    .map((part) => (part.startsWith('[') ? { text: part.slice(1, -1), gold: true } : { text: part, gold: false }));
}
