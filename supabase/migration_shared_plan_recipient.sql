-- ============================================================
-- Date Planner — record who opened a shared plan (for both inboxes).
-- Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- ============================================================
-- When a logged-in non-owner opens a shared plan, we stamp their id + chosen
-- display name once (never overwritten), so BOTH people can list the date in
-- "My dates": the owner sees who opened it, and the recipient sees dates shared
-- with them. recipient_seen_at powers the recipient's unread dot (mirrors
-- owner_seen_at). Only a display name is stored — no contact info.

ALTER TABLE shared_plans ADD COLUMN IF NOT EXISTS recipient_id       uuid;
ALTER TABLE shared_plans ADD COLUMN IF NOT EXISTS recipient_name     text;
ALTER TABLE shared_plans ADD COLUMN IF NOT EXISTS recipient_seen_at  timestamptz;
