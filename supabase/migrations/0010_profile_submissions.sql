-- ============================================================
-- LuxeCard: profile details sent through www.luxecard.co.ke/details
--
-- Run once in the Supabase SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- Safe to re-run: every statement is idempotent. Only ADDS a new table and
-- a new storage bucket, so the live site keeps working before and after.
-- ============================================================

-- ---------- 1. The submissions ----------
-- One row per form sent. Written only by api/profile-details.ts with the
-- service_role key; nobody can read or write it from the browser.
-- `ref` is whatever ?ref= the customer arrived with (an LC- WhatsApp
-- reference or a Paystack order reference); order_id / whatsapp_ref are
-- set only when it matched one. Files live in the private
-- `profile-uploads` bucket below; only their storage paths are kept here.

create table if not exists public.profile_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ref text check (ref is null or ref ~ '^[A-Za-z0-9_.-]{1,100}$'),
  order_id uuid references public.orders (id) on delete set null,
  whatsapp_ref text references public.whatsapp_refs (code) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 200),
  -- The WhatsApp number first, then an optional second one; +254 format.
  phones text[] not null check (cardinality(phones) between 1 and 2),
  email text check (email is null or char_length(email) <= 200),
  title text check (title is null or char_length(title) <= 200),
  company text check (company is null or char_length(company) <= 200),
  website text check (website is null or char_length(website) <= 500),
  -- [{ "network": "linkedin" | "instagram" | "x" | "facebook" | "tiktok", "url": "https://…" }], up to 5.
  socials jsonb not null default '[]'::jsonb check (jsonb_typeof(socials) = 'array' and jsonb_array_length(socials) <= 5),
  bio text check (bio is null or char_length(bio) <= 300),
  business_card_path text,
  photo_path text,
  logo_path text,
  consent_at timestamptz not null,
  -- Written by a Preview deployment (testing), never by the live site.
  is_test boolean not null default false,
  status text not null default 'new'
);

-- RLS on with no policies = neither anon nor authenticated can read or
-- write this table at all. Only service_role (server-side) can.
alter table public.profile_submissions enable row level security;
revoke all on table public.profile_submissions from anon, authenticated;

create index if not exists profile_submissions_created_idx on public.profile_submissions (created_at desc);
create index if not exists profile_submissions_order_idx on public.profile_submissions (order_id);
create index if not exists profile_submissions_whatsapp_ref_idx on public.profile_submissions (whatsapp_ref);

-- ---------- 2. The files: a private bucket ----------
-- Not public: there are no public links to anything in it, and no storage
-- policies, so the browser can't list, read or write it. The customer's
-- browser uploads each file with a short-lived signed upload URL that
-- api/profile-details.ts creates (service_role); the team opens files
-- through signed links in the alert email. The bucket itself enforces the
-- 10MB limit and the allowed file types.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-uploads',
  'profile-uploads',
  false,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
