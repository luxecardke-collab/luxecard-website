import { BULK_DISCOUNT_RATE, BULK_DISCOUNT_THRESHOLD, FINISH_PRICES_BY_LABEL } from '../../api/_lib/pricing';
import { formatKes } from '../utils/formatPrice';
import { ETIMS_INVOICE_TIMEFRAME } from './etims';
import { LINKS } from './links';
import { PRODUCTION_TIMEFRAME } from './production';

export const NAV_LINKS = [
  { label: 'How It Works', href: '#how' },
  { label: 'Products', href: '#products' },
  { label: 'For Business', href: '#business' },
  { label: 'FAQs', href: '#faqs' },
  { label: 'Become an Affiliate', href: '/affiliate' },
] as const;

export const DEMO_PROFILE = {
  name: 'Wanjiru Kamau',
  title: 'Brand Strategist, Meridian',
} as const;

export const HERO_TRUST = ['NFC + QR', 'NO APP TO VIEW', 'UPDATE ANYTIME'] as const;

export type Stage = {
  index: string;
  title: string;
  body: string;
};

export const STAGES: Stage[] = [
  {
    index: '01',
    title: 'Tap / Scan',
    body: 'Tap your LuxeCard on compatible phones (NFC), or scan the QR code to share your contact info.',
  },
  { index: '02', title: 'Open', body: 'Your digital profile opens instantly in their browser. No app needed.' },
  { index: '03', title: 'Connect', body: 'Contact, WhatsApp, socials, website, portfolio: one tap each.' },
  {
    index: '04',
    title: 'Two-Way Exchange',
    body: 'A save-contact prompt appears so they keep your details. They can share theirs back, and you receive it by email.',
  },
];

export const PROBLEM = {
  oldWay: [
    'Paper-based & wasteful',
    'Hand-out networking',
    'Limited information',
    'Requires reprinting',
    'No engagement data',
  ],
  luxeCard: [
    'Reduced paper waste',
    'NFC+QR sharing',
    'Rich digital profile',
    'Update anytime, no reprinting',
    'Track engagement & interactions',
  ],
};

export type ValuePillar = { num: string; title: string; body: string };

export const VALUE_PILLARS: ValuePillar[] = [
  { num: '01', title: 'Your identity', body: 'Everything important about you in one place, and always current.' },
  { num: '02', title: 'Your connections', body: 'Introductions that take a second, not a search for a pen.' },
  { num: '03', title: 'Your opportunities', body: 'Turn real-world conversations into connections that last.' },
];

export type Product = { tag: string; name: string; desc: string; image: string };

export const PRODUCTS: Product[] = [
  { tag: 'TAP PEN', name: 'Tap Pen', desc: 'A pen people keep, and a networking tool they remember.', image: '/images/tap-pen.webp' },
  { tag: 'TAP KEYHOLDER', name: 'Tap Keyholder', desc: 'Your identity on your keys, wherever the day goes.', image: '/images/tap-keyholder.webp' },
  { tag: 'WIFI PASS', name: 'WiFi Pass', desc: 'Guests connect to your network with a tap.', image: '/images/wifi-pass.webp' },
  { tag: 'REVIEW TAP', name: 'Review Tap', desc: 'Turn happy customers into reviews at the counter.', image: '/images/review-tap.webp' },
];

export type CardFinish = {
  name: string;
  // Key into the checkout's price list (api/_lib/pricing.ts), which is
  // where the price itself comes from.
  priceLabel: string;
  blurb: string;
  image: string;
  alt: string;
  width: number;
  height: number;
};

// width/height are each image's native pixel size (post-crop) — used as the
// img element's intrinsic aspect ratio so cards of different proportions
// don't stretch or crop against a fixed box.
export const CARD_FINISHES: CardFinish[] = [
  {
    name: "Chairman's Card",
    priceLabel: "Chairman's Card",
    blurb: 'Solid gold finish. Reserved for the boldest introductions.',
    image: '/images/card-chairman.webp',
    alt: "LuxeCard in Chairman's Card finish",
    width: 912,
    height: 537,
  },
  {
    name: 'Plastic',
    priceLabel: 'Plastic',
    blurb: 'Light, durable and branded in your colours. Made for NFC tap-to-share.',
    image: '/images/card-plastic.webp',
    alt: 'LuxeCard in plastic finish',
    width: 960,
    height: 571,
  },
  {
    name: 'Wood: Natural & Black',
    priceLabel: 'Wood',
    blurb: 'Light, unique and taps better with NFC. Can also be printed in your brand colours.',
    image: '/images/card-wood.webp',
    alt: 'LuxeCard in real wood',
    width: 960,
    height: 550,
  },
  {
    name: 'Metallic: Silver & Black',
    priceLabel: 'Metallic',
    blurb: 'Premium, heavier and the most durable. Laser-engraved to precision.',
    image: '/images/card-metallic.webp',
    alt: 'LuxeCard in metallic finish',
    width: 960,
    height: 574,
  },
];

export const PROFESSIONAL_CHIPS = [
  'BANKING & FINANCE',
  'GOVERNMENT',
  'REAL ESTATE',
  'AVIATION',
  'LEGAL',
  'EXECUTIVES & C-SUITE',
];

export type PhotoMaterial = 'plastic' | 'wood' | 'metallic' | 'chairman';

export type ProfessionalPhoto = { caption: string; image?: string; alt?: string; material: PhotoMaterial };

// Portfolio photos live in src/assets/portfolio/ as <material>-NN.webp
// (square, 800px). Read automatically with import.meta.glob, so adding or
// removing a file there is all it takes — nothing here to keep in sync.
const PORTFOLIO_IMAGE_URLS = import.meta.glob<string>('/src/assets/portfolio/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

// The file name prefixes (folders, in effect), in the desktop grid's order.
type PhotoFolder = 'plastic' | 'wood' | 'metallic';
const FOLDER_ORDER: PhotoFolder[] = ['plastic', 'wood', 'metallic'];
const PORTFOLIO_FILENAME_PATTERN = /^(plastic|wood|metallic)-(\d+)\.webp$/;

// The Chairman's Cards (gold finish) among the metallic-NN photos: shown as
// "Chairman's Card", never "Metallic", but kept in their place in the
// desktop grid's order.
export const CHAIRMAN_PORTFOLIO_FILES = [
  'metallic-01', 'metallic-03', 'metallic-06', 'metallic-08', 'metallic-11', 'metallic-13',
  'metallic-16', 'metallic-18', 'metallic-21', 'metallic-23', 'metallic-26', 'metallic-28',
];

function discoverPortfolioPhotos(): Record<PhotoFolder, ProfessionalPhoto[]> {
  const byMaterial: Record<PhotoFolder, { n: number; photo: ProfessionalPhoto }[]> = {
    plastic: [],
    wood: [],
    metallic: [],
  };

  for (const [path, url] of Object.entries(PORTFOLIO_IMAGE_URLS)) {
    const filename = path.split('/').pop() ?? '';
    const match = PORTFOLIO_FILENAME_PATTERN.exec(filename);
    if (!match) {
      // A file that doesn't follow <material>-NN.webp is skipped rather than
      // breaking the build; check its name if a new photo isn't showing up.
      console.warn(`Portfolio photo "${filename}" doesn't match <material>-NN.webp, skipping it.`);
      continue;
    }
    const [, folder, digits] = match;
    const n = Number(digits);
    const chairman = CHAIRMAN_PORTFOLIO_FILES.includes(`${folder}-${digits}`);
    byMaterial[folder as PhotoFolder].push({
      n,
      photo: {
        caption: `${folder.toUpperCase()} ${digits}`,
        image: url,
        alt: chairman
          ? `LuxeCard Chairman's Card, portfolio example ${n}`
          : `LuxeCard ${folder}-finish business card, portfolio example ${n}`,
        material: chairman ? 'chairman' : (folder as PhotoFolder),
      },
    });
  }

  for (const list of Object.values(byMaterial)) list.sort((a, b) => a.n - b.n);
  return Object.fromEntries(Object.entries(byMaterial).map(([m, list]) => [m, list.map((x) => x.photo)])) as Record<
    PhotoFolder,
    ProfessionalPhoto[]
  >;
}

const PHOTOS_BY_FOLDER = discoverPortfolioPhotos();

// Interleaved by file name (plastic, wood, metallic, plastic, ...) so every
// row of the desktop grid mixes finishes; the mobile filter pills pick out
// one card type.
export const PROFESSIONAL_PHOTOS: ProfessionalPhoto[] = Array.from(
  { length: Math.max(...FOLDER_ORDER.map((f) => PHOTOS_BY_FOLDER[f].length)) },
  (_, i) => FOLDER_ORDER.filter((f) => i < PHOTOS_BY_FOLDER[f].length).map((f) => PHOTOS_BY_FOLDER[f][i])
).flat();

// Each card type's photos (the Chairman's Cards apart from Metallic).
export const PHOTOS_BY_MATERIAL: Record<PhotoMaterial, ProfessionalPhoto[]> = {
  plastic: PHOTOS_BY_FOLDER.plastic,
  wood: PHOTOS_BY_FOLDER.wood,
  metallic: PHOTOS_BY_FOLDER.metallic.filter((p) => p.material === 'metallic'),
  chairman: PHOTOS_BY_FOLDER.metallic.filter((p) => p.material === 'chairman'),
};

export const FOR_BUSINESS_BENEFITS = [
  { title: 'Consistent branding', body: 'Every profile on brand, every time.' },
  { title: 'Team profiles', body: 'Add, edit and retire members centrally.' },
  { title: 'Bulk deployment', body: 'One order, cards for the whole floor.' },
  { title: 'Event-ready', body: 'Capture contacts at conferences and activations.' },
];

// `group` labels the section a question sits under; the accordion prints a
// small heading whenever it changes. Placeholders inside an answer (see
// FaqAccordion): "{contact}" becomes a "Contact us" link to the site's
// WhatsApp contact; "{prices}" the card price list, with any offer applied;
// "{offer}" a sentence about the offer, only while one is on.
// `id` lets other pages (the card pages) reuse an answer without copying it;
// `cardPageA` is the answer's wording there, where it differs (the card
// pages order through their own form, not the cart).
export type Faq = { q: string; a: string; group?: string; id?: string; cardPageA?: string };

const GROUP_ORDERING = 'Ordering and pricing';
const GROUP_BUSINESSES = 'For businesses';
const GROUP_USING = 'Using your card';
const GROUP_AFTER = 'After you buy';

// Prices, finish names and the bulk discount come from the checkout's own
// price list (api/_lib/pricing.ts), so these answers always match what the
// order form shows and what customers are actually charged.
const FINISH_LABELS = Object.keys(FINISH_PRICES_BY_LABEL);
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const joinList = (items: string[], serialComma: boolean) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')}${serialComma ? ',' : ''} and ${items[items.length - 1]}`;
export const FINISH_LABELS_IN_ORDER = FINISH_LABELS;
export const joinFinishList = (items: string[]) => joinList(items, true);
const FINISH_PRICE_LIST = joinList(
  FINISH_LABELS.map((label) => `${label} ${formatKes(FINISH_PRICES_BY_LABEL[label])}`),
  true
);
const FINISH_NAME_LIST = joinList(FINISH_LABELS, false);
const FINISH_COUNT = NUMBER_WORDS[FINISH_LABELS.length] ?? String(FINISH_LABELS.length);
const BULK_DISCOUNT = `${Math.round(BULK_DISCOUNT_RATE * 100)}% off`;

export const FAQS: Faq[] = [
  {
    group: GROUP_ORDERING,
    q: 'How much does a LuxeCard cost?',
    a: `It depends on the material you choose: {prices}. Ordering more than ${BULK_DISCOUNT_THRESHOLD} cards? You automatically get ${BULK_DISCOUNT} at checkout.{offer}`,
  },
  {
    group: GROUP_ORDERING,
    q: 'How do I pay?',
    a: 'Pay securely through Paystack using M-Pesa, M-Pesa Till, Airtel Money or card. You’ll receive a payment receipt by email straight away.',
  },
  {
    group: GROUP_ORDERING,
    id: 'after-order',
    q: 'What happens after I order, and how long does it take?',
    a: `Our team will reach out within 24 hours to collect your details and brand assets. We’ll then design your card and share mockups for your review. Once you approve, production takes anywhere from a few hours to ${PRODUCTION_TIMEFRAME}, depending on your design. For large corporate orders, we’ll confirm the timeline with you. Delivery within Nairobi is free. Elsewhere, delivery fees vary by location and are paid by you upon arrival, except for the Chairman’s Card, where LuxeCard covers all transport costs. Metallic and Chairman’s Cards also come with free express delivery within Nairobi: your card arrives within 3 hours of you approving your design, at a location you arrange with our team on WhatsApp.`,
  },
  {
    group: GROUP_ORDERING,
    q: 'Who designs my card, and can I customise it?',
    a: `We do. Share your details and brand assets (logo, colours, name and title), and we’ll design your LuxeCard to your specifications, then share mockups for your review and approval before anything goes into production. Choose from ${FINISH_COUNT} materials: ${FINISH_NAME_LIST}.`,
  },
  {
    group: GROUP_BUSINESSES,
    id: 'teams',
    q: 'Can businesses get LuxeCards for their teams?',
    a: `Yes. Choose “For teams” when ordering to add cards for your whole team in one order, with ${BULK_DISCOUNT} when you order more than ${BULK_DISCOUNT_THRESHOLD} cards.`,
    cardPageA: `Yes. Tick “Ordering for a business?” in the order form and choose how many cards your team needs, with ${BULK_DISCOUNT} when you order more than ${BULK_DISCOUNT_THRESHOLD} cards.`,
  },
  {
    group: GROUP_BUSINESSES,
    id: 'etims',
    q: 'Do you provide eTIMS tax invoices?',
    a: `Yes. On a “For teams” order, tick “I need an eTIMS tax invoice” and enter your KRA PIN and registered business name. Your eTIMS invoice will be emailed within ${ETIMS_INVOICE_TIMEFRAME} of payment. Need a quotation first? Request one from your cart. Quotation orders need a 50% deposit to begin, with the balance due when your cards are ready.`,
    cardPageA: `Yes. In the order form, tick “Ordering for a business?”, then “I need an eTIMS tax invoice”, and enter your KRA PIN and registered business name. Your eTIMS invoice will be emailed within ${ETIMS_INVOICE_TIMEFRAME} of payment. Need a quotation first? Request a quote from the order form. Quotation orders need a 50% deposit to begin, with the balance due when your cards are ready.`,
  },
  {
    group: GROUP_USING,
    id: 'how-it-works',
    q: 'How does it work? Do I need an app?',
    a: 'No app needed, for you or the person you’re sharing with. Tap your card on their phone and your digital profile opens instantly in their browser, ready to save your contact details.',
  },
  {
    group: GROUP_USING,
    id: 'phones',
    q: 'Which phones does it work with?',
    a: 'Most modern smartphones read LuxeCard with a simple tap: iPhone XR and newer, and most Android phones with NFC switched on. If a phone doesn’t support tapping, they can scan the QR code on your card instead.',
  },
  {
    group: GROUP_USING,
    q: 'How many cards do I need?',
    a: 'Just one, unless you’re ordering for a team. Your card comes with a full digital profile that you can save to your phone’s home screen, so it’s always with you, even when the physical card isn’t in your pocket. Whenever you need to share your contact, simply show the QR code on your digital card.',
  },
  {
    group: GROUP_USING,
    id: 'update-profile',
    q: 'Can I update what’s on my profile?',
    // Merges the original "Can I update my information after getting my
    // card?" and "What can I include on my digital profile?" answers.
    a: 'Yes. Your profile can include your name, title, company, a short introduction, contact details, WhatsApp, socials, website, portfolio and other links. Change your details, links or photo any time, and your card keeps pointing to your current profile.',
  },
  {
    group: GROUP_AFTER,
    id: 'fees',
    q: 'Are there any monthly or yearly fees?',
    a: 'No. Each LuxeCard is a one-off payment, with no subscriptions or recurring fees.',
  },
];

// The customer count the site quotes ("1000+ professionals").
export const CUSTOMER_COUNT = 1000;

export type Testimonial = { quote: string; name: string };

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Got amazing smart business cards for my team and I. My networking game just moved a notch higher with executives I interact with this days. Excellent customer experience as well.',
    name: 'Lyban Mbatha',
  },
  {
    quote: 'Amazing and professional service all through. I would highly recommend them to anyone seeking this service.',
    name: 'CR Advocates LLP',
  },
  { quote: 'The Metal is of very high quality. Highly recommend to others.', name: 'Chirag Solanki' },
  { quote: 'The design is clean and premium and the purchase experience was excellent.', name: 'K. Keli' },
  { quote: 'I paid and got it same day. Great service. Love the design.', name: 'Chizaram Ucheaga' },
  { quote: 'The cards are as good in person as they look on video.', name: 'Stanley Juma' },
];

export const FOOTER_LINKS = {
  // "Cards" to match the nav, where the card pages replaced "Products".
  columnOne: {
    title: 'Explore',
    links: NAV_LINKS.map((link) => (link.href === '#products' ? { ...link, label: 'Cards' } : link)),
  },
  columnTwo: {
    title: 'Connect',
    links: [
      { label: 'Contact', href: LINKS.CONTACT },
      { label: 'Instagram', href: LINKS.SOCIAL.instagram },
      { label: 'LinkedIn', href: LINKS.SOCIAL.linkedin },
      { label: 'Facebook', href: LINKS.SOCIAL.facebook },
      { label: 'TikTok', href: LINKS.SOCIAL.tiktok },
      { label: 'YouTube', href: LINKS.SOCIAL.youtube },
    ],
  },
  columnThree: {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: LINKS.LEGAL.terms },
      { label: 'Privacy and Data Protection', href: LINKS.LEGAL.privacy },
      { label: 'Return Policy', href: LINKS.LEGAL.returns },
    ],
  },
};

// An FAQ answer as plain text (structured data, anything that can't render
// the accordion's placeholders): regular prices, no offer sentence.
export function faqAnswerText(answer: string): string {
  return answer.replace(/\{prices\}/g, FINISH_PRICE_LIST).replace(/\{offer\}/g, '').replace(/\{contact\}/g, 'Contact us');
}
