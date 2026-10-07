import { nextOfferChange } from '../../api/_lib/pricing';

// The server's clock, as far as the site is concerned: offers are decided
// by server time (api/_lib/pricing.ts), so prices shown here follow the
// server's clock too, never the visitor's device clock (which can be off by
// hours). Read once from /api/offer; until then (or if it can't be reached)
// there's no server time, and prices show without any offer.

let offsetMs: number | null = null; // server time minus device time
let syncing = false;
let boundaryTimer: number | undefined;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

export function serverNow(): Date | null {
  return offsetMs === null ? null : new Date(Date.now() + offsetMs);
}

export function subscribeServerClock(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Re-renders prices at the exact moment an offer starts or ends, so a page
// left open switches by itself. Timers are throttled in background tabs, so
// coming back to the tab re-checks too.
function scheduleNextChange() {
  window.clearTimeout(boundaryTimer);
  const now = serverNow();
  const next = now && nextOfferChange(now);
  if (!now || !next) return;
  const delay = Math.min(next.getTime() - now.getTime() + 50, 2 ** 31 - 1);
  boundaryTimer = window.setTimeout(() => {
    notify();
    scheduleNextChange();
  }, delay);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    notify();
    scheduleNextChange();
  });
}

/**
 * Reads the server's time from /api/offer (once; a few retries if it
 * fails). Called once the page has loaded, and again by the cart and order
 * form, which can't wait. `force` re-reads it, e.g. after checkout reported
 * that prices changed.
 */
export async function syncServerClock(force = false): Promise<void> {
  if (syncing || (offsetMs !== null && !force)) return;
  syncing = true;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const sentAt = Date.now();
        const res = await fetch('/api/offer', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { now?: unknown };
        if (typeof data.now !== 'number') throw new Error('No server time');
        const receivedAt = Date.now();
        // The server read its clock about halfway through the round trip.
        offsetMs = data.now - (sentAt + receivedAt) / 2;
        notify();
        scheduleNextChange();
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  } finally {
    syncing = false;
  }
}
