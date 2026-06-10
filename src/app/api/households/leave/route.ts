// POST /api/households/leave — a member leaves a household they belong to.
// Removes their chore assignments + calendar events for this household; their
// completion logs are kept as history. The admin can't leave (it would orphan
// the house) — they delete it or transfer it first.
import { getUser } from "@/lib/supabase/server";
import { householdLeaveSchema, parseBody } from "@/lib/validation";
import { isAdmin, isMember, purgeMemberFromHousehold, ACTIVE_HOUSEHOLD_COOKIE } from "@/lib/household";
import { ok, badRequest, unauthorized, forbidden, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const result = parseBody(householdLeaveSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);
  const { householdId } = result.data;

  if (!(await isMember(user.id, householdId))) {
    return forbidden("You can only leave a household you belong to");
  }
  if (await isAdmin(user.id, householdId)) {
    return badRequest("As admin, delete the household or transfer it to another member first");
  }

  await purgeMemberFromHousehold(user.id, householdId);

  const res = ok({ householdId, left: true });
  res.cookies.set(ACTIVE_HOUSEHOLD_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
});
