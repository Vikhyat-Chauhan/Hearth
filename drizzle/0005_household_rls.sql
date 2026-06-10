-- Defense-in-depth: enable Row-Level Security with household-scoped policies.
--
-- NOTE: the application connects via the Supabase pooler as the privileged
-- (superuser) role, which BYPASSES RLS — so these policies have no effect on
-- current code paths and cannot break the app. They only engage if a future path
-- queries through the Supabase anon/authenticated role (where auth.uid() is set
-- from the JWT). Authorization today is enforced in the API layer.
--
-- Policy design avoids RLS recursion: the `memberships` policy is a plain
-- `user_id = auth.uid()` check (no subquery), so the EXISTS subqueries other
-- tables run against it terminate.

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "households" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chore_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chore_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calendar_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "announcements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shopping_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bills" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "expense_splits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "settlements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Own profile only.
CREATE POLICY "profiles_self" ON "profiles"
  FOR ALL USING ("id" = auth.uid()) WITH CHECK ("id" = auth.uid());--> statement-breakpoint

-- Own membership rows only (non-recursive base used by every other policy).
CREATE POLICY "memberships_self" ON "memberships"
  FOR ALL USING ("user_id" = auth.uid()) WITH CHECK ("user_id" = auth.uid());--> statement-breakpoint

-- Households the user belongs to.
CREATE POLICY "households_member" ON "households"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM "memberships" m WHERE m."household_id" = "households"."id" AND m."user_id" = auth.uid()
  ));--> statement-breakpoint

-- Household-scoped tables: visible/writable to members of the owning household.
CREATE POLICY "chores_member" ON "chores"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM "memberships" m WHERE m."household_id" = "chores"."household_id" AND m."user_id" = auth.uid()
  ));--> statement-breakpoint
CREATE POLICY "announcements_member" ON "announcements"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM "memberships" m WHERE m."household_id" = "announcements"."household_id" AND m."user_id" = auth.uid()
  ));--> statement-breakpoint
CREATE POLICY "shopping_items_member" ON "shopping_items"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM "memberships" m WHERE m."household_id" = "shopping_items"."household_id" AND m."user_id" = auth.uid()
  ));--> statement-breakpoint
CREATE POLICY "bills_member" ON "bills"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM "memberships" m WHERE m."household_id" = "bills"."household_id" AND m."user_id" = auth.uid()
  ));--> statement-breakpoint
CREATE POLICY "expenses_member" ON "expenses"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM "memberships" m WHERE m."household_id" = "expenses"."household_id" AND m."user_id" = auth.uid()
  ));--> statement-breakpoint
CREATE POLICY "settlements_member" ON "settlements"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM "memberships" m WHERE m."household_id" = "settlements"."household_id" AND m."user_id" = auth.uid()
  ));--> statement-breakpoint

-- Child tables scoped through their parent chore's household.
CREATE POLICY "chore_assignments_member" ON "chore_assignments"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM "chores" c JOIN "memberships" m ON m."household_id" = c."household_id"
    WHERE c."id" = "chore_assignments"."chore_id" AND m."user_id" = auth.uid()
  ));--> statement-breakpoint
CREATE POLICY "chore_logs_member" ON "chore_logs"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM "chores" c JOIN "memberships" m ON m."household_id" = c."household_id"
    WHERE c."id" = "chore_logs"."chore_id" AND m."user_id" = auth.uid()
  ));--> statement-breakpoint

-- Calendar links belong to the owning user.
CREATE POLICY "calendar_links_self" ON "calendar_links"
  FOR ALL USING ("user_id" = auth.uid()) WITH CHECK ("user_id" = auth.uid());--> statement-breakpoint

-- Expense splits scoped through their parent expense's household.
CREATE POLICY "expense_splits_member" ON "expense_splits"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM "expenses" e JOIN "memberships" m ON m."household_id" = e."household_id"
    WHERE e."id" = "expense_splits"."expense_id" AND m."user_id" = auth.uid()
  ));
