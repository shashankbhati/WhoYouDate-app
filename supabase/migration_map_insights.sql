-- ============================================================
-- WhoAmIDating — Migration: map coords, turning point, entry edit
-- Run in: Supabase Dashboard → SQL Editor → New query
-- Safe to run multiple times (idempotent).
-- ============================================================

-- 1. Dating map coordinates (geocoded city lat/lon)
ALTER TABLE entries ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION;

-- 2. "What made or broke it" one-word turning-point tag
ALTER TABLE entries ADD COLUMN IF NOT EXISTS turning_point text;

-- 3. Allow users to EDIT their own entries (needed for the edit-date feature).
--    Without this policy, RLS silently blocks UPDATEs on entries.
DROP POLICY IF EXISTS "update_own_entry" ON entries;
CREATE POLICY "update_own_entry" ON entries FOR UPDATE USING (auth.uid() = user_id);
