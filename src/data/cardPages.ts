import metallicBlackPlaceholder from '../assets/portfolio/metallic-04.webp';
import woodBlackPlaceholder from '../assets/portfolio/wood-14.webp';
import chairmanBoxedPhoto from '../assets/landing/chairman/gold-boxed.webp';
import metallicBlackPhoto from '../assets/landing/metal/metallic-black.webp';
import woodBlackPhoto from '../assets/landing/wood/wood-black.webp';
import woodNaturalPhoto from '../assets/landing/wood/wood-natural.webp';
import { CARD_PAGE_SEO, type CardPageSeo } from './cardPageSeo';
import { FAQS, type CardFinish, type Faq, type PhotoMaterial } from './content';

// One landing page per card (/wood, …), all rendered by CardLandingPage
// from an entry here, in the homepage's own sections. Only card-specific
// copy lives here: prices, the offer, finish names, testimonials, shared FAQ
// answers, the production note and contact details all come from the site's
// shared sources, so they can't drift from the rest of the site.
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
  hero: { headline: string; subtext: string };
  // Swatches, or null for a card with no choice (see image, finishNote).
  finishes: CardFinishChoice[] | null;
  // The one picture for a card without swatches.
  image?: CardFinishChoice;
  // Shown in the order form instead of swatches.
  finishNote?: string;
  // The Product description in the page's structured data, where the
  // products section's line for this card isn't right for its page.
  productDescription?: string;
  // The card(s), shown like the homepage's "Crafted to Impress".
  showcase: { headline: string; label: string; items: CardFinish[] };
  // That section's button ("Get your Wood LuxeCard").
  showcaseCta: string;
  // An optional section after the card(s): how the card is presented.
  presentation?: { headline: string; line: string; image: string; alt: string; width: number; height: number };
  // The light "What you get" section (the homepage's For Business layout).
  whatYouGet: { headline: string; points: { title: string; body: string }[] };
  // null: no gallery until there are photos. `exclude` leaves out portfolio
  // photos of another card (e.g. gold cards from the metallic folder) by
  // file name ("metallic-01").
  gallery: { material: PhotoMaterial; exclude?: string[] } | null;
  // This card's own questions (shown first, under "About the … card"), then
  // the site's own answers by id.
  faqs: Faq[];
  sharedFaqIds: string[];
  order: { headline: string };
};

// Photos added later in src/assets/landing/<card>/hero-<finish>.webp (or
// hero.webp for a card without finishes) replace the hero placeholders below
// automatically.
const LANDING_IMAGES = import.meta.glob<string>('/src/assets/landing/*/hero*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

function heroImage(slug: CardSlug, file: string, placeholder: Omit<CardFinishChoice, 'label' | 'alt'>) {
  const added = LANDING_IMAGES[`/src/assets/landing/${slug}/${file}.webp`];
  return added ? { image: added, fit: 'contain' as const } : placeholder;
}

// Card photos with a phone-sized copy alongside (<name>-640.webp).
const cardPhoto = (name: string, width: number) => ({
  image: `/images/${name}.webp`,
  srcSet: `/images/${name}-640.webp 640w, /images/${name}.webp ${width}w`,
  fit: 'contain' as const,
});

// The site's answers every card page reuses, in the homepage FAQ's order.
const SHARED_FAQ_IDS = ['after-order', 'teams', 'etims', 'how-it-works', 'phones', 'update-profile', 'fees'];
const NFC_POINT = { title: 'NFC + QR', body: 'Tap, or scan the QR code.' };
const PROFILE_POINT = { title: 'Your digital profile', body: 'Update it any time.' };
const DESIGN_POINT = { title: 'Custom design', body: 'Approved by you before production.' };

const PLASTIC: CardPage = {
  slug: 'plastic',
  path: '/plastic',
  priceLabel: 'Plastic',
  name: 'Plastic',
  cta: 'Get my Plastic LuxeCard',
  hero: {
    headline: 'YOUR BRAND. [YOUR COLOURS.]',
    subtext: 'Any colour you like. One tap shares your contact, socials and more.',
  },
  finishes: null,
  image: { label: 'Plastic', alt: 'LuxeCard in plastic', ...heroImage('plastic', 'hero', cardPhoto('card-plastic', 960)) },
  finishNote: 'Any colour you like. You choose it when we design your card.',
  showcaseCta: 'Get your Plastic LuxeCard',
  showcase: {
    headline: 'BUILT FOR [EVERY DAY.]',
    label: 'Any Colour. One Card.',
    items: [
      {
        name: 'Plastic',
        priceLabel: 'Plastic',
        blurb: 'Lightweight, durable and built for everyday carry.',
        image: '/images/card-plastic.webp',
        alt: 'LuxeCard in plastic',
        width: 960,
        height: 571,
      },
    ],
  },
  whatYouGet: {
    headline: 'ONE CARD. [EVERYTHING] YOU NEED.',
    points: [{ title: 'Any colour', body: 'Chosen when we design your card.' }, NFC_POINT, PROFILE_POINT, DESIGN_POINT],
  },
  gallery: { material: 'plastic' },
  faqs: [
    { q: 'What colours are available?', a: 'Any colour you like. You’ll see it on your mockup before production.' },
    { q: 'Why choose plastic?', a: 'It’s lightweight, durable and built for everyday carry.' },
  ],
  sharedFaqIds: SHARED_FAQ_IDS,
  order: { headline: 'ORDER YOUR [PLASTIC] LUXECARD' },
};

const WOOD: CardPage = {
  slug: 'wood',
  path: '/wood',
  priceLabel: 'Wood',
  name: 'Wood',
  cta: 'Get my Wood LuxeCard',
  hero: {
    headline: 'A BUSINESS CARD PEOPLE [REMEMBER.]',
    subtext: 'Real wood. One tap shares your contact, socials and more.',
  },
  finishes: [
    { label: 'Natural', alt: 'LuxeCard in natural wood', ...heroImage('wood', 'hero-natural', cardPhoto('card-wood', 960)) },
    {
      label: 'Black',
      alt: 'LuxeCard in black wood',
      // Until hero-black.webp is added: a black wood card from the portfolio.
      ...heroImage('wood', 'hero-black', { image: woodBlackPlaceholder, fit: 'cover', objectPosition: '50% 72%' }),
    },
  ],
  showcaseCta: 'Get your Wood LuxeCard',
  showcase: {
    headline: 'STAND OUT BEFORE YOU [SAY A WORD.]',
    label: 'Two Finishes. One Card.',
    items: [
      {
        name: 'Wood: Natural',
        priceLabel: 'Wood',
        blurb: 'Real wood with a warm, distinctive grain.',
        image: woodNaturalPhoto,
        alt: 'LuxeCard in natural wood',
        width: 800,
        height: 524,
      },
      {
        name: 'Wood: Black',
        priceLabel: 'Wood',
        blurb: 'Real wood, finished in black.',
        image: woodBlackPhoto,
        alt: 'LuxeCard in black wood',
        width: 800,
        height: 511,
      },
    ],
  },
  whatYouGet: {
    headline: 'ONE CARD. [EVERYTHING] YOU NEED.',
    points: [{ title: 'Real wood', body: 'Natural or Black.' }, NFC_POINT, PROFILE_POINT, DESIGN_POINT],
  },
  gallery: { material: 'wood' },
  faqs: [
    { q: 'Why choose wood?', a: 'It’s real wood: naturally lightweight, with a warm, distinctive grain.' },
    { q: 'What finishes are available?', a: 'Natural and Black. You’ll see yours on your mockup before production.' },
  ],
  sharedFaqIds: SHARED_FAQ_IDS,
  order: { headline: 'ORDER YOUR [WOOD] LUXECARD' },
};

const METALLIC: CardPage = {
  slug: 'metal',
  path: '/metal',
  priceLabel: 'Metallic',
  name: 'Metallic',
  cta: 'Get my Metallic LuxeCard',
  hero: {
    headline: 'A CARD WITH [REAL WEIGHT.]',
    // "Solid metal weight": the products section's own words for this card.
    subtext: 'Solid metal weight. One tap shares your contact, socials and more.',
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
  showcaseCta: 'Get your Metallic LuxeCard',
  showcase: {
    headline: 'FELT BEFORE IT’S [READ.]',
    label: 'Two Finishes. One Card.',
    items: [
      {
        name: 'Metallic: Silver',
        priceLabel: 'Metallic',
        blurb: 'Solid metal weight, in silver.',
        image: '/images/card-metallic.webp',
        alt: 'LuxeCard in silver metallic',
        width: 960,
        height: 574,
      },
      {
        name: 'Metallic: Black',
        priceLabel: 'Metallic',
        blurb: 'Solid metal weight, in black.',
        image: metallicBlackPhoto,
        alt: 'LuxeCard in black metallic',
        width: 800,
        height: 499,
      },
    ],
  },
  whatYouGet: {
    headline: 'ONE CARD. [EVERYTHING] YOU NEED.',
    points: [{ title: 'Solid metal weight', body: 'Silver or Black.' }, NFC_POINT, PROFILE_POINT, DESIGN_POINT],
  },
  gallery: {
    material: 'metallic',
    // Gold cards (the Chairman's Card's finish, not a Metallic option),
    // and two whose colour isn't clearly Silver or Black.
    exclude: [
      'metallic-01', 'metallic-03', 'metallic-06', 'metallic-08', 'metallic-11', 'metallic-13', 'metallic-16',
      'metallic-18', 'metallic-21', 'metallic-23', 'metallic-26', 'metallic-28', 'metallic-10', 'metallic-22',
    ],
  },
  faqs: [
    { q: 'What finishes are available?', a: 'Silver and Black. You’ll see yours on your mockup before production.' },
    { q: 'Why choose metallic?', a: 'For solid metal weight: a tactile statement piece.' },
  ],
  sharedFaqIds: SHARED_FAQ_IDS,
  order: { headline: 'ORDER YOUR [METALLIC] LUXECARD' },
};

const CHAIRMAN: CardPage = {
  slug: 'chairman',
  path: '/chairman',
  priceLabel: "Chairman's Card",
  name: "Chairman's Card",
  cta: 'Get my Chairman’s Card',
  hero: {
    headline: 'RESERVED FOR THE [BOLDEST INTRODUCTIONS.]',
    subtext: 'A gold finish. One tap shares your contact, socials and more.',
  },
  finishes: null,
  image: {
    label: 'Gold finish',
    alt: 'LuxeCard Chairman’s Card in gold',
    ...heroImage('chairman', 'hero', cardPhoto('card-chairman', 912)),
  },
  finishNote: 'Gold finish.',
  productDescription: 'A gold finish, reserved for the boldest introductions.',
  showcaseCta: 'Get your Chairman’s Card',
  showcase: {
    headline: 'THE CARD AT THE [HEAD OF THE TABLE.]',
    label: 'Gold Finish. One Card.',
    items: [
      {
        name: 'Chairman’s Card',
        priceLabel: "Chairman's Card",
        blurb: 'A gold finish, with delivery included.',
        image: '/images/card-chairman.webp',
        alt: 'LuxeCard Chairman’s Card in gold',
        width: 912,
        height: 537,
      },
    ],
  },
  presentation: {
    headline: 'IN A PREMIUM [BLACK BOX.]',
    line: 'Your Chairman’s Card, in its gold finish, comes in a premium black box.',
    image: chairmanBoxedPhoto,
    alt: 'The LuxeCard Chairman’s Card in its premium black box',
    width: 800,
    height: 703,
  },
  whatYouGet: {
    headline: 'ONE CARD. [EVERYTHING] YOU NEED.',
    points: [
      { title: 'Gold finish', body: 'Reserved for the boldest introductions.' },
      { title: 'Delivery included', body: 'LuxeCard covers all transport costs.' },
      NFC_POINT,
      DESIGN_POINT,
    ],
  },
  // Until there are Chairman's Card photos.
  gallery: null,
  faqs: [
    {
      q: 'What makes the Chairman’s Card different?',
      a: 'A gold finish, reserved for the boldest introductions, and delivery is included: LuxeCard covers all transport costs.',
    },
  ],
  sharedFaqIds: SHARED_FAQ_IDS,
  order: { headline: 'ORDER YOUR [CHAIRMAN’S] CARD' },
};

// The pages in cardPageSeo.ts (the ones that are built), in that order.
const ALL_CARD_PAGES: CardPage[] = [PLASTIC, WOOD, METALLIC, CHAIRMAN];
export const CARD_PAGES: CardPage[] = CARD_PAGE_SEO.map((seo) => {
  const page = ALL_CARD_PAGES.find((p) => p.slug === seo.slug);
  if (!page) throw new Error(`No card page content for "${seo.slug}"`);
  return page;
});

// How wide a card page's hero photo shows, for its srcset (desktop only;
// phones don't show it).
export const HERO_IMAGE_SIZES = '(min-width: 1024px) 380px, 460px';

// The image a card page shows first (for a high-priority preload).
export function cardPageHeroImage(path: string): { image: string; srcSet?: string; sizes: string } | undefined {
  const card = cardPageFor(path);
  const first = card?.finishes?.[0] ?? card?.image;
  return first && { image: first.image, srcSet: first.srcSet, sizes: HERO_IMAGE_SIZES };
}

export function cardPageFor(path: string): CardPage | undefined {
  return CARD_PAGES.find((p) => p.path === path);
}

// The card's own questions under "About the … card", then the site's shared
// answers in their homepage groups (with the card pages' wording where it
// differs).
export function cardPageFaqs(card: CardPage): Faq[] {
  const group = card.name === "Chairman's Card" ? 'About the Chairman’s Card' : `About the ${card.name} card`;
  const own = card.faqs.map((f) => ({ ...f, group }));
  const shared = card.sharedFaqIds.map((id) => {
    const faq = FAQS.find((f) => f.id === id);
    if (!faq) throw new Error(`No FAQ with id "${id}" (card page ${card.path})`);
    return { q: faq.q, a: faq.cardPageA ?? faq.a, group: faq.group };
  });
  return [...own, ...shared];
}

// "A [GOLD] word" → parts, for headlines.
export function headlineParts(headline: string): { text: string; gold: boolean }[] {
  return headline
    .split(/(\[[^\]]+\])/)
    .filter(Boolean)
    .map((part) => (part.startsWith('[') ? { text: part.slice(1, -1), gold: true } : { text: part, gold: false }));
}
