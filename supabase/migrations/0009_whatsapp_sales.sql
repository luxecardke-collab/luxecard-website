-- ============================================================
-- LuxeCard: recording WhatsApp sales paid through a Paystack payment link
--
-- Run once in the Supabase SQL Editor, AFTER 0008
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- Safe to re-run: every statement is idempotent. Only ADDS columns (with
-- defaults or nullable) and one new table, so the live site keeps working
-- before and after this runs.
-- ============================================================

-- ---------- 1. Orders: where they came from, and what Meta was told ----------
-- order_source: 'website' (checkout on the site) or 'whatsapp' (a sale
-- closed on WhatsApp, paid through a Paystack payment link).
-- whatsapp_ref: the visitor's LC- code the team typed into the payment
-- link, exactly as matched (null if missing or unknown).
-- payment_type: for payment-link orders, how the order has been paid:
-- 'full' (one payment), 'deposit' (deposit paid, balance still due) or
-- 'balance' (deposit and balance both paid).
-- meta_status: what happened to the order's Meta Purchase event, e.g.
-- "Purchase sent to Meta (events_received 1) fbtrace_id …" or why not.

alter table public.orders
  add column if not exists order_source text not null default 'website',
  add column if not exists whatsapp_ref text,
  add column if not exists payment_type text,
  add column if not exists meta_status text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_order_source_check') then
    alter table public.orders
      add constraint orders_order_source_check check (order_source in ('website', 'whatsapp'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_payment_type_check') then
    alter table public.orders
      add constraint orders_payment_type_check check (payment_type is null or payment_type in ('full', 'deposit', 'balance'));
  end if;
end $$;

-- ---------- 2. Every payment on a payment-link order ----------
-- A WhatsApp sale can be paid in one go (full) or as a deposit followed
-- by a balance. Each Paystack payment is one row here, recorded against
-- the same order; paystack_reference is unique, so a payment Paystack
-- reports more than once (webhook, confirmation check, nightly check) is
-- only ever recorded once.
create table if not exists public.order_payments (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  order_id uuid not null references public.orders (id) on delete cascade,
  paystack_reference text not null unique,
  payment_type text not null check (payment_type in ('full', 'deposit', 'balance')),
  amount numeric(12, 2) not null,
  paid_at timestamptz,
  is_test boolean not null default false
);

create index if not exists order_payments_order_idx on public.order_payments (order_id);
create index if not exists orders_whatsapp_ref_idx on public.orders (whatsapp_ref) where whatsapp_ref is not null;

alter table public.order_payments enable row level security;
revoke all on table public.order_payments from anon, authenticated;

-- ---------- 3. WhatsApp codes: affiliate credit and Meta outcome ----------
-- referral_code: the affiliate code (?ref=) the visitor arrived with, if
-- any, so a WhatsApp sale can still earn that affiliate's commission.
-- meta_status on each tap: what happened to its Meta "Contact" event.
alter table public.whatsapp_refs
  add column if not exists referral_code text;

alter table public.whatsapp_clicks
  add column if not exists meta_status text;
