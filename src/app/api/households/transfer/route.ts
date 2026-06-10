// POST /api/households/transfer — the admin hands the household to another
// member and leaves in one step. The chosen member becomes the new admin; the
// outgoing admin's assignments + calendar events are cleaned up and their
// membership removed (same cleanup as leaving).
import { eq, and } from "drizzle-orm";
import { db, households, memberships } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { householdTransferSchema, parseBody } from "@/lib/validation";
import { isAdmin, isMember, purgeMemberFromHousehold, ACTIVE_HOUSEHOLD_COOKIE } from "@/lib/household";
import { ok, badRequest, unauthorized, forbidden, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const result = parseBody(householdTransferSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);
  const { householdId, newAdminUserId } = result.data;

  if (!(await isAdmin(user.id, householdId))) {
    return forbidden("Only the household admin can transfer the household");
  }
  if (newAdminUserId === user.id) {
    return badRequest("Choose a different member to make admin");
  }
  if (!(await isMember(newAdminUserId, householdId))) {
    return badRequest("That person isn't a member of this household");
  }

  // Promote the successor, then the outgoing admin leaves.
  await db
    .update(memberships)
    .set({ role: "admin" })
    .where(and(eq(memberships.householdId, householdId), eq(memberships.userId, newAdminUserId)));
  await db.update(households).set({ adminUserId: newAdminUserId }).where(eq(households.id, householdId));

  await purgeMemberFromHousehold(user.id, householdId);

  const res = ok({ householdId, newAdminUserId, transferred: true });
  res.cookies.set(ACTIVE_HOUSEHOLD_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
});
