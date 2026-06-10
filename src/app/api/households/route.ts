// POST /api/households — create a household; the caller becomes its admin.
// DELETE /api/households — the admin deletes the whole household (cascades).
import { eq } from "drizzle-orm";
import { db, households, memberships, chores } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { householdCreateSchema, householdDeleteSchema, parseBody } from "@/lib/validation";
import { generateInviteCode, isAdmin, ACTIVE_HOUSEHOLD_COOKIE } from "@/lib/household";
import { unsyncChore } from "@/lib/chore-sync";
import { ok, badRequest, unauthorized, forbidden, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const result = parseBody(householdCreateSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);

  // Generate an invite code that isn't already taken (retry a few times).
  let inviteCode = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const clash = await db
      .select({ id: households.id })
      .from(households)
      .where(eq(households.inviteCode, inviteCode))
      .limit(1);
    if (clash.length === 0) break;
    inviteCode = generateInviteCode();
  }

  const household = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(households)
      .values({ name: result.data.name, adminUserId: user.id, inviteCode })
      .returning();
    await tx.insert(memberships).values({
      householdId: created.id,
      userId: user.id,
      role: "admin",
    });
    return created;
  });

  // Make the newly created household the active one.
  const res = ok(household, 201);
  res.cookies.set(ACTIVE_HOUSEHOLD_COOKIE, household.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
});

export const DELETE = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const result = parseBody(householdDeleteSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);
  const { householdId } = result.data;

  if (!(await isAdmin(user.id, householdId))) {
    return forbidden("Only the household admin can delete the household");
  }

  // Best-effort: tear down every assignee's calendar events before the rows go.
  // Deleting the household cascades memberships/chores/assignments/logs/links/
  // announcements/shopping/bills/expenses/splits/settlements via DB foreign keys
  // (onDelete: "cascade"), but Google Calendar events are external, so unsync
  // them explicitly here.
  const householdChores = await db
    .select({ id: chores.id })
    .from(chores)
    .where(eq(chores.householdId, householdId));
  for (const c of householdChores) {
    await unsyncChore(c.id); // all assignees' events + CalendarLinks
  }

  await db.delete(households).where(eq(households.id, householdId));

  // The deleted household can't stay "active"; clear so the next request falls
  // back to the user's most-recent remaining membership (or the empty state).
  const res = ok({ householdId, deleted: true });
  res.cookies.set(ACTIVE_HOUSEHOLD_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
});
