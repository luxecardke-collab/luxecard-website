// The profile details form (www.luxecard.co.ke/details): its rules, shared
// by the page (src/components/ProfileDetailsPage.tsx), which checks them as
// the customer types, and api/profile-details.ts, which checks them again.
// Keep it dependency-free so it stays safe to bundle into the browser.

export const PROFILE_BUCKET = 'profile-uploads';
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB, also enforced by the bucket
export const MAX_BIO = 300;
export const MAX_SOCIALS = 5;
export const MAX_TEXT = 200;
export const MAX_URL = 500;

// ---------- Phones: Kenyan numbers ----------
// Accepts 0712 345 678, 712345678, 254712345678 and +254 712 345 678
// (spaces, dashes and brackets ignored), mobile (7…) and the newer 1…
// prefixes. Returns +254XXXXXXXXX, or null if it isn't one.
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, '');
  const m = /^(?:\+?254|0)?([17]\d{8})$/.exec(digits);
  return m ? `+254${m[1]}` : null;
}

// ---------- Links ----------
// Adds https:// when there's no scheme, then checks it's a real web
// address (http/https, a host with a dot). Returns the cleaned link or null.
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_URL || /\s/.test(trimmed)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname)) return null;
    // "https://testco.co.ke", not "https://testco.co.ke/".
    return url.pathname === '/' && !url.search && !url.hash ? url.origin : url.toString();
  } catch {
    return null;
  }
}

export const SOCIAL_NETWORKS = [
  { id: 'linkedin', label: 'LinkedIn', example: 'linkedin.com/in/yourname' },
  { id: 'instagram', label: 'Instagram', example: 'instagram.com/yourname' },
  { id: 'x', label: 'X', example: 'x.com/yourname' },
  { id: 'facebook', label: 'Facebook', example: 'facebook.com/yourname' },
  { id: 'tiktok', label: 'TikTok', example: 'tiktok.com/@yourname' },
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number]['id'];
export const isSocialNetwork = (value: unknown): value is SocialNetwork =>
  SOCIAL_NETWORKS.some((n) => n.id === value);

// ---------- Uploads ----------
export type UploadKind = 'business_card' | 'photo' | 'logo';

const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' };
const PDF = { 'application/pdf': 'pdf' };
const SVG = { 'image/svg+xml': 'svg' };

// What each upload accepts (content type -> file extension).
export const UPLOAD_TYPES: Record<UploadKind, Record<string, string>> = {
  business_card: { ...IMAGE_TYPES, ...PDF },
  photo: IMAGE_TYPES,
  logo: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', ...PDF, ...SVG },
};

// For the file picker's accept="…" (extensions too, as some phones report
// HEIC photos with no type).
export const UPLOAD_ACCEPT: Record<UploadKind, string> = {
  business_card: '.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf',
  photo: '.jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif',
  logo: '.jpg,.jpeg,.png,.webp,.pdf,.svg,image/jpeg,image/png,image/webp,application/pdf,image/svg+xml',
};

const TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  heic: 'image/heic', heif: 'image/heif', pdf: 'application/pdf', svg: 'image/svg+xml',
};

// A file's content type, from the browser or (when it gives none, as with
// HEIC on some phones) from its extension.
export function contentTypeOf(name: string, browserType: string): string {
  const fromName = TYPE_BY_EXTENSION[name.split('.').pop()?.toLowerCase() ?? ''] ?? '';
  const type = browserType.toLowerCase();
  return type && type !== 'application/octet-stream' ? (type === 'image/jpg' ? 'image/jpeg' : type) : fromName;
}

// Where an upload is stored: <year-month>/<random id>/<kind>.<ext>.
export const UPLOAD_PATH_PATTERN =
  /^\d{4}-\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(business_card|photo|logo)\.(jpg|png|webp|heic|heif|pdf|svg)$/;

// The ?ref= a customer may arrive with: an LC- WhatsApp reference or a
// Paystack order reference.
export const REF_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;
export const WHATSAPP_REF_PATTERN = /^LC-[A-HJ-NP-Z2-9]{4,6}$/;
