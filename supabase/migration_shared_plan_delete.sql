-- ============================================================
-- Let the owner delete a shared plan. Run in: Supabase SQL Editor. Idempotent.
-- ============================================================
-- Only the plan's owner can remove it (recipients can edit/chat, not delete).

DROP POLICY IF EXISTS "delete_shared_plan" ON shared_plans;
CREATE POLICY "delete_shared_plan" ON shared_plans FOR DELETE USING (auth.uid() = owner_id);
