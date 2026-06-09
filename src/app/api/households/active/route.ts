// POST /api/households/active — switch which household is active for the current
// user (multi-household support). Stores the choice in a cookie that
// getHouseholdContext reads. The user must be a member of the target household.
import { eq } from "drizzle-orm";
import { db, households } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { householdActiveSchema, parseBody } from "@/lib/validation";
import { isMember, ACTIVE_HOUSEHOLD_COOKIE } from "@/lib/household";
import { ok, badRequest, unauthorized, forbidden, notFound, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const result = parseBody(householdActiveSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);
  const { householdId } = result.data;

  const [exists] = await db.select({ id: households.id }).from(households).where(eq(households.id, householdId)).limit(1);
  if (!exists) return notFound("Household not found");

  if (!(await isMember(user.id, householdId))) {
    return forbidden("You can only switch to a household you belong to");
  }

  const res = ok({ activeHouseholdId: householdId });
  res.cookies.set(ACTIVE_HOUSEHOLD_COOKIE, householdId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
});
