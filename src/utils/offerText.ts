import { offerUnitPrice, type Offer } from '../../api/_lib/pricing';
import { formatKes } from './formatPrice';

// Text-only version, for places that can't hold markup (a <select>'s options).
export function offerPriceText(price: number, offer: Offer | null): string {
  return offer ? `${formatKes(offerUnitPrice(price, offer))} (was ${formatKes(price)})` : formatKes(price);
}

// "Sun 11 Oct": the offer's last day, in East Africa Time.
export function offerLastDay(offer: Offer): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(Date.parse(offer.endsAt) - 1));
}

export function offerHeadline(offer: Offer): string {
  return `${offer.name}: ${Math.round(offer.rate * 100)}% off`;
}
