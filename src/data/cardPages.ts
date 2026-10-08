import { BULK_DISCOUNT_RATE, BULK_DISCOUNT_THRESHOLD } from '../../api/_lib/pricing';
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
  // The one picture for a card without swatches.
  image?: CardFinishChoice;
  finishNote?: string;
  why: { eyebrow: string; headline: string; body: string; points: { title: string; body: string }[] };
  how: { headline: string };
  whatYouGet: { headline: string; items: string[] };
  gallery: { headline: string; material: PhotoMaterial; labels?: Record<string, string> };
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
      ...heroImage('wood', 'hero-natural', { image: '/images/card-wood.webp', fit: 'contain' }),
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
  how: { headline: 'TAP. [CONNECT.] DONE.' },
  whatYouGet: {
    headline: 'ONE CARD. [EVERYTHING] YOU NEED.',
    items: [
      'A real wood card in Natural or Black',
      'NFC tap and a QR code backup',
      'Your digital profile: change your details, links or photo any time',
      'Your name, title, company, a short introduction, contact details, WhatsApp, socials, website, portfolio and other links, in one place',
      'A custom design, with a mockup you approve before production',
    ],
  },
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
  sharedFaqIds: ['how-it-works', 'phones', 'update-profile', 'fees', 'teams', 'etims', 'after-order'],
  order: { headline: 'ORDER YOUR [WOOD] LUXECARD' },
  finalCta: { headline: 'MAKE YOUR NEXT INTRODUCTION [COUNT.]' },
};

// The pages in cardPageSeo.ts (the ones that are built), in that order.
const ALL_CARD_PAGES: CardPage[] = [WOOD];
export const CARD_PAGES: CardPage[] = CARD_PAGE_SEO.map((seo) => {
  const page = ALL_CARD_PAGES.find((p) => p.slug === seo.slug);
  if (!page) throw new Error(`No card page content for "${seo.slug}"`);
  return page;
});

// The image a card page shows first (for a high-priority preload).
export function cardPageHeroImage(path: string): string | undefined {
  const card = cardPageFor(path);
  return (card?.finishes?.[0] ?? card?.image)?.image;
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
    return { q: faq.q, a: faq.a };
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
