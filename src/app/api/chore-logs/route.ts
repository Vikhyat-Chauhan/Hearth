// POST /api/chore-logs — mark a chore occurrence done (honor system).
// DELETE /api/chore-logs — mark a previously-done occurrence undone.
// Any assignee can mark or unmark; unique per (chore, occurrence_date) so a second
// mark / a repeat unmark is idempotent, not an error.
import { and, eq } from "drizzle-orm";
import { db, choreLogs } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { choreLogCreateSchema, parseBody } from "@/lib/validation";
import { isAssignee } from "@/lib/chores";
import { cancelOccurrenceOnCalendars, restoreOccurrenceOnCalendars } from "@/lib/chore-sync";
import { ok, badRequest, unauthorized, forbidden, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const result = parseBody(choreLogCreateSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);
  const { choreId, occurrenceDate } = result.data;

  if (!(await isAssignee(user.id, choreId))) {
    return forbidden("You can only mark chores assigned to you");
  }

  // Idempotent: unique (chore_id, occurrence_date). If already marked by anyone,
  // the insert no-ops and returns no row — so a repeat mark skips the calendar work.
  const inserted = await db
    .insert(choreLogs)
    .values({ choreId, userId: user.id, occurrenceDate })
    .onConflictDoNothing()
    .returning({ id: choreLogs.id });

  if (inserted.length > 0) {
    // First time this occurrence is cleared: drop that instance from every
    // assignee's calendar. Best-effort — a Google failure never fails the mark.
    try {
      await cancelOccurrenceOnCalendars(choreId, occurrenceDate);
    } catch (err) {
      console.error(`[chore-logs] calendar clear failed for chore ${choreId} @ ${occurrenceDate}:`, err);
    }
  }

  return ok({ choreId, occurrenceDate, done: true });
});

export const DELETE = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const result = parseBody(choreLogCreateSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);
  const { choreId, occurrenceDate } = result.data;

  if (!(await isAssignee(user.id, choreId))) {
    return forbidden("You can only unmark chores assigned to you");
  }

  // Idempotent: if no row matches (already undone), the delete returns nothing and
  // we skip the calendar work, mirroring POST's onConflictDoNothing.
  const deleted = await db
    .delete(choreLogs)
    .where(and(eq(choreLogs.choreId, choreId), eq(choreLogs.occurrenceDate, occurrenceDate)))
    .returning({ id: choreLogs.id });

  if (deleted.length > 0) {
    // Re-show that instance on every assignee's calendar. Best-effort — a Google
    // failure never fails the unmark.
    try {
      await restoreOccurrenceOnCalendars(choreId, occurrenceDate);
    } catch (err) {
      console.error(`[chore-logs] calendar restore failed for chore ${choreId} @ ${occurrenceDate}:`, err);
    }
  }

  return ok({ choreId, occurrenceDate, done: false });
});
