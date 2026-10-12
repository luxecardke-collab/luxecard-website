import { useSyncExternalStore } from 'react';
import { activeOffer, type Offer } from '../../api/_lib/pricing';
import { firstPaintOffer } from '../utils/firstPaintOffer';
import { serverNow, subscribeServerClock } from '../utils/serverClock';

/**
 * The offer on right now by the server's clock (see utils/serverClock), or
 * null. Until the server's time is known (in the prerendered HTML, while
 * hydrating it, and just after), it's the offer the page was served with
 * (utils/firstPaintOffer), which the server's clock chose too.
 */
export function useOffer(): Offer | null {
  return useSyncExternalStore(
    subscribeServerClock,
    () => {
      const now = serverNow();
      return now ? activeOffer(now) : firstPaintOffer();
    },
    firstPaintOffer
  );
}
