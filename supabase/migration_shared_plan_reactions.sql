-- ============================================================
-- Date Planner — per-stop reactions on a shared plan.
-- Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- ============================================================
-- Reactions live on the single shared_plans row (like messages) — a small jsonb
-- map of stop order → { o: <owner's emoji>, r: <recipient's emoji> }. One reaction
-- per side per stop; realtime keeps both people in sync.

ALTER TABLE shared_plans ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}';
