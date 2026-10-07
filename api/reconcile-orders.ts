import type { IncomingMessage, ServerResponse } from 'http';
import { fetchWithTimeout } from './_lib/http.js';
import { recordPaidOrder, type PaystackOrderMetadata } from './_lib/orders.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

const LOOKBACK_DAYS = 3;
const PER_PAGE = 100;
const MAX_PAGES = 20; // 2,000 transactions - a generous ceiling for 3 days of orders.
const PAYSTACK_TIMEOUT_MS = 10000; // A larger list response can take a bit longer than a single lookup.
const RATE_LIMIT_HITS_RETENTION_MS = 24 * 60 * 60 * 1000;

type PaystackTransaction = {
  reference: string;
  status: string;
  metadata?: PaystackOrderMetadata | null;
  amount?: number;
  paid_at?: string | null;
  paidAt?: string | null;
};

// Last-resort safety net for H1 (a paid order that never got recorded,
// because the webhook was missed and the customer never landed back on the
// confirmation page for order-status.ts's own self-heal to catch it).
// Runs daily via Vercel Cron (see vercel.json) and is otherwise only ever
// reachable with the CRON_SECRET Vercel sends automatically for scheduled
// invocations - see https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs.
export default async function handler(req: IncomingMessage, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ error: 'Server is missing PAYSTACK_SECRET_KEY.' });
    return;
  }

  const from = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date().toISOString();

  const supabase = getSupabaseAdmin();

  // Housekeeping for the rate_limit_hits table (migration 0007): rows are
  // only ever queried within their own short window (minutes), so anything
  // older than a day is just dead weight. Wrapped in its own try/catch so a
  // cleanup failure can never block or fail the actual reconciliation work
  // below - that's the important part of this run.
  let rateLimitHitsDeleted: number | null = null;
  try {
    const cutoff = new Date(Date.now() - RATE_LIMIT_HITS_RETENTION_MS).toISOString();
    const { error: cleanupError, count } = await supabase
      .from('rate_limit_hits')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff);
    if (cleanupError) {
      console.error('Reconciliation: failed to clean up rate_limit_hits:', cleanupError);
    } else {
      rateLimitHitsDeleted = count ?? 0;
    }
  } catch (err) {
    console.error('Reconciliation: rate_limit_hits cleanup threw:', err);
  }

  // One query for every reference we already have in the lookback window,
  // checked in memory below - far cheaper than a round trip per transaction.
  const { data: existingOrders } = await supabase
    .from('orders')
    .select('paystack_reference')
    .gte('created_at', from);
  const existingRefs = new Set((existingOrders ?? []).map((o) => o.paystack_reference).filter(Boolean));

  let checked = 0;
  let recovered = 0;
  const recoveredReferences: string[] = [];

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `https://api.paystack.co/transaction?status=success&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&perPage=${PER_PAGE}&page=${page}`;
      const listRes = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${secretKey}` } }, PAYSTACK_TIMEOUT_MS);
      const listData = (await listRes.json()) as { data?: PaystackTransaction[]; meta?: { pageCount?: number } };

      if (!listRes.ok || !Array.isArray(listData.data)) {
        console.error('Reconciliation: Paystack transaction list request failed.', listRes.status);
        break;
      }

      for (const txn of listData.data) {
        checked++;
        if (existingRefs.has(txn.reference)) continue;

        const result = await recordPaidOrder(txn.reference, txn.metadata ?? {}, 'cron', txn);
        if (!result.ok) {
          console.error(`Reconciliation: could not recover ${txn.reference}:`, result.error);
          continue;
        }
        if (result.created) {
          recovered++;
          recoveredReferences.push(txn.reference);
        }
        // Recorded (or already-existing) references never need re-checking
        // again within this same run.
        existingRefs.add(txn.reference);
      }

      const pageCount = listData.meta?.pageCount ?? 1;
      if (page >= pageCount) break;
    }
  } catch (err) {
    console.error('Reconciliation run failed partway through:', err);
    res.status(500).json({ error: 'Reconciliation failed.', checked, recovered, recoveredReferences, rateLimitHitsDeleted });
    return;
  }

  res.status(200).json({ checked, recovered, recoveredReferences, rateLimitHitsDeleted });
}
