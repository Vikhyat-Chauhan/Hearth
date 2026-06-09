// POST /api/chore-logs — mark a chore occurrence done (honor system).
// Any assignee can mark it; unique per (chore, occurrence_date) so a second mark
// is idempotent, not an error.
import { db, choreLogs } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { choreLogCreateSchema, parseBody } from "@/lib/validation";
import { isAssignee } from "@/lib/chores";
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
  // do nothing and still report success.
  await db
    .insert(choreLogs)
    .values({ choreId, userId: user.id, occurrenceDate })
    .onConflictDoNothing();

  return ok({ choreId, occurrenceDate, done: true });
});
