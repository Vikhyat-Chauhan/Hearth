// POST /api/settlements — record a direct payment from one member to another,
// reducing their balance. Any member may record one; both parties must belong
// to the household.
import { and, eq, inArray } from "drizzle-orm";
import { db, settlements, memberships } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { settlementCreateSchema, parseBody } from "@/lib/validation";
import { isMember } from "@/lib/household";
import { ok, badRequest, unauthorized, forbidden, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const result = parseBody(settlementCreateSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);
  const { householdId, fromUserId, toUserId, amountCents } = result.data;

  if (!(await isMember(user.id, householdId))) {
    return forbidden("Only household members can record settlements");
  }

  const members = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.householdId, householdId), inArray(memberships.userId, [fromUserId, toUserId])));
  if (members.length !== 2) {
    return badRequest("Both parties must be household members");
  }

  const [created] = await db
    .insert(settlements)
    .values({ householdId, fromUserId, toUserId, amountCents, createdBy: user.id })
    .returning();

  return ok(created, 201);
});
