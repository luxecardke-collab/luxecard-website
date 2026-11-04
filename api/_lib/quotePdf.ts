import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, setCharacterSpacing, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import { BULK_DISCOUNT_RATE, FINISH_PRICES_BY_LABEL, type CartTotals, type CheckoutItem, type Offer } from './pricing.js';

// The PDF quotation attached to the team's alert for a quote request
// (api/cart-leads.ts), laid out like LuxeCard's own quotation template:
// A4, one page, in Inter (the site's font), with the site's logo.
//
// Prices are exactly what the site showed at the moment of the request:
// the caller passes the totals from computeAuthoritativeTotals (the cart's
// and checkout's own calculation), so the discount on the quote can never
// differ from the cart's.

export const QUOTE_VALID_DAYS = 14;

export type QuoteInput = {
  quoteNumber: string;
  quotedAt: Date;
  validUntil: Date;
  // The company if they gave one, otherwise their name.
  preparedFor: string;
  items: CheckoutItem[];
  totals: CartTotals;
};

// ---- numbers, dates, names ------------------------------------------------

// "LC-Q-2026-0001" (a test environment's: "LC-Q-TEST-2026-0001"). The
// number comes from a database sequence, so it only ever increases and is
// never reused; the year is the quote date's.
export function formatQuoteNumber(sequence: number, quotedAt: Date, isTest: boolean): string {
  return `LC-Q-${isTest ? 'TEST-' : ''}${nairobiDate(quotedAt).year}-${String(sequence).padStart(4, '0')}`;
}

function nairobiDate(at: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

// A calendar day (midnight UTC stands for the Nairobi date) `days` after
// `at`'s date in Nairobi.
function nairobiDayPlus(at: Date, days: number): Date {
  const { year, month, day } = nairobiDate(at);
  return new Date(Date.UTC(year, month - 1, day + days));
}

// Valid for 14 days from the quote date, except that a quote using an
// offer's price is only valid while that offer is: until the offer's last
// day, if that comes sooner.
export function quoteValidUntil(quotedAt: Date, offer: Offer | null): Date {
  const fourteenDays = nairobiDayPlus(quotedAt, QUOTE_VALID_DAYS);
  if (!offer) return fourteenDays;
  // endsAt is exclusive (the midnight after the last day).
  const offerLastDay = nairobiDayPlus(new Date(Date.parse(offer.endsAt) - 1), 0);
  return offerLastDay < fourteenDays ? offerLastDay : fourteenDays;
}

// "26 October 2026": the quote date in Nairobi.
export function formatQuoteDate(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'long', year: 'numeric' }).format(at);
}

// A calendar day from nairobiDayPlus / quoteValidUntil.
export function formatCalendarDay(day: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(day);
}

// "LuxeCard-Quotation-LC-Q-2026-0001-Sai-Raj-Limited.pdf"
export function quoteFileName(quoteNumber: string, preparedFor: string): string {
  const name = preparedFor
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return `LuxeCard-Quotation-${quoteNumber}${name ? `-${name}` : ''}.pdf`;
}

// What each card is called on the quotation.
const MATERIAL_NAMES: Record<string, string> = {
  Plastic: 'Plastic',
  Wood: 'Wooden',
  Metallic: 'Metallic',
  "Chairman's Card": "Chairman's Gold",
};

// "Metallic Smart Business Card (Silver)"
export function quoteItemDescription(item: CheckoutItem): string {
  const material = MATERIAL_NAMES[item.name] ?? item.name;
  return `${material} Smart Business Card${item.subOption ? ` (${item.subOption})` : ''}`;
}

// The discount line's label: the team (bulk) discount, or the offer when
// that's the discount the cart gives instead.
export function quoteDiscountLabel(totals: CartTotals): string | null {
  if (totals.discount <= 0) return null;
  if (totals.discountType === 'offer' && totals.offer) {
    return `${totals.offer.name} offer (${Math.round(totals.offer.rate * 100)}%)`;
  }
  if (totals.discountType === 'bulk') {
    return `Team discount (${Math.round(BULK_DISCOUNT_RATE * 100)}%)`;
  }
  return null;
}

const ksh = (value: number) => `Ksh ${Math.round(value).toLocaleString('en-US')}`;

// One row per card type (and colour), quantities of repeats added together.
function quoteLines(items: CheckoutItem[]) {
  const lines: { description: string; quantity: number; unitPrice: number }[] = [];
  const byKey = new Map<string, (typeof lines)[number]>();
  for (const item of items) {
    const key = `${item.name}|${item.subOption ?? ''}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      continue;
    }
    const line = { description: quoteItemDescription(item), quantity: item.quantity, unitPrice: FINISH_PRICES_BY_LABEL[item.name] };
    byKey.set(key, line);
    lines.push(line);
  }
  return lines;
}

// ---- assets --------------------------------------------------------------

// Shipped with the function (vercel.json includeFiles: api/_assets/**).
function readAsset(name: string): Uint8Array {
  const candidates = [join(process.cwd(), 'api', '_assets', name)];
  try {
    candidates.push(fileURLToPath(new URL(`../_assets/${name}`, import.meta.url)));
  } catch {
    // import.meta.url isn't a file URL here; the first path is enough.
  }
  let lastError: unknown;
  for (const path of candidates) {
    try {
      return readFileSync(path);
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Quotation asset ${name} not found (${lastError instanceof Error ? lastError.message : String(lastError)})`);
}

// ---- drawing -------------------------------------------------------------

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_L = 32;
const MARGIN_R = PAGE_W - 32;

const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const INK = rgb(0.07, 0.07, 0.07);
const GREY = rgb(0.4, 0.4, 0.4);
const LABEL_GREY = rgb(0.3, 0.3, 0.3);
const LIGHT_GREY = rgb(0.6, 0.6, 0.6);
const HEADER_GREY = rgb(0.8, 0.8, 0.8);
const RULE = rgb(0.91, 0.91, 0.91);

type Fonts = { regular: PDFFont; semibold: PDFFont; bold: PDFFont };

type TextOptions = {
  font: PDFFont;
  size: number;
  color?: RGB;
  align?: 'left' | 'right' | 'center';
  spacing?: number;
};

// Draws a line of text with its baseline `top` points from the page's top.
function text(page: PDFPage, value: string, x: number, top: number, { font, size, color = INK, align = 'left', spacing = 0 }: TextOptions) {
  const width = font.widthOfTextAtSize(value, size) + spacing * value.length;
  const left = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
  if (spacing) page.pushOperators(setCharacterSpacing(spacing));
  page.drawText(value, { x: left, y: PAGE_H - top, size, font, color });
  if (spacing) page.pushOperators(setCharacterSpacing(0));
}

// Characters the embedded font can't draw (it covers Latin and Latin-1)
// become their plain-letter form where there is one, otherwise "?".
function drawable(font: PDFFont, value: string): string {
  const supported = new Set(font.getCharacterSet());
  return Array.from(value.normalize('NFC'))
    .map((ch) => {
      if (supported.has(ch.codePointAt(0)!)) return ch;
      const plain = ch.normalize('NFKD').replace(/[̀-ͯ]/g, '');
      return Array.from(plain).every((c) => supported.has(c.codePointAt(0)!)) && plain ? plain : '?';
    })
    .join('');
}

// Word-wraps `value` to `maxWidth`, at most `maxLines` lines (the last
// one ending in "…" if it had to be cut).
function wrap(font: PDFFont, size: number, value: string, maxWidth: number, maxLines: number): string[] {
  const fits = (s: string) => font.widthOfTextAtSize(s, size) <= maxWidth;
  const lines: string[] = [];
  let current = '';
  for (const word of value.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (fits(candidate)) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    // A single word wider than the line: break it by characters.
    let rest = word;
    while (!fits(rest)) {
      let cut = rest.length - 1;
      while (cut > 1 && !fits(rest.slice(0, cut))) cut--;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    current = rest;
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && !fits(`${last}…`)) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return kept;
}

const TERMS =
  "50% deposit to confirm the order, balance when cards are ready. We don't accept LPOs. Production starts once payment is received.";

const PREPARED_BY = ['124 Manyani East Road', 'Lavington, Nairobi'];
const PREPARED_BY_CONTACT = ['sales@luxecard.co.ke', '+254 114 914 989'];

const PAYMENT_COLUMNS: { x: number; lines: string[] }[] = [
  {
    x: MARGIN_L,
    lines: ['Bank Name: NCBA BANK K Plc', 'Account Name: LUXE CARD', 'Account Number: 6282570017', 'Bank Code: 07'],
  },
  { x: 218, lines: ['Branch Code: 123', 'SWIFT Code: CBAFKENX', 'Currency: KES'] },
  { x: 385, lines: ['Mpesa Paybill: 880100', 'Account no: 6282570017'] },
];

const FOOTER = 'www.luxecard.co.ke   |   +254 114 914 989';
const FOOTER_TOP = 797;

// Table columns (the template's positions).
const COL_DESC = 52;
const COL_QTY_CENTRE = 296;
const COL_UNIT = 353;
const COL_TOTAL = 475;

export async function renderQuotePdf(input: QuoteInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`LuxeCard Quotation ${input.quoteNumber}`);
  doc.setAuthor('LuxeCard Limited');
  doc.setSubject(`Quotation for ${input.preparedFor}`);
  doc.setCreator('www.luxecard.co.ke');
  doc.setCreationDate(input.quotedAt);

  const fonts: Fonts = {
    regular: await doc.embedFont(readAsset('inter-400.woff'), { subset: true }),
    semibold: await doc.embedFont(readAsset('inter-600.woff'), { subset: true }),
    bold: await doc.embedFont(readAsset('inter-700.woff'), { subset: true }),
  };
  const logo = await doc.embedPng(readAsset('luxecard-logo-tagline.png'));

  const page = doc.addPage([PAGE_W, PAGE_H]);
  const lines = quoteLines(input.items);
  const discountLabel = quoteDiscountLabel(input.totals);
  // The terms on one line: the largest size (down to 7.5pt) that fits.
  const termsSize = [9, 8.5, 8, 7.5].find((size) => fonts.regular.widthOfTextAtSize(TERMS, size) <= MARGIN_R - MARGIN_L) ?? 7.5;
  const terms = wrap(fonts.regular, termsSize, TERMS, MARGIN_R - MARGIN_L, 3);

  // ---- header (black band) ----
  const HEADER_H = 140;
  page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: BLACK });
  const logoW = 182;
  const logoH = (logo.height / logo.width) * logoW;
  page.drawImage(logo, { x: MARGIN_L, y: PAGE_H - (HEADER_H + logoH) / 2, width: logoW, height: logoH });
  text(page, 'Sales Document', MARGIN_R, 38, { font: fonts.regular, size: 9.5, color: HEADER_GREY, align: 'right' });
  text(page, 'QUOTATION', MARGIN_R, 68, { font: fonts.bold, size: 24, color: WHITE, align: 'right', spacing: 0.6 });
  text(page, formatQuoteDate(input.quotedAt), MARGIN_R, 90, { font: fonts.regular, size: 9.5, color: HEADER_GREY, align: 'right' });
  text(page, `Quote No. ${input.quoteNumber}`, MARGIN_R, 107, { font: fonts.regular, size: 8.5, color: HEADER_GREY, align: 'right' });
  text(page, `Valid until ${formatCalendarDay(input.validUntil)}`, MARGIN_R, 120, {
    font: fonts.regular,
    size: 8.5,
    color: HEADER_GREY,
    align: 'right',
  });

  // Everything below flows down the page; with many rows the gaps tighten
  // (k < 1) so it always stays on one page above the footer.
  const layout = (k: number) => {
    const rowPitch = Math.max(30, (lines.length <= 2 ? 44 : 38) * k);
    const y: Record<string, number> = {};
    y.prepared = HEADER_H + 42 * k;
    y.name = y.prepared + 28 * k;
    y.address = y.name + 32 * k;
    y.contact = y.address + 21 + 28 * k;
    y.barTop = y.contact + 21 + 34 * k;
    y.barBottom = y.barTop + 36;
    y.firstRow = y.barBottom + 30 * k;
    y.rule = y.firstRow + (lines.length - 1) * rowPitch + 15 + 30 * k;
    y.subtotal = y.rule + 24 * k;
    y.discount = y.subtotal + (discountLabel ? 18 : 0);
    y.totalLabel = y.discount + 26 * k;
    y.totalAmount = y.totalLabel + 20;
    y.terms = y.totalAmount + 34 * k;
    y.payment = y.terms + (terms.length - 1) * 13 + 34 * k;
    y.paymentLines = y.payment + 32 * k;
    y.end = y.paymentLines + 3 * 20;
    return { y, rowPitch };
  };
  let k = 1;
  let { y, rowPitch } = layout(k);
  while (y.end > FOOTER_TOP - 30 && k > 0.4) {
    k -= 0.05;
    ({ y, rowPitch } = layout(k));
  }

  // ---- prepared for / by ----
  text(page, 'PREPARED FOR:', MARGIN_L, y.prepared, { font: fonts.regular, size: 9, color: LABEL_GREY });
  text(page, 'PREPARED BY:', MARGIN_R, y.prepared, { font: fonts.regular, size: 9, color: LABEL_GREY, align: 'right' });
  wrap(fonts.bold, 12.5, drawable(fonts.bold, input.preparedFor), 250, 3).forEach((line, i) =>
    text(page, line, MARGIN_L, y.name + i * 16, { font: fonts.bold, size: 12.5 })
  );
  text(page, 'LuxeCard Limited', MARGIN_R, y.name, { font: fonts.bold, size: 12.5, align: 'right' });
  PREPARED_BY.forEach((line, i) => text(page, line, MARGIN_R, y.address + i * 21, { font: fonts.regular, size: 10.5, color: GREY, align: 'right' }));
  PREPARED_BY_CONTACT.forEach((line, i) =>
    text(page, line, MARGIN_R, y.contact + i * 21, { font: fonts.regular, size: 10.5, color: GREY, align: 'right' })
  );

  // ---- item table ----
  page.drawRectangle({ x: MARGIN_L, y: PAGE_H - y.barBottom, width: MARGIN_R - MARGIN_L, height: y.barBottom - y.barTop, color: BLACK });
  const headTop = y.barTop + 22;
  const head = { font: fonts.regular, size: 10.5, color: HEADER_GREY };
  text(page, 'Description', COL_DESC, headTop, head);
  text(page, 'Qty', COL_QTY_CENTRE, headTop, { ...head, align: 'center' });
  text(page, 'Unit Price', COL_UNIT, headTop, head);
  text(page, 'Total', COL_TOTAL, headTop, head);

  lines.forEach((line, i) => {
    const top = y.firstRow + i * rowPitch;
    text(page, line.description, COL_DESC + 2, top, { font: fonts.bold, size: 9.5 });
    text(page, 'No subscription cost.', COL_DESC + 7, top + 15, { font: fonts.regular, size: 7, color: LIGHT_GREY });
    text(page, String(line.quantity), COL_QTY_CENTRE, top, { font: fonts.bold, size: 9.5, align: 'center' });
    text(page, ksh(line.unitPrice), COL_UNIT, top, { font: fonts.bold, size: 9.5 });
    text(page, ksh(line.unitPrice * line.quantity), COL_TOTAL, top, { font: fonts.bold, size: 9.5 });
  });
  page.drawLine({
    start: { x: MARGIN_L, y: PAGE_H - y.rule },
    end: { x: MARGIN_R, y: PAGE_H - y.rule },
    thickness: 0.75,
    color: RULE,
  });

  // ---- totals ----
  text(page, 'Subtotal', COL_UNIT, y.subtotal, { font: fonts.regular, size: 10, color: GREY });
  text(page, ksh(input.totals.subtotal), COL_TOTAL, y.subtotal, { font: fonts.semibold, size: 10 });
  if (discountLabel) {
    text(page, discountLabel, COL_UNIT, y.discount, { font: fonts.regular, size: 10, color: GREY });
    text(page, `–${ksh(input.totals.discount)}`, COL_TOTAL - fonts.semibold.widthOfTextAtSize('–', 10), y.discount, {
      font: fonts.semibold,
      size: 10,
    });
  }
  text(page, 'TOTAL', COL_TOTAL, y.totalLabel, { font: fonts.regular, size: 12, color: GREY });
  text(page, `KSH ${Math.round(input.totals.total).toLocaleString('en-US')}`, COL_TOTAL, y.totalAmount, {
    font: fonts.bold,
    size: 13.5,
  });

  // ---- terms and payment details ----
  terms.forEach((line, i) => text(page, line, MARGIN_L, y.terms + i * 13, { font: fonts.regular, size: termsSize, color: LABEL_GREY }));
  text(page, 'Payment Details', MARGIN_L, y.payment, { font: fonts.bold, size: 16 });
  for (const column of PAYMENT_COLUMNS) {
    column.lines.forEach((line, i) => text(page, line, column.x, y.paymentLines + i * 20, { font: fonts.regular, size: 10.5, color: GREY }));
  }

  // ---- footer ----
  text(page, FOOTER, MARGIN_R, FOOTER_TOP, { font: fonts.regular, size: 9, color: GREY, align: 'right' });

  return doc.save();
}
