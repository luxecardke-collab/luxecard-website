import type { IncomingMessage, ServerResponse } from 'http';
import { sendTeamEmail } from './_lib/email.js';
import { cleanString, isEmail, isHoneypotTripped, oneHourAgo, MAX_SHORT } from './_lib/input.js';
import { getClientIp, isRateLimited } from './_lib/rateLimit.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

type AffiliateSignupBody = {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  social?: unknown;
  hp?: unknown;
};

type VercelRequest = IncomingMessage & { body?: unknown };
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

const MAX_REFERRAL_CODE_ATTEMPTS = 5;
const MAX_SIGNUPS_PER_EMAIL_PER_HOUR = 3;
// Stops a bot flooding signups from burning the email quota; the signup is
// still saved, only the alert email skips.
const MAX_ALERTS_PER_HOUR = 20;
// Alongside the per-email limit above: a scripted flood using a fresh fake
// email on every request would otherwise never trip that one at all.
const MAX_ATTEMPTS_PER_IP_PER_HOUR = 10;
const HOUR_MS = 60 * 60 * 1000;
// Postgres unique_violation — used here to retry on a referral_code collision.
const UNIQUE_VIOLATION = '23505';
// Must match the referral_link column in migration 0004 and the ?ref= parameter
// read by src/utils/referralCode.ts.
const REFERRAL_LINK_BASE = 'https://www.luxecard.co.ke/?ref=';

function generateReferralCode(fullName: string): string {
  const base =
    fullName
      .split(/\s+/)[0]
      ?.replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 8) || 'LUXE';
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body: AffiliateSignupBody;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as AffiliateSignupBody);
  } catch {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  // A bot filled the hidden field: pretend it worked and store nothing.
  if (isHoneypotTripped(body?.hp)) {
    res.status(200).json({ status: 'pending' });
    return;
  }

  if (await isRateLimited('affiliates', getClientIp(req), MAX_ATTEMPTS_PER_IP_PER_HOUR, HOUR_MS)) {
    res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    return;
  }

  const fullName = cleanString(body?.fullName, MAX_SHORT);
  const email = cleanString(body?.email, MAX_SHORT).toLowerCase();
  const phone = cleanString(body?.phone, 50);
  const social = cleanString(body?.social, MAX_SHORT);

  if (!fullName || !phone || !isEmail(email)) {
    res.status(400).json({ error: 'Missing or invalid full name, email, or phone.' });
    return;
  }

  const supabase = getSupabaseAdmin();
  const since = oneHourAgo();

  const { count: fromThisEmail } = await supabase
    .from('affiliates')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', since);
  if ((fromThisEmail ?? 0) >= MAX_SIGNUPS_PER_EMAIL_PER_HOUR) {
    res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    return;
  }

  const { count: recentSignups } = await supabase
    .from('affiliates')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);

  for (let attempt = 0; attempt < MAX_REFERRAL_CODE_ATTEMPTS; attempt++) {
    const referralCode = generateReferralCode(fullName);
    // New affiliates start 'pending': their referral_code exists but is not
    // yet honored at checkout (see paystack-webhook.ts) until this is
    // flipped to 'active' by hand in Supabase.
    const { data, error } = await supabase
      .from('affiliates')
      .insert({
        name: fullName,
        email,
        phone,
        social_handle: social || null,
        referral_code: referralCode,
        status: 'pending',
      })
      .select('referral_code')
      .single();

    if (!error && data) {
      // Saved. The alert is best-effort and must never turn a saved signup
      // into an error for the applicant.
      if ((recentSignups ?? 0) >= MAX_ALERTS_PER_HOUR) {
        console.error('Affiliate alert email skipped: hourly alert limit reached.');
      } else {
        await sendTeamEmail({
          subject: `New affiliate signup: ${fullName}`,
          heading: 'New affiliate signup',
          rows: [
            ['Name', fullName],
            ['Phone', phone],
            ['Email', email],
            ['Social handle', social],
            ['Referral link', `${REFERRAL_LINK_BASE}${data.referral_code}`],
            ['Referral code', data.referral_code],
          ],
          // No replyTo on purpose: a reply must go to the team inbox, never to the
          // applicant with this alert (and their code) quoted underneath it.
          // Not about a payment, so sales gets a copy too.
          salesCopy: true,
          note: 'DO NOT SEND THIS LINK UNTIL ACTIVATED: set status to active in Supabase first (affiliates table). Until then it earns no commission. The applicant has not been sent their code or link.',
        });
      }
      // The applicant is only told their application is pending: their code and
      // link are sent by hand once the team has activated them.
      res.status(200).json({ status: 'pending' });
      return;
    }

    if (error?.code !== UNIQUE_VIOLATION) {
      console.error('Failed to insert affiliate:', error);
      res.status(500).json({ error: 'Could not complete signup. Please try again.' });
      return;
    }
    // Otherwise: referral_code collision, loop and try a freshly generated one.
  }

  res.status(500).json({ error: 'Could not generate a unique referral code. Please try again.' });
}
