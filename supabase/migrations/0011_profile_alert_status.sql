-- ============================================================
-- LuxeCard: what happened to each profile submission's team alert email
--
-- Run once in the Supabase SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- Safe to re-run. Only ADDS a nullable column, so the site keeps working
-- before and after this runs.
--
-- Written by api/profile-details.ts after it tries to send the alert:
-- 'sent (Resend id …)', or 'failed: <reason>' (e.g. the API key isn't set
-- in this environment, or Resend refused it, with Resend's own message).
-- Null on rows saved before this column existed.
-- ============================================================

alter table public.profile_submissions
  add column if not exists alert_status text;
