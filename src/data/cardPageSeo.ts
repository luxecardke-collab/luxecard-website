import { FINISH_PRICES_BY_LABEL } from '../../api/_lib/pricing';
import { formatKes } from '../utils/formatPrice';

// Each card landing page's URL and head tags (the rest of each page is in
// cardPages.ts). Kept apart, with no images, because vite.config.ts loads
// src/seo/pages.ts, which reads this list. Only pages listed here are built,
// linked from the nav and in the sitemap.
export type CardPageSeo = { slug: 'wood' | 'plastic' | 'metal' | 'chairman'; title: string; description: string };

export const CARD_PAGE_SEO: CardPageSeo[] = [
  {
    slug: 'plastic',
    title: 'Plastic NFC Business Card | LuxeCard Kenya',
    description: `A durable plastic NFC + QR business card in any colour you like. One tap shares your digital profile. ${formatKes(
      FINISH_PRICES_BY_LABEL.Plastic
    )}. Order online and pay securely.`,
  },
  {
    slug: 'wood',
    title: 'Wood NFC Business Card | LuxeCard Kenya',
    // The regular price: this text is fixed when the site is built, so it
    // can't follow an offer's start and end times. The page itself does.
    description: `A real wood NFC + QR business card in Natural or Black. One tap shares your digital profile. ${formatKes(
      FINISH_PRICES_BY_LABEL.Wood
    )}. Order online and pay securely.`,
  },
  {
    slug: 'metal',
    title: 'Metallic NFC Business Card | LuxeCard Kenya',
    description: `A metallic NFC + QR business card in Silver or Black. One tap shares your digital profile. ${formatKes(
      FINISH_PRICES_BY_LABEL.Metallic
    )}. Order online and pay securely.`,
  },
  {
    slug: 'chairman',
    title: 'Chairman’s Card: Gold NFC Business Card | LuxeCard Kenya',
    description: `The LuxeCard Chairman’s Card: a gold finish NFC + QR business card. One tap shares your digital profile. ${formatKes(
      FINISH_PRICES_BY_LABEL["Chairman's Card"]
    )}. Order online and pay securely.`,
  },
];
