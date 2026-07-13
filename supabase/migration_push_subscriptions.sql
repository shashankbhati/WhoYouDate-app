-- ============================================================
-- Web Push subscriptions — ping a user when their date replies / accepts / reacts.
-- Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- ============================================================
-- Each row is one browser/device push subscription for a user. The server (service
-- role) reads these to send pushes; users only ever see/manage their own.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint     text UNIQUE NOT NULL,
  subscription jsonb NOT NULL,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_push_ins" ON push_subscriptions;
CREATE POLICY "own_push_ins" ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_push_sel" ON push_subscriptions;
CREATE POLICY "own_push_sel" ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_push_upd" ON push_subscriptions;
CREATE POLICY "own_push_upd" ON push_subscriptions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_push_del" ON push_subscriptions;
CREATE POLICY "own_push_del" ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);
