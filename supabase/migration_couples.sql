-- ============================================================
-- Couples — link two accounts into a couple via a shareable code.
-- Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- ============================================================
-- member_a creates the couple + code; member_b joins by entering the code.
-- Display names are denormalised so each side sees the other's name without
-- reading the other's profile row.

CREATE TABLE IF NOT EXISTS couples (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text UNIQUE NOT NULL,
  member_a       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_b       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  member_a_name  text,
  member_b_name  text,
  together_since date,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;

-- Members read / update / delete their own couple.
DROP POLICY IF EXISTS "read_couple" ON couples;
CREATE POLICY "read_couple" ON couples FOR SELECT
  USING (auth.uid() = member_a OR auth.uid() = member_b);

DROP POLICY IF EXISTS "insert_couple" ON couples;
CREATE POLICY "insert_couple" ON couples FOR INSERT WITH CHECK (auth.uid() = member_a);

DROP POLICY IF EXISTS "update_couple" ON couples;
CREATE POLICY "update_couple" ON couples FOR UPDATE
  USING (auth.uid() = member_a OR auth.uid() = member_b);

DROP POLICY IF EXISTS "delete_couple" ON couples;
CREATE POLICY "delete_couple" ON couples FOR DELETE
  USING (auth.uid() = member_a OR auth.uid() = member_b);

-- Join by code. The joiner isn't a member yet, so RLS can't permit this update —
-- a SECURITY DEFINER function validates and links them safely.
CREATE OR REPLACE FUNCTION join_couple(p_code text)
RETURNS couples
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c couples;
  v_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authed'; END IF;
  SELECT * INTO c FROM couples WHERE code = upper(trim(p_code)) LIMIT 1;
  IF c.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF c.member_a = auth.uid() THEN RAISE EXCEPTION 'own_code'; END IF;
  IF c.member_b IS NOT NULL THEN RAISE EXCEPTION 'full'; END IF;
  IF EXISTS (SELECT 1 FROM couples WHERE member_a = auth.uid() OR member_b = auth.uid()) THEN
    RAISE EXCEPTION 'already_paired';
  END IF;
  SELECT display_name INTO v_name FROM profiles WHERE user_id = auth.uid();
  UPDATE couples SET member_b = auth.uid(), member_b_name = v_name
    WHERE id = c.id AND member_b IS NULL
    RETURNING * INTO c;
  RETURN c;
END; $$;

GRANT EXECUTE ON FUNCTION join_couple(text) TO authenticated;
