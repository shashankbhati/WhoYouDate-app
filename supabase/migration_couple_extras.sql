-- ============================================================
-- Couples extras — the shared jar (bucket list) + the daily pulse.
-- Run in: Supabase Dashboard → SQL Editor. Idempotent. Needs migration_couples.sql.
-- ============================================================
-- Both members read/write their couple's rows; membership is checked against the
-- couples table (same pattern as couple_answers).

-- ── Shared jar (mutual bucket list) ──
CREATE TABLE IF NOT EXISTS couple_jar (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id  uuid REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  label      text NOT NULL,
  emoji      text,
  added_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  done       boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE couple_jar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rw_couple_jar" ON couple_jar;
CREATE POLICY "rw_couple_jar" ON couple_jar FOR ALL
  USING (EXISTS (
    SELECT 1 FROM couples c
    WHERE c.id = couple_jar.couple_id AND (c.member_a = auth.uid() OR c.member_b = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM couples c
    WHERE c.id = couple_jar.couple_id AND (c.member_a = auth.uid() OR c.member_b = auth.uid())
  ));

-- ── Daily pulse ("How full is your cup today?") ──
CREATE TABLE IF NOT EXISTS couple_pulse (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id  uuid REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pdate      date NOT NULL,
  level      text NOT NULL,
  UNIQUE (couple_id, user_id, pdate)
);
ALTER TABLE couple_pulse ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_couple_pulse" ON couple_pulse;
CREATE POLICY "read_couple_pulse" ON couple_pulse FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM couples c
    WHERE c.id = couple_pulse.couple_id AND (c.member_a = auth.uid() OR c.member_b = auth.uid())
  ));

DROP POLICY IF EXISTS "write_couple_pulse" ON couple_pulse;
CREATE POLICY "write_couple_pulse" ON couple_pulse FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM couples c
      WHERE c.id = couple_pulse.couple_id AND (c.member_a = auth.uid() OR c.member_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "update_couple_pulse" ON couple_pulse;
CREATE POLICY "update_couple_pulse" ON couple_pulse FOR UPDATE USING (user_id = auth.uid());
