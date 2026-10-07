import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { recordPaidOrder, type PaystackOrderMetadata } from './_lib/orders.js';

// Disables Vercel's automatic JSON body parsing so we can verify Paystack's
// signature against the exact raw bytes they signed — parsing and
// re-serializing the body first would break the HMAC comparison.
export const config = {
  api: { bodyParser: false },
};

type VercelRequest = IncomingMessage & { body?: unknown };
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ error: 'Server is missing PAYSTACK_SECRET_KEY.' });
    return;
  }

  const rawBody = await readRawBody(req);

  const expectedSignature = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
  const receivedSignature = req.headers['x-paystack-signature'];

  if (!receivedSignature || receivedSignature !== expectedSignature) {
    // Do not process anything from a request that didn't genuinely come
    // from Paystack.
    res.status(401).json({ error: 'Invalid signature.' });
    return;
  }

  let event: {
    event: string;
    data: { reference: string; metadata?: PaystackOrderMetadata; amount?: number; paid_at?: string | null; paidAt?: string | null };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: 'Invalid JSON payload.' });
    return;
  }

  // Acknowledge every other event type without acting on it (e.g.
  // charge.failed) — Paystack only needs a 200, not a specific action.
  if (event.event !== 'charge.success') {
    res.status(200).json({ received: true });
    return;
  }

  const { reference, metadata } = event.data;
  const result = await recordPaidOrder(reference, metadata ?? {}, 'webhook', event.data);

  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.status(200).json({ received: true, alreadyProcessed: !result.created });
}
