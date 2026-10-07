import type { AlertRow } from './email.js';

// Where a lead/order came from: the landing URL's UTM parameters (our Ads
// Manager sets utm_source=facebook, utm_medium=paid, utm_campaign = campaign
// name, utm_term = ad set name, utm_content = ad name) and Meta's fbclid.
// Captured first-party by the browser on landing (src/utils/attribution.ts)
// and sent along with each lead, checkout and WhatsApp tap.
export type Attribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
};

const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'] as const;

const clean = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

// Whatever the browser sent, reduced to known keys and sane lengths.
export function readAttribution(input: unknown): Attribution {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  return Object.fromEntries(KEYS.map((k) => [k, clean(source[k], k === 'fbclid' ? 500 : 200)])) as Attribution;
}

export const hasAttribution = (a: Attribution) => KEYS.some((k) => a[k]);

// For the team's alert emails: which campaign, ad set and ad.
export function attributionRows(a: Attribution): AlertRow[] {
  const source = [a.utm_source, a.utm_medium].filter(Boolean).join(' / ');
  return [
    ['Source', source || (a.fbclid ? 'Meta ad click (no UTM parameters)' : null)],
    ['Campaign', a.utm_campaign],
    ['Ad set', a.utm_term],
    ['Ad', a.utm_content],
  ];
}

// True for Preview deployments and local runs: their rows are marked
// is_test and their alerts say [TEST], so testing never looks like real
// business.
export const isTestEnvironment = () => process.env.VERCEL_ENV !== 'production';
