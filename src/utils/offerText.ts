import { offerUnitPrice, type Offer } from '../../api/_lib/pricing';
import { formatKes } from './formatPrice';

// Text-only version, for places that can't hold markup (a <select>'s options).
export function offerPriceText(price: number, offer: Offer | null): string {
  return offer ? `${formatKes(offerUnitPrice(price, offer))} (was ${formatKes(price)})` : formatKes(price);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Sun 11 Oct": the offer's last day, in East Africa Time (UTC+3, no
// daylight saving). Worked out by hand rather than with Intl, whose output
// differs between Node (the prerendered card pages) and browsers.
export function offerLastDay(offer: Offer): string {
  const eat = new Date(Date.parse(offer.endsAt) - 1 + 3 * 60 * 60 * 1000);
  return `${WEEKDAYS[eat.getUTCDay()]} ${eat.getUTCDate()} ${MONTHS[eat.getUTCMonth()]}`;
}

export function offerHeadline(offer: Offer): string {
  return `${offer.name}: ${Math.round(offer.rate * 100)}% off`;
}
