// DELETE /api/households/members — admin removes a member from the household.
// Removes the member's chore assignments + calendar events for this household;
// other members' data is untouched. Chore completion logs are kept as history.
import { eq, and, inArray } from "drizzle-orm";
import { db, memberships, chores, choreAssignments } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { memberRemoveSchema, parseBody } from "@/lib/validation";
import { isAdmin } from "@/lib/household";
import { unsyncChore } from "@/lib/chore-sync";
import { ok, badRequest, unauthorized, forbidden, withErrorHandling } from "@/lib/api";

export const DELETE = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const result = parseBody(memberRemoveSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);
  const { householdId, userId } = result.data;

  if (!(await isAdmin(user.id, householdId))) {
    return forbidden("Only the household admin can remove members");
  }
  if (userId === user.id) {
    return badRequest("The admin can't remove themselves");
  }

  // Remove the member's calendar events + assignments for this household's chores.
  const householdChores = await db
    .select({ id: chores.id })
    .from(chores)
    .where(eq(chores.householdId, householdId));
  const choreIds = householdChores.map((c) => c.id);

  for (const choreId of choreIds) {
    await unsyncChore(choreId, [userId]); // deletes their event + CalendarLink
  }
  if (choreIds.length) {
    await db
      .delete(choreAssignments)
      .where(and(inArray(choreAssignments.choreId, choreIds), eq(choreAssignments.userId, userId)));
  }

  await db
    .delete(memberships)
    .where(and(eq(memberships.householdId, householdId), eq(memberships.userId, userId)));

  return ok({ householdId, userId, removed: true });
});
