import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.js';
import type { CartTotals, CheckoutItem } from './pricing.js';
import { formatQuoteNumber, quoteFileName, quoteValidUntil, renderQuotePdf } from './quotePdf.js';

// The PDF quotation for a quote request (api/cart-leads.ts): numbered,
// drawn, and kept in the private "quotations" storage bucket. The team gets
// it attached to their alert and forwards it themselves; the customer is
// never sent it automatically.

export const QUOTATIONS_BUCKET = 'quotations';

export type Quotation = {
  quoteNumber: string | null;
  validUntil: Date;
  // Set when the PDF was made; otherwise why it wasn't.
  pdf: { fileName: string; bytes: Uint8Array } | null;
  pdfError: string | null;
};

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

// Never throws: a quotation that can't be made must not stop the request
// being saved or the team being alerted (they then get the alert without
// the PDF, saying why).
export async function makeQuotation(
  supabase: SupabaseClient<Database> | null,
  request: { quotedAt: Date; isTest: boolean; preparedFor: string; items: CheckoutItem[]; totals: CartTotals }
): Promise<Quotation> {
  const validUntil = quoteValidUntil(request.quotedAt, request.totals.offer);
  let quoteNumber: string | null = null;
  try {
    if (!supabase) throw new Error('the database is not reachable');
    // From a database sequence: increasing, and never handed out twice.
    // Test environments draw from their own sequence ("LC-Q-TEST-…"), so
    // tests never use up real quote numbers.
    const { data, error } = await supabase.rpc('next_quote_number', { is_test: request.isTest });
    if (error) throw new Error(`no quote number (${error.message})`);
    if (typeof data !== 'number' && typeof data !== 'string') throw new Error('no quote number returned');
    quoteNumber = formatQuoteNumber(Number(data), request.quotedAt, request.isTest);

    const bytes = await renderQuotePdf({
      quoteNumber,
      quotedAt: request.quotedAt,
      validUntil,
      preparedFor: request.preparedFor,
      items: request.items,
      totals: request.totals,
    });
    return { quoteNumber, validUntil, pdf: { fileName: quoteFileName(quoteNumber, request.preparedFor), bytes }, pdfError: null };
  } catch (err) {
    console.error('Quotation PDF not made:', err);
    return { quoteNumber, validUntil, pdf: null, pdfError: message(err) };
  }
}

// Saves a copy in the private bucket as "<quote number>.pdf". Returns its
// path, or why it couldn't be saved. Never throws.
export async function storeQuotation(
  supabase: SupabaseClient<Database> | null,
  quoteNumber: string,
  bytes: Uint8Array
): Promise<{ path: string } | { error: string }> {
  try {
    if (!supabase) throw new Error('the database is not reachable');
    const path = `${quoteNumber}.pdf`;
    const { error } = await supabase.storage
      .from(QUOTATIONS_BUCKET)
      .upload(path, bytes, { contentType: 'application/pdf', upsert: false });
    if (error) throw new Error(error.message);
    return { path };
  } catch (err) {
    console.error(`Quotation ${quoteNumber} not saved to storage:`, err);
    return { error: message(err) };
  }
}
