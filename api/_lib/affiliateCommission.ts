import { getSupabaseAdmin } from './supabaseAdmin.js';

// Affiliate commission, shared by website orders and payment-link sales.
export const COMMISSION_RATE = 0.1;

type Supabase = ReturnType<typeof getSupabaseAdmin>;
export type Affiliate = { id: string; status: 'active' | 'pending' };

// The affiliate a referral code belongs to, if any. orders.referral_code
// is a foreign key to affiliates, so only a code that matches one can be
// stored on an order: an unknown code (mistyped, made up) would otherwise
// make saving a PAID order fail.
export async function findAffiliate(supabase: Supabase, code: string | null | undefined): Promise<Affiliate | null> {
  if (!code) return null;
  const { data } = await supabase.from('affiliates').select('id, status').eq('referral_code', code).maybeSingle();
  return data ?? null;
}

// Records the commission on one payment (if the affiliate is active) and
// returns the line for the team alert.
export async function recordCommission(
  supabase: Supabase,
  code: string | null | undefined,
  affiliate: Affiliate | null,
  orderId: string,
  amountPaid: number
): Promise<string | null> {
  if (!code) return null;
  if (!affiliate) return `${code} (no affiliate has this code, no commission)`;
  if (affiliate.status !== 'active') return `${code} (affiliate is still pending approval, no commission)`;
  const { error } = await supabase.from('referral_commissions').insert({
    affiliate_id: affiliate.id,
    order_id: orderId,
    commission_amount: amountPaid * COMMISSION_RATE,
    payout_status: 'unpaid',
  });
  if (error) {
    console.error('Failed to insert referral commission:', error);
    return `${code} (commission could not be recorded, check the logs)`;
  }
  return `${code} (active affiliate, commission recorded)`;
}
