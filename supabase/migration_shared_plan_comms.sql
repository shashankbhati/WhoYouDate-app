-- ============================================================
-- Date Planner — two-way communication on a shared plan.
-- Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- ============================================================
-- Everything lives on the SINGLE shared_plans row — no per-message rows, no chat
-- explosion. Both people read/write the same row; Realtime keeps it live.

ALTER TABLE shared_plans ADD COLUMN IF NOT EXISTS status        text DEFAULT 'pending'; -- pending | changed | accepted
ALTER TABLE shared_plans ADD COLUMN IF NOT EXISTS messages      jsonb DEFAULT '[]';     -- small embedded thread (capped in code)
ALTER TABLE shared_plans ADD COLUMN IF NOT EXISTS last_actor    text;                   -- who last touched it
ALTER TABLE shared_plans ADD COLUMN IF NOT EXISTS updated_at    timestamptz DEFAULT now();
ALTER TABLE shared_plans ADD COLUMN IF NOT EXISTS owner_seen_at timestamptz;            -- for the owner "new update" indicator

-- Enable Realtime so the sender's open page updates live when the recipient edits.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE shared_plans;
EXCEPTION
  WHEN duplicate_object THEN NULL; -- already added
  WHEN undefined_object THEN NULL; -- publication missing (older projects)
END $$;
