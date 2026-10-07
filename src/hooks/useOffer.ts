import { useSyncExternalStore } from 'react';
import { activeOffer, type Offer } from '../../api/_lib/pricing';
import { serverNow, subscribeServerClock } from '../utils/serverClock';

/**
 * The offer on right now by the server's clock (see utils/serverClock), or
 * null. Always null in the prerendered HTML and while hydrating it, so the
 * offer only ever appears once the server's time is known.
 */
export function useOffer(): Offer | null {
  return useSyncExternalStore(
    subscribeServerClock,
    () => activeOffer(serverNow()),
    () => null
  );
}
