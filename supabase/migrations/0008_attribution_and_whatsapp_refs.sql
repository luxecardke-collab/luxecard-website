-- ============================================================
-- LuxeCard: ad/campaign attribution on leads and orders, and WhatsApp
-- reference codes
--
-- Run once in the Supabase SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- Safe to re-run: every statement is idempotent. Only ADDS nullable
-- columns (or columns with defaults) and new tables, so the site that's
-- live now keeps working before and after this runs.
-- ============================================================

-- ---------- 1. Where each lead/order came from ----------
-- utm_* are copied from the landing URL (our Ads Manager URL parameters:
-- utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}
-- &utm_term={{adset.name}}&utm_content={{ad.name}}); fbclid is Meta's
-- click ID from the same URL. is_test marks rows written by a Preview
-- deployment (testing), never by the live site.

alter table public.cart_leads
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists fbclid text,
  add column if not exists is_test boolean not null default false;

alter table public.orders
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists fbclid text,
  add column if not exists is_test boolean not null default false;

-- ---------- 2. WhatsApp reference codes ----------
-- One row per visitor code ("LC-" + 6 characters, no look-alikes like 0/O
-- or 1/I), created the first time that visitor taps any WhatsApp button
-- and reused on every later tap. The code is added to the pre-filled
-- WhatsApp message, so when a chat turns into a sale the team can look it
-- up here and link the sale to the ad. fbc/fbp (Meta's click/browser IDs)
-- are only stored for visitors who accepted cookies.

create table if not exists public.whatsapp_refs (
  code text primary key check (code ~ '^LC-[A-HJ-NP-Z2-9]{4,6}$'),
  created_at timestamptz not null default now(),
  last_clicked_at timestamptz not null default now(),
  first_button text not null,
  first_section text not null,
  first_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  fbc text,
  fbp text,
  cookie_consent boolean not null default false,
  is_test boolean not null default false
);

-- Every tap (a visitor can tap several buttons over time).
create table if not exists public.whatsapp_clicks (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  code text not null references public.whatsapp_refs (code) on delete cascade,
  button text not null,
  section text not null,
  page text,
  is_test boolean not null default false
);

create index if not exists whatsapp_clicks_code_created_idx
  on public.whatsapp_clicks (code, created_at desc);

-- RLS on with no policies = neither anon nor authenticated can read or
-- write these tables at all. Only service_role (server-side) can.
alter table public.whatsapp_refs enable row level security;
alter table public.whatsapp_clicks enable row level security;
revoke all on table public.whatsapp_refs from anon, authenticated;
revoke all on table public.whatsapp_clicks from anon, authenticated;
