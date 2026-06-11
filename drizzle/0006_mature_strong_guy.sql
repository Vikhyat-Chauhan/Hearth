ALTER TABLE "chores" ADD COLUMN "schedule_from" date;
--> statement-breakpoint
-- Backfill existing chores: anchor them at their creation date so their
-- recurrence keeps generating the same occurrences as before this column.
UPDATE "chores" SET "schedule_from" = "created_at"::date WHERE "schedule_from" IS NULL;