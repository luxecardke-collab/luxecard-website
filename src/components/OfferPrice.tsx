import { offerUnitPrice, type Offer } from '../../api/_lib/pricing';
import { formatKes } from '../utils/formatPrice';
import { offerHeadline, offerLastDay } from '../utils/offerText';

/**
 * A card price (`price` is the regular price, per card or for a line).
 * With an offer on, the regular price is shown muted with a line through it
 * and the offer price after it, in the surrounding price style.
 */
export function OfferPrice({ price, offer, quantity = 1 }: { price: number; offer: Offer | null; quantity?: number }) {
  const regular = price * quantity;
  if (!offer) return <>{formatKes(regular)}</>;
  // Each price stays on one line ("KES" never separated from its number).
  return (
    <>
      <span className="sr-only">Was </span>
      <s className="mr-2 whitespace-nowrap font-normal text-[rgba(243,240,234,.42)] decoration-[rgba(243,240,234,.42)]">
        {formatKes(regular)}
      </s>
      <span className="sr-only">, now </span>
      <span className="whitespace-nowrap">{formatKes(offerUnitPrice(price, offer) * quantity)}</span>
    </>
  );
}

/** The small gold label that goes near offer prices. */
export function OfferBadge({ offer, showEnd = false, className = '' }: { offer: Offer; showEnd?: boolean; className?: string }) {
  // Each part stays whole; on a narrow screen the end date moves to its own
  // line instead of either part breaking mid-phrase.
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-[12px] border border-[rgba(253,211,3,.35)] bg-[rgba(253,211,3,.08)] px-2.5 py-[5px] font-inter text-[11px] font-medium leading-[1.35] tracking-[.01em] text-accent ${className}`}
    >
      <span className="whitespace-nowrap">{offerHeadline(offer)}</span>
      {showEnd && <span className="whitespace-nowrap text-[rgba(253,211,3,.7)]">Ends {offerLastDay(offer)}</span>}
    </span>
  );
}
