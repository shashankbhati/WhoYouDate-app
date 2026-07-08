-- ============================================================
-- Date Planner — admin-managed city whitelist for auto-imported venues.
-- Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- ============================================================

CREATE TABLE IF NOT EXISTS plan_cities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city       text NOT NULL UNIQUE,   -- the name users type, e.g. "Berlin"
  near       text NOT NULL,          -- Foursquare "near" string, e.g. "Berlin, Germany"
  lat        double precision,       -- city centre — used for OSM landmark lookup
  lon        double precision,
  enabled    boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE plan_cities ENABLE ROW LEVEL SECURITY;

-- Readable by all (the client + server check the whitelist); writable by admins.
DROP POLICY IF EXISTS "read_plan_cities" ON plan_cities;
CREATE POLICY "read_plan_cities" ON plan_cities FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_insert_city" ON plan_cities;
CREATE POLICY "admin_insert_city" ON plan_cities FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'email') IN (SELECT email FROM admins));

DROP POLICY IF EXISTS "admin_update_city" ON plan_cities;
CREATE POLICY "admin_update_city" ON plan_cities FOR UPDATE
  USING ((auth.jwt() ->> 'email') IN (SELECT email FROM admins));

DROP POLICY IF EXISTS "admin_delete_city" ON plan_cities;
CREATE POLICY "admin_delete_city" ON plan_cities FOR DELETE
  USING ((auth.jwt() ->> 'email') IN (SELECT email FROM admins));

-- Keep Berlin working after the whitelist moves out of code.
INSERT INTO plan_cities (city, near, lat, lon)
VALUES ('Berlin', 'Berlin, Germany', 52.52, 13.405)
ON CONFLICT (city) DO NOTHING;
