-- ============================================================
-- LuxeCard: PDF quotations for quote requests
--
-- Run once in the Supabase SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- Safe to re-run. Only ADDS things (sequences, a function, nullable
-- columns, a private bucket), so the site keeps working before and after.
--
-- Quote numbers: LC-Q-<year>-0001, LC-Q-<year>-0002, … The site formats
-- them; the number itself comes from quote_number_seq, which only ever
-- increases and never hands out the same number twice (not even if the
-- request fails afterwards). It does not restart each year. Preview/test
-- requests draw from quote_number_test_seq instead (LC-Q-TEST-<year>-0001),
-- so testing never uses up real numbers.
-- ============================================================

create sequence if not exists public.quote_number_seq as bigint start with 1 minvalue 1 no cycle;
create sequence if not exists public.quote_number_test_seq as bigint start with 1 minvalue 1 no cycle;

-- The next quote number (only the site's server, with the service_role
-- key, may call it).
create or replace function public.next_quote_number(is_test boolean)
returns bigint
language sql
volatile
security definer
set search_path = public
as $$
  select case
    when is_test then nextval('public.quote_number_test_seq')
    else nextval('public.quote_number_seq')
  end;
$$;

revoke all on function public.next_quote_number(boolean) from public, anon, authenticated;
grant execute on function public.next_quote_number(boolean) to service_role;
revoke all on sequence public.quote_number_seq, public.quote_number_test_seq from anon, authenticated;

-- Each quote request's quotation:
--   quote_number    e.g. 'LC-Q-2026-0001' (unique)
--   quote_pdf_path  where its PDF is, e.g. 'quotations/LC-Q-2026-0001.pdf'
--                   (null if it couldn't be made or saved)
--   quote_alert     what happened to the team's alert email, e.g.
--                   'sent (Resend id …), with LuxeCard-Quotation-….pdf'
alter table public.cart_leads
  add column if not exists quote_number text unique,
  add column if not exists quote_pdf_path text,
  add column if not exists quote_alert text;

-- The PDFs: a private bucket (no public links, no policies, so only the
-- service_role key, i.e. the site's server and the Supabase dashboard, can
-- read or write it). PDFs only, up to 5 MB each.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quotations', 'quotations', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
