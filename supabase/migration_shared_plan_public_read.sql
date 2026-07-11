-- ============================================================
-- Date Planner — let anyone with the link OPEN a shared plan (no login to view).
-- Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- ============================================================
-- The stored plan is already sanitized (no price, no conversation questions, no
-- risk/reward moves), and the id is a long unguessable token — so a shared link
-- behaves like an "unlisted" page: whoever has the link can read it, no sign-in.
-- Writing (edit / accept / chat) still requires a real (non-anonymous) login.
--
-- PRIVACY NOTE: this makes the row — including the embedded chat messages and the
-- owner/recipient display names — readable by ANYONE who has the link, without
-- signing in. Links are shared privately (e.g. WhatsApp) and are unguessable, so
-- this is the "unlisted link" trade-off in exchange for zero-friction opening.

DROP POLICY IF EXISTS "read_shared_plan" ON shared_plans;
CREATE POLICY "read_shared_plan" ON shared_plans FOR SELECT USING (true);
