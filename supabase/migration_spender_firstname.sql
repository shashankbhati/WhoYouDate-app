-- ============================================================
-- WhoAmIDating — Migration: first-name spend analytics
-- Run in: Supabase Dashboard → SQL Editor → New query
-- Safe to run multiple times (idempotent).
--
-- Enables the anonymous "how much do people named X spend when THEY date"
-- stat. FIRST NAME ONLY — never a full name. profiles.first_name is hidden
-- (never shown publicly); it is denormalized onto each new entry as
-- logger_first_name so aggregation stays fully client-side.
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE entries  ADD COLUMN IF NOT EXISTS logger_first_name text;

CREATE INDEX IF NOT EXISTS entries_logger_first_name_idx ON entries (logger_first_name);
