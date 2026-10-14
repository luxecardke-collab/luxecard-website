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

// ---------- Phones: any country, Kenya by default ----------
// The world's country calling codes (ITU E.164). No code is the start of
// another, so the first one a number begins with is its country code.
const COUNTRY_CODES = new Set(
  (
    '1 7 20 27 30 31 32 33 34 36 39 40 41 43 44 45 46 47 48 49 51 52 53 54 55 56 57 58 60 61 62 63 64 65 66 81 82 84 86 90 91 92 93 94 95 98 ' +
    '211 212 213 216 218 220 221 222 223 224 225 226 227 228 229 230 231 232 233 234 235 236 237 238 239 240 241 242 243 244 245 246 247 248 249 ' +
    '250 251 252 253 254 255 256 257 258 260 261 262 263 264 265 266 267 268 269 290 291 297 298 299 ' +
    '350 351 352 353 354 355 356 357 358 359 370 371 372 373 374 375 376 377 378 379 380 381 382 383 385 386 387 389 420 421 423 ' +
    '500 501 502 503 504 505 506 507 508 509 590 591 592 593 594 595 596 597 598 599 ' +
    '670 672 673 674 675 676 677 678 679 680 681 682 683 685 686 687 688 689 690 691 692 ' +
    '800 808 850 852 853 855 856 870 878 880 881 882 883 886 888 ' +
    '960 961 962 963 964 965 966 967 968 970 971 972 973 974 975 976 977 979 992 993 994 995 996 998'
  ).split(' ')
);

// The 8–15 digits after a number's country code.
const NATIONAL_DIGITS = /^\d{8,15}$/;

// Accepts an international number with its country code (+254 712 345 678,
// +256 772 123 456, +44 7700 900123, or the same starting 00 instead of +),
// and Kenyan numbers written locally (0712 345 678, 712 345 678, or
// 254712345678 without the +). Spaces, dashes, dots and brackets are
// ignored. Returns it in international format (+254712345678), or null.
export function normalizePhone(input: string): string | null {
  const compact = input.trim().replace(/[\s\-().]/g, '');
  let digits: string;
  if (/^\+\d+$/.test(compact)) digits = compact.slice(1);
  else if (/^00\d+$/.test(compact)) digits = compact.slice(2);
  else if (/^0\d{9}$/.test(compact)) digits = `254${compact.slice(1)}`; // local Kenyan: 0 + 9 digits
  else if (/^[17]\d{8}$/.test(compact)) digits = `254${compact}`; // Kenyan mobile without its 0
  else if (/^254\d{9}$/.test(compact)) digits = compact; // Kenyan, + left off
  else return null;
  for (const length of [1, 2, 3]) {
    const code = digits.slice(0, length);
    if (COUNTRY_CODES.has(code)) return NATIONAL_DIGITS.test(digits.slice(length)) ? `+${digits}` : null;
  }
  return null;
}

export const PHONE_ERROR = 'Enter a valid phone number. Include your country code if outside Kenya, e.g. +256 772 123 456.';

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
