-- ============================================================
-- Date Planner — shareable plans ("send it to your date").
-- Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- ============================================================
-- Only the SANITIZED itinerary is stored here (venues, timing, weather). The
-- price, the conversation questions, and the risk/reward moves are never saved,
-- so a recipient can't recover them. Reading/editing requires a real (non-
-- anonymous) login — the link is the capability, the login is the gate.

CREATE TABLE IF NOT EXISTS shared_plans (
  id             text PRIMARY KEY,          -- short unguessable token, used in the URL
  owner_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  owner_name     text,                       -- sender's real name (from Google), for "Planned by …"
  city           text NOT NULL,
  weather_banner text,
  steps          jsonb NOT NULL DEFAULT '[]', -- sanitized stops only
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE shared_plans ENABLE ROW LEVEL SECURITY;

-- Real (non-anonymous) logins only. Anonymous browse-sessions are blocked, which
-- forces the recipient to sign in before they can open the plan.
CREATE OR REPLACE FUNCTION is_real_login() RETURNS boolean
  LANGUAGE sql STABLE AS
$$ SELECT coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false $$;

DROP POLICY IF EXISTS "read_shared_plan" ON shared_plans;
CREATE POLICY "read_shared_plan" ON shared_plans FOR SELECT USING (is_real_login());

DROP POLICY IF EXISTS "insert_shared_plan" ON shared_plans;
CREATE POLICY "insert_shared_plan" ON shared_plans FOR INSERT
  WITH CHECK (auth.uid() = owner_id AND is_real_login());

-- Anyone with the link (and a real login) can edit — collaborative, like a chat.
DROP POLICY IF EXISTS "update_shared_plan" ON shared_plans;
CREATE POLICY "update_shared_plan" ON shared_plans FOR UPDATE USING (is_real_login());
