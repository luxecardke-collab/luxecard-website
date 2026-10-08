import type { IncomingMessage, ServerResponse } from 'http';
import { isTestEnvironment, readAttribution } from './_lib/attribution.js';
import { describeMetaResult, metaTestMode, sendMetaEvent, type MetaResult } from './_lib/metaCapi.js';
import { EVENT_ID_PATTERN, sameSiteUrl, visitorMetaUser } from './_lib/metaRequest.js';
import { getClientIp, isRateLimited } from './_lib/rateLimit.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

type VercelRequest = IncomingMessage & { body?: unknown };
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

// A tap on any WhatsApp button. Saves the visitor's reference code (the
// "Ref: LC-…" at the end of their pre-filled message) with where they came
// from, logs which button was tapped, and, for visitors who accepted
// cookies, sends Meta's "Contact" event (the browser sends its Pixel copy
// with the same event_id). The browser opens WhatsApp without waiting for
// this, so nothing here can hold the customer up.
const CODE_PATTERN = /^LC-[A-HJ-NP-Z2-9]{4,6}$/;
const LABEL_PATTERN = /^[a-z0-9-]{1,40}$/;
const MAX_PER_IP = 60;
const WINDOW_MS = 10 * 60 * 1000;

const clip = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

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
  const code = body?.code;
  const button = body?.button;
  const section = body?.section;
  if (
    typeof code !== 'string' ||
    !CODE_PATTERN.test(code) ||
    typeof button !== 'string' ||
    !LABEL_PATTERN.test(button) ||
    typeof section !== 'string' ||
    !LABEL_PATTERN.test(section)
  ) {
    res.status(400).json({ error: 'Invalid click.' });
    return;
  }
  if (await isRateLimited('whatsapp-click', getClientIp(req), MAX_PER_IP, WINDOW_MS)) {
    res.status(429).json({ error: 'Too many requests.' });
    return;
  }

  const consent = body.consent === true;
  const user = visitorMetaUser(req, consent ? body : {});
  const page = clip(body.page, 200);
  const attribution = readAttribution(body.attribution);
  const isTest = isTestEnvironment();

  // Save the code (first tap) or refresh it (later taps), then the tap
  // itself. A database problem is logged but never stops the Meta event.
  let saved = false;
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from('whatsapp_refs')
      .select('code, fbc, fbp, utm_source, fbclid, referral_code')
      .eq('code', code)
      .maybeSingle();
    if (!existing) {
      const { error } = await supabase.from('whatsapp_refs').insert({
        code,
        first_button: button,
        first_section: section,
        first_page: page,
        ...attribution,
        // Meta's browser/click IDs only for visitors who accepted cookies.
        fbc: consent ? user.fbc : null,
        fbp: consent ? user.fbp : null,
        cookie_consent: consent,
        // The affiliate code (?ref=) the visitor arrived with, if any.
        referral_code: clip(body.referral_code, 64),
        is_test: isTest,
      });
      if (error) throw error;
    } else {
      // Keep the first visit's details; only fill in what's missing (e.g.
      // they accepted cookies since their first tap).
      const { error } = await supabase
        .from('whatsapp_refs')
        .update({
          last_clicked_at: new Date().toISOString(),
          ...(consent && !existing.fbc && user.fbc ? { fbc: user.fbc } : {}),
          ...(consent && !existing.fbp && user.fbp ? { fbp: user.fbp } : {}),
          ...(consent ? { cookie_consent: true } : {}),
          ...(!existing.utm_source && attribution.utm_source ? attribution : {}),
          ...(!existing.fbclid && attribution.fbclid ? { fbclid: attribution.fbclid } : {}),
          ...(!existing.referral_code && clip(body.referral_code, 64) ? { referral_code: clip(body.referral_code, 64) } : {}),
        })
        .eq('code', code);
      if (error) throw error;
    }
    saved = true;
  } catch (err) {
    console.error('WhatsApp click could not be saved:', err);
  }

  let meta: MetaResult = { status: 'skipped', reason: 'the visitor has not accepted cookies' };
  if (consent && typeof body.event_id === 'string' && EVENT_ID_PATTERN.test(body.event_id)) {
    meta = await sendMetaEvent({
      name: 'Contact',
      eventId: body.event_id,
      eventSourceUrl: sameSiteUrl(req, body.source_url),
      user,
      customData: { content_name: button, content_category: section },
    });
  }
  // The tap itself, with what happened to its Contact event.
  try {
    const { error: clickError } = await getSupabaseAdmin()
      .from('whatsapp_clicks')
      .insert({ code, button, section, page, is_test: isTest, meta_status: describeMetaResult('Contact', meta) + (meta.status === 'sent' ? ` fbtrace_id ${meta.fbtraceId}` : '') });
    if (clickError) throw clickError;
  } catch (err) {
    saved = false;
    console.error('WhatsApp tap could not be saved:', err);
  }
  res.status(200).json(metaTestMode() ? { ok: true, saved, meta } : { ok: true });
}
