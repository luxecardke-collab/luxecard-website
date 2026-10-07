import type { IncomingMessage, ServerResponse } from 'http';
import { activeOffer, nextOfferChange } from './_lib/pricing.js';

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

// The server's current time and the offer on right now (api/_lib/pricing.ts
// OFFERS). The site prices everything it shows from this time, never the
// visitor's device clock, so what a visitor sees matches what checkout will
// charge. Never cached: it's the clock.
export default function handler(req: IncomingMessage, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const now = new Date();
  const offer = activeOffer(now);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    now: now.getTime(),
    offerId: offer?.id ?? null,
    nextChange: nextOfferChange(now)?.getTime() ?? null,
  });
}
