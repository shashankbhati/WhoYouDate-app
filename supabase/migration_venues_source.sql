-- ============================================================
-- Date Planner — venue source tag (for auto-imported cities)
-- Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- ============================================================

-- Marks where a venue came from: NULL/'curated' = hand-added in /plan-admin,
-- 'foursquare' = auto-imported by api/venues.ts. Lets the importer refresh only
-- its own rows without touching your curated venues.
ALTER TABLE venues ADD COLUMN IF NOT EXISTS source text;

CREATE INDEX IF NOT EXISTS venues_source_idx ON venues (source);
