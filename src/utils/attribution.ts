// Where this visit came from: the landing URL's UTM parameters (our Ads
// Manager sets utm_source=facebook, utm_medium=paid, utm_campaign = campaign,
// utm_term = ad set, utm_content = ad) and Meta's fbclid. Captured
// first-party on landing and kept for the visit (this tab's session), then
// sent with each lead, checkout and WhatsApp tap so the team can see which
// campaign, ad set and ad each customer came from. Never sent to Meta.

const STORAGE_KEY = 'luxecard_attribution';
const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'] as const;

export type Attribution = Partial<Record<(typeof KEYS)[number], string>> & {
  // When the fbclid was first seen (ms), for building Meta's _fbc value.
  fbclid_at?: number;
};

function read(): Attribution {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// On landing: a URL carrying UTM parameters or an fbclid starts a new
// attribution (a later ad click in the same visit replaces the earlier one).
export function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const found: Attribution = {};
    for (const key of KEYS) {
      const value = params.get(key)?.trim();
      if (value) found[key] = value.slice(0, key === 'fbclid' ? 500 : 200);
    }
    if (Object.keys(found).length === 0) return;
    const previous = read();
    if (found.fbclid) found.fbclid_at = found.fbclid === previous.fbclid ? previous.fbclid_at : Date.now();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(found));
  } catch {
    // storage unavailable: nothing to keep
  }
}

// What to send with a lead, checkout or WhatsApp tap.
export function getAttribution(): Partial<Record<(typeof KEYS)[number], string>> {
  const stored = read();
  return Object.fromEntries(KEYS.filter((k) => typeof stored[k] === 'string').map((k) => [k, stored[k] as string]));
}

// Meta's click ID in its _fbc cookie format, from this visit's fbclid. Only
// ever used once the visitor has accepted cookies (see metaPixel.ts).
export function fbcFromVisit(): string | null {
  const { fbclid, fbclid_at } = read();
  return fbclid ? `fb.1.${fbclid_at ?? Date.now()}.${fbclid}` : null;
}
