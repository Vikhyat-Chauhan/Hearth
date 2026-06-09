// POST /api/households/join — join a household by invite code as a member.
import { eq, and } from "drizzle-orm";
import { db, households, memberships } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { householdJoinSchema, parseBody } from "@/lib/validation";
import { ok, badRequest, unauthorized, notFound, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const result = parseBody(householdJoinSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);

  const code = result.data.inviteCode.trim().toUpperCase();
  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.inviteCode, code))
    .limit(1);
  if (!household) return notFound("No household found for that invite code");

  const existing = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.householdId, household.id), eq(memberships.userId, user.id)))
    .limit(1);
  if (existing.length > 0) {
    return badRequest("You're already a member of this household");
  }

  await db.insert(memberships).values({
    householdId: household.id,
    userId: user.id,
    role: "member",
  });

  return ok(household, 201);
});
