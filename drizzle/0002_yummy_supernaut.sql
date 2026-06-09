CREATE INDEX "announcements_household_idx" ON "announcements" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "bills_household_idx" ON "bills" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "calendar_links_user_idx" ON "calendar_links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "calendar_links_chore_idx" ON "calendar_links" USING btree ("chore_id");--> statement-breakpoint
CREATE INDEX "chore_assignments_user_idx" ON "chore_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chores_household_idx" ON "chores" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "expenses_household_idx" ON "expenses" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "settlements_household_idx" ON "settlements" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "shopping_items_household_idx" ON "shopping_items" USING btree ("household_id");