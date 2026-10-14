-- ============================================================
-- LuxeCard: gift orders on the profile details form (/details)
--
-- Run once in the Supabase SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- Safe to re-run. Only ADDS columns (nullable, or with a default), so the
-- site keeps working before and after this runs.
--
-- is_gift: the person filling in the form is buying the card for someone
-- else. Then buyer_name / buyer_phone are who the team contacts (the card
-- owner must not be contacted, to keep the surprise), and the rest of the
-- row is the card owner's details. buyer_phone is in international format
-- (+<country code><number>), like phones.
-- ============================================================

alter table public.profile_submissions
  add column if not exists is_gift boolean not null default false,
  add column if not exists buyer_name text check (buyer_name is null or char_length(buyer_name) between 1 and 200),
  add column if not exists buyer_phone text check (buyer_phone is null or buyer_phone ~ '^\+[0-9]{9,18}$');

-- A gift always has the buyer's name and number.
alter table public.profile_submissions drop constraint if exists profile_submissions_gift_has_buyer;
alter table public.profile_submissions
  add constraint profile_submissions_gift_has_buyer
  check (not is_gift or (buyer_name is not null and buyer_phone is not null));
