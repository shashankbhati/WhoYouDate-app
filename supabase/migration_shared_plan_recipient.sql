-- ============================================================
-- Date Planner — record who opened a shared plan (for the owner's inbox).
-- Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- ============================================================
-- When a logged-in non-owner opens a shared plan, we stamp their id + chosen
-- display name once (never overwritten), so the owner's "Your shared dates" list
-- can show WHO opened each plan. Only a display name is stored — no contact info.

ALTER TABLE shared_plans ADD COLUMN IF NOT EXISTS recipient_id   uuid;
ALTER TABLE shared_plans ADD COLUMN IF NOT EXISTS recipient_name text;
