-- ============================================================
-- WhoAmIDating — Date Planner migration
-- Run in: Supabase Dashboard → SQL Editor → New query
-- Idempotent — safe to run more than once.
-- ============================================================

-- ── Admin allowlist ───────────────────────────────────────────────────────────
-- Emails allowed to curate venues. After running this migration, add yourself:
--   INSERT INTO admins (email) VALUES ('the-email-you-log-into-the-app-with');
-- Use the exact email of the Google account you sign into the app with.
CREATE TABLE IF NOT EXISTS admins (
  email text PRIMARY KEY
);
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
-- Readable by all (the client checks membership to show/hide the admin form);
-- writable only via the SQL editor (no INSERT policy = no client writes).
DROP POLICY IF EXISTS "read_admins" ON admins;
CREATE POLICY "read_admins" ON admins FOR SELECT USING (true);

-- ── Venues (admin-curated, one row per real place) ────────────────────────────
CREATE TABLE IF NOT EXISTS venues (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city        text NOT NULL,
  name        text NOT NULL,
  -- what slot this fills in a roadmap
  kind        text NOT NULL CHECK (kind IN ('cafe','bar','restaurant','dessert','activity','walk','park','view')),
  price_tier  integer CHECK (price_tier BETWEEN 1 AND 4),      -- 1 = €, 4 = €€€€
  rating      numeric(2,1) CHECK (rating BETWEEN 0 AND 5),     -- your own 0–5 rating
  vibe_tags   text[] DEFAULT '{}',                             -- cozy, lively, romantic, quiet…
  good_for    text[] DEFAULT '{}',                             -- morning, afternoon, evening, night
  area        text,                                            -- e.g. Altstadt, Neustadt
  lat         double precision,
  lon         double precision,
  note        text,                                            -- one-line tip shown in the plan
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Everyone can read venues (they power the public planner).
DROP POLICY IF EXISTS "read_all_venues" ON venues;
CREATE POLICY "read_all_venues" ON venues FOR SELECT USING (true);

-- Only admins (by JWT email) can write.
DROP POLICY IF EXISTS "admin_insert_venue" ON venues;
CREATE POLICY "admin_insert_venue" ON venues FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'email') IN (SELECT email FROM admins));

DROP POLICY IF EXISTS "admin_update_venue" ON venues;
CREATE POLICY "admin_update_venue" ON venues FOR UPDATE
  USING ((auth.jwt() ->> 'email') IN (SELECT email FROM admins));

DROP POLICY IF EXISTS "admin_delete_venue" ON venues;
CREATE POLICY "admin_delete_venue" ON venues FOR DELETE
  USING ((auth.jwt() ->> 'email') IN (SELECT email FROM admins));

CREATE INDEX IF NOT EXISTS venues_city_idx ON venues (city);
CREATE INDEX IF NOT EXISTS venues_kind_idx ON venues (kind);

-- ── Plan reviews (the feedback loop that makes risk/reward numbers real) ───────
CREATE TABLE IF NOT EXISTS plan_reviews (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  city           text NOT NULL,
  partner_name   text,                    -- first name only
  time_of_day    text CHECK (time_of_day IN ('morning','afternoon','evening','night')),
  age_range      text,
  chosen_move    text,                    -- the decision-point move the user took
  went_well      integer CHECK (went_well BETWEEN 1 AND 5),
  got_second     text CHECK (got_second IN ('yes','no','maybe')),
  note           text,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE plan_reviews ENABLE ROW LEVEL SECURITY;

-- Reads are public (aggregate, first-name-only) so the planner can learn from outcomes.
DROP POLICY IF EXISTS "read_all_plan_reviews" ON plan_reviews;
CREATE POLICY "read_all_plan_reviews" ON plan_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "insert_own_plan_review" ON plan_reviews;
CREATE POLICY "insert_own_plan_review" ON plan_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS plan_reviews_city_idx ON plan_reviews (city);
CREATE INDEX IF NOT EXISTS plan_reviews_move_idx ON plan_reviews (chosen_move);
