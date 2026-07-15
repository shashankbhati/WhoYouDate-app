-- ============================================================
-- Question of the Day — both partners answer a daily prompt.
-- Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- Requires migration_couples.sql first.
-- ============================================================
-- One answer per member per couple per day. Only the couple's two members can
-- read/write their answers; the "reveal until you've answered" gate is a UX
-- mechanic handled client-side (it's between two consenting partners).

CREATE TABLE IF NOT EXISTS couple_answers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id  uuid REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  qdate      date NOT NULL,
  answer     text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (couple_id, user_id, qdate)
);
ALTER TABLE couple_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_couple_answers" ON couple_answers;
CREATE POLICY "read_couple_answers" ON couple_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM couples c
    WHERE c.id = couple_answers.couple_id AND (c.member_a = auth.uid() OR c.member_b = auth.uid())
  ));

DROP POLICY IF EXISTS "insert_couple_answers" ON couple_answers;
CREATE POLICY "insert_couple_answers" ON couple_answers FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM couples c
      WHERE c.id = couple_answers.couple_id AND (c.member_a = auth.uid() OR c.member_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "update_couple_answers" ON couple_answers;
CREATE POLICY "update_couple_answers" ON couple_answers FOR UPDATE USING (user_id = auth.uid());
