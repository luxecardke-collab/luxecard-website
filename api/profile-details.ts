import crypto from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import { isTestEnvironment } from './_lib/attribution.js';
import { describeEmailResult, formatKes, sendTeamEmail, type AlertRow } from './_lib/email.js';
import { cleanString, isEmail, isHoneypotTripped } from './_lib/input.js';
import {
  isSocialNetwork,
  MAX_BIO,
  MAX_SOCIALS,
  MAX_TEXT,
  MAX_UPLOAD_BYTES,
  normalizeKenyanPhone,
  normalizeUrl,
  PROFILE_BUCKET,
  REF_PATTERN,
  SOCIAL_NETWORKS,
  UPLOAD_PATH_PATTERN,
  UPLOAD_TYPES,
  WHATSAPP_REF_PATTERN,
  type SocialNetwork,
  type UploadKind,
} from './_lib/profileDetails.js';
import { getClientIp, isRateLimited } from './_lib/rateLimit.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

type VercelRequest = IncomingMessage & { body?: unknown };
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

// The profile details form (www.luxecard.co.ke/details), two actions:
// - "upload-url": a short-lived signed URL for the browser to upload one
//   file straight to the private profile-uploads bucket (files never pass
//   through this function, which has a request size limit);
// - "submit": checks the details again, saves them (profile_submissions),
//   and emails the team with 7-day signed links to the files. The email's
//   outcome is recorded on the row (alert_status) and never changes the
//   answer: once the details are saved, the customer gets their thank-you.
// Nothing about any order is ever sent back to the browser.

const MAX_UPLOAD_URLS_PER_IP_PER_HOUR = 40;
const MAX_SUBMISSIONS_PER_IP_PER_HOUR = 10;
const HOUR_MS = 60 * 60 * 1000;
const ALERT_LINK_SECONDS = 7 * 24 * 60 * 60;
const KINDS: UploadKind[] = ['business_card', 'photo', 'logo'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  let body: Record<string, unknown>;
  try {
    body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as Record<string, unknown>;
  } catch {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Invalid request.' });
    return;
  }
  if (body.action === 'upload-url') return uploadUrl(req, res, body);
  if (body.action === 'submit') return submit(req, res, body);
  res.status(400).json({ error: 'Unknown action.' });
}

async function uploadUrl(req: VercelRequest, res: VercelResponse, body: Record<string, unknown>) {
  const kind = KINDS.find((k) => k === body.kind);
  const contentType = typeof body.contentType === 'string' ? body.contentType.toLowerCase() : '';
  const size = typeof body.size === 'number' ? body.size : NaN;
  const ext = kind ? UPLOAD_TYPES[kind][contentType] : undefined;
  if (!kind || !ext) {
    res.status(400).json({ error: "This file type isn't accepted here." });
    return;
  }
  if (!(size > 0 && size <= MAX_UPLOAD_BYTES)) {
    res.status(400).json({ error: 'Files can be up to 10MB.' });
    return;
  }
  if (await isRateLimited('profile-upload', getClientIp(req), MAX_UPLOAD_URLS_PER_IP_PER_HOUR, HOUR_MS)) {
    res.status(429).json({ error: 'Too many uploads. Please try again later.' });
    return;
  }

  const month = new Date().toISOString().slice(0, 7);
  const path = `${month}/${crypto.randomUUID()}/${kind}.${ext}`;
  const { data, error } = await getSupabaseAdmin().storage.from(PROFILE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('Could not create a signed upload URL:', error);
    res.status(500).json({ error: 'Upload is unavailable right now. Please try again.' });
    return;
  }
  res.status(200).json({ path, signedUrl: data.signedUrl });
}

// A file the browser says it uploaded: the right shape for its kind, and
// actually in the bucket.
async function uploadedPath(value: unknown, kind: UploadKind): Promise<string | null | 'invalid'> {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !UPLOAD_PATH_PATTERN.test(value) || !value.includes(`/${kind}.`)) return 'invalid';
  const { data } = await getSupabaseAdmin().storage.from(PROFILE_BUCKET).exists(value);
  return data ? value : 'invalid';
}

async function submit(req: VercelRequest, res: VercelResponse, body: Record<string, unknown>) {
  // A bot filled the hidden field: pretend it worked and store nothing.
  if (isHoneypotTripped(body.hp)) {
    res.status(200).json({ ok: true });
    return;
  }
  if (await isRateLimited('profile-details', getClientIp(req), MAX_SUBMISSIONS_PER_IP_PER_HOUR, HOUR_MS)) {
    res.status(429).json({ error: 'Too many submissions. Please try again later.' });
    return;
  }

  const [businessCard, photo, logo] = await Promise.all([
    uploadedPath(body.businessCardPath, 'business_card'),
    uploadedPath(body.photoPath, 'photo'),
    uploadedPath(body.logoPath, 'logo'),
  ]);
  if (businessCard === 'invalid' || photo === 'invalid' || logo === 'invalid') {
    res.status(400).json({ error: 'One of the files didn’t upload. Please add it again.' });
    return;
  }

  // With a business card, only the name, WhatsApp number and consent are
  // needed; the team copies the rest from the card.
  const fullName = cleanString(body.fullName, MAX_TEXT);
  const phone = normalizeKenyanPhone(cleanString(body.phone, 40));
  const secondPhoneRaw = cleanString(body.secondPhone, 40);
  const secondPhone = secondPhoneRaw ? normalizeKenyanPhone(secondPhoneRaw) : null;
  const email = cleanString(body.email, MAX_TEXT).toLowerCase();
  const websiteRaw = cleanString(body.website, 600);
  const website = websiteRaw ? normalizeUrl(websiteRaw) : null;
  const bio = cleanString(body.bio, MAX_BIO + 50);

  const errors: string[] = [];
  if (!fullName) errors.push('name');
  if (!phone) errors.push('phone');
  if (secondPhoneRaw && !secondPhone) errors.push('second phone');
  if (email ? !isEmail(email) : !businessCard) errors.push('email');
  if (websiteRaw && !website) errors.push('website');
  if (bio.length > MAX_BIO) errors.push('bio');
  if (body.consent !== true) errors.push('consent');

  const socialsIn = Array.isArray(body.socials) ? body.socials : [];
  const socials: { network: SocialNetwork; url: string }[] = [];
  if (socialsIn.length > MAX_SOCIALS) errors.push('social links');
  for (const item of socialsIn.slice(0, MAX_SOCIALS)) {
    const s = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const url = typeof s.url === 'string' ? normalizeUrl(s.url) : null;
    if (!isSocialNetwork(s.network) || !url) {
      errors.push('social links');
      break;
    }
    socials.push({ network: s.network, url });
  }
  if (errors.length) {
    res.status(400).json({ error: `Please check: ${[...new Set(errors)].join(', ')}.` });
    return;
  }

  const supabase = getSupabaseAdmin();
  const isTest = isTestEnvironment();

  // The order or WhatsApp chat this came from, if ?ref= matches one. Only
  // used for the row and the team's email, never shown to the customer.
  const refRaw = cleanString(body.ref, 100);
  const ref = REF_PATTERN.test(refRaw) ? refRaw : null;
  let orderId: string | null = null;
  let whatsappRef: string | null = null;
  let matchLine = ref ? `No order match (ref ${ref})` : 'No order match (no ref)';
  if (ref && WHATSAPP_REF_PATTERN.test(ref.toUpperCase())) {
    const code = ref.toUpperCase();
    const { data } = await supabase.from('whatsapp_refs').select('code').eq('code', code).maybeSingle();
    if (data) {
      whatsappRef = data.code;
      matchLine = `WhatsApp reference ${data.code}`;
    }
  } else if (ref) {
    const { data } = await supabase
      .from('orders')
      .select('id, customer_name, total, payment_status, order_source')
      .eq('paystack_reference', ref)
      .maybeSingle();
    if (data) {
      orderId = data.id;
      matchLine = `Order ${ref}: ${data.customer_name}, ${formatKes(data.total)}, ${data.payment_status}${data.order_source === 'whatsapp' ? ' (WhatsApp sale)' : ''}`;
    }
  }

  const { data: saved, error } = await supabase.from('profile_submissions').insert({
    ref,
    order_id: orderId,
    whatsapp_ref: whatsappRef,
    full_name: fullName,
    phones: secondPhone ? [phone as string, secondPhone] : [phone as string],
    email: email || null,
    title: cleanString(body.title, MAX_TEXT) || null,
    company: cleanString(body.company, MAX_TEXT) || null,
    website,
    socials,
    bio: bio || null,
    business_card_path: businessCard,
    photo_path: photo,
    logo_path: logo,
    consent_at: new Date().toISOString(),
    is_test: isTest,
  }).select('id').single();
  if (error || !saved) {
    console.error('Failed to save profile details:', error);
    res.status(500).json({ error: 'We couldn’t save your details. Please try again.' });
    return;
  }

  // 7-day links for the team; the files themselves stay private.
  const link = async (path: string | null) => {
    if (!path) return null;
    const { data } = await supabase.storage.from(PROFILE_BUCKET).createSignedUrl(path, ALERT_LINK_SECONDS);
    return data?.signedUrl ?? `(link unavailable: ${path})`;
  };
  const [cardLink, photoLink, logoLink] = await Promise.all([link(businessCard), link(photo), link(logo)]);
  const networkLabel = (id: SocialNetwork) => SOCIAL_NETWORKS.find((n) => n.id === id)?.label ?? id;
  const rows: AlertRow[] = [
    ['Matched', matchLine],
    ['Name', fullName],
    ['Phone (WhatsApp)', phone],
    ['Second phone', secondPhone],
    ['Email', email],
    ['Job title', cleanString(body.title, MAX_TEXT)],
    ['Company', cleanString(body.company, MAX_TEXT)],
    ['Website', website],
    ['Social links', socials.map((s) => `${networkLabel(s.network)}: ${s.url}`).join('\n')],
    ['Bio', bio],
    ['Business card', cardLink],
    ['Profile photo', photoLink],
    ['Logo', logoLink],
  ];
  const alert = await sendTeamEmail({
    subject: `${isTest ? '[TEST] ' : ''}Profile details received: ${fullName}`,
    heading: 'Profile details received',
    rows,
    note: [
      businessCard ? 'They sent a business card: copy the details from it for anything not filled in above.' : '',
      'File links work for 7 days.',
    ]
      .filter(Boolean)
      .join(' '),
    ...(email ? { replyTo: email } : {}),
  });

  // What happened to the email, on the row; a problem here is only logged.
  const alertStatus = describeEmailResult(alert);
  if (alert.status === 'failed') console.error(`Profile details ${saved.id}: alert email ${alertStatus}`);
  const { error: statusError } = await supabase.from('profile_submissions').update({ alert_status: alertStatus }).eq('id', saved.id);
  if (statusError) console.error(`Profile details ${saved.id}: couldn't record the alert status:`, statusError);

  // Previews also report the email's outcome, for testing; the live site
  // never tells the customer anything about it.
  res.status(200).json(isTest ? { ok: true, alert: alertStatus } : { ok: true });
}
