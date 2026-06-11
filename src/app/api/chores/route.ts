// POST /api/chores — admin creates & assigns a chore (single or shared) with an
// RRULE recurrence, then syncs it to each connected assignee's Google Calendar.
import { eq, and, inArray } from "drizzle-orm";
import { db, chores, choreAssignments, memberships } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { choreCreateSchema, parseBody } from "@/lib/validation";
import { isAdmin } from "@/lib/household";
import { syncChoreToAssignees } from "@/lib/chore-sync";
import { toISODate } from "@/lib/recurrence";
import { ok, badRequest, unauthorized, forbidden, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const result = parseBody(choreCreateSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);
  const { householdId, title, description, rrule, assigneeUserIds } = result.data;

  if (!(await isAdmin(user.id, householdId))) {
    return forbidden("Only the household admin can create chores");
  }

  // Every assignee must be a member of this household.
  const members = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.householdId, householdId), inArray(memberships.userId, assigneeUserIds)));
  const memberIds = new Set(members.map((m) => m.userId));
  const invalid = assigneeUserIds.filter((id) => !memberIds.has(id));
  if (invalid.length > 0) {
    return badRequest("All assignees must be members of the household");
  }

  const chore = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(chores)
      .values({
        householdId,
        title,
        description: description ?? null,
        rrule,
        // Anchor the recurrence at the creation date; edits move it forward.
        scheduleFrom: toISODate(new Date()),
        createdBy: user.id,
      })
      .returning();
    await tx.insert(choreAssignments).values(
      assigneeUserIds.map((userId) => ({ choreId: created.id, userId })),
    );
    return created;
  });

  // Best-effort calendar sync (never blocks the response).
  await syncChoreToAssignees(chore, assigneeUserIds);

  return ok(chore, 201);
});
