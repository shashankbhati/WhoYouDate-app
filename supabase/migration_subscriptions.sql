-- ============================================================
-- WhoAmIDating — Migration: email subscriptions (digest + watch-a-name)
-- Run in: Supabase Dashboard → SQL Editor → New query
-- Safe to run multiple times (idempotent).
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL,
  -- '' = weekly digest only; a first name (lowercased) = watch that name
  watch_name        text NOT NULL DEFAULT '',
  wants_digest      boolean NOT NULL DEFAULT true,
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  unsubscribed      boolean NOT NULL DEFAULT false,
  last_notified_at  timestamptz,
  created_at        timestamptz DEFAULT now(),
  UNIQUE (email, watch_name)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone may opt in (insert). There is intentionally NO public SELECT/UPDATE/
-- DELETE policy: emails are readable only by the service role (used by the
-- cron sender and the unsubscribe endpoint). This keeps the email list private.
DROP POLICY IF EXISTS "insert_subscription" ON subscriptions;
CREATE POLICY "insert_subscription" ON subscriptions FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS subscriptions_watch_name_idx ON subscriptions (watch_name);
CREATE INDEX IF NOT EXISTS subscriptions_token_idx      ON subscriptions (unsubscribe_token);
