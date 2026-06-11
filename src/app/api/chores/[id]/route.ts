// PATCH /api/chores/[id] — admin edits a chore (title/description/recurrence/
// assignees), reconciling assignments and calendar events.
// DELETE /api/chores/[id] — admin deletes a chore; cascades + removes events.
import { eq, and, inArray } from "drizzle-orm";
import { db, chores, choreAssignments, memberships } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { choreUpdateSchema, parseBody } from "@/lib/validation";
import { isAdmin } from "@/lib/household";
import { syncChoreToAssignees, unsyncChore } from "@/lib/chore-sync";
import { toISODate, nextAnchorOnEdit } from "@/lib/recurrence";
import { ok, badRequest, unauthorized, forbidden, notFound, withErrorHandling } from "@/lib/api";

async function loadChore(choreId: string) {
  const [chore] = await db.select().from(chores).where(eq(chores.id, choreId)).limit(1);
  return chore ?? null;
}

export const PATCH = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const choreId = req.url.split("/").pop()!.split("?")[0];
  const chore = await loadChore(choreId);
  if (!chore) return notFound("Chore not found");
  if (!(await isAdmin(user.id, chore.householdId))) {
    return forbidden("Only the household admin can edit chores");
  }

  const result = parseBody(choreUpdateSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);
  const { title, description, rrule, assigneeUserIds } = result.data;

  // Assignees must all be members of the chore's household.
  const members = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.householdId, chore.householdId), inArray(memberships.userId, assigneeUserIds)));
  const memberIds = new Set(members.map((m) => m.userId));
  if (assigneeUserIds.some((id) => !memberIds.has(id))) {
    return badRequest("All assignees must be members of the household");
  }

  const current = await db
    .select({ userId: choreAssignments.userId })
    .from(choreAssignments)
    .where(eq(choreAssignments.choreId, choreId));
  const currentIds = new Set(current.map((c) => c.userId));
  const nextIds = new Set(assigneeUserIds);
  const toAdd = assigneeUserIds.filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !nextIds.has(id));

  // Re-anchor the schedule to today ONLY when the recurrence actually changes,
  // so the edit applies from now on (past occurrences untouched) without a
  // trivial title/description edit reshuffling the cadence.
  const scheduleFrom = nextAnchorOnEdit(chore.rrule, chore.scheduleFrom, rrule, toISODate(new Date()));

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(chores)
      .set({ title, description: description ?? null, rrule, scheduleFrom })
      .where(eq(chores.id, choreId))
      .returning();
    if (toRemove.length) {
      await tx
        .delete(choreAssignments)
        .where(and(eq(choreAssignments.choreId, choreId), inArray(choreAssignments.userId, toRemove)));
    }
    if (toAdd.length) {
      await tx.insert(choreAssignments).values(toAdd.map((userId) => ({ choreId, userId })));
    }
    return row;
  });

  // Calendar reconcile (best-effort): drop removed, upsert kept + added.
  if (toRemove.length) await unsyncChore(choreId, toRemove);
  await syncChoreToAssignees(updated, assigneeUserIds);

  return ok(updated);
});

export const DELETE = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const choreId = req.url.split("/").pop()!.split("?")[0];
  const chore = await loadChore(choreId);
  if (!chore) return notFound("Chore not found");
  if (!(await isAdmin(user.id, chore.householdId))) {
    return forbidden("Only the household admin can delete chores");
  }

  // Remove calendar events + links first, then delete (cascades assignments/logs).
  await unsyncChore(choreId);
  await db.delete(chores).where(eq(chores.id, choreId));

  return ok({ id: choreId, deleted: true });
});
