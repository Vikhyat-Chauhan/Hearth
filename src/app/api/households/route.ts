// POST /api/households — create a household; the caller becomes its admin.
import { eq } from "drizzle-orm";
import { db, households, memberships } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { householdCreateSchema, parseBody } from "@/lib/validation";
import { generateInviteCode } from "@/lib/household";
import { ok, badRequest, unauthorized, withErrorHandling } from "@/lib/api";

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

  return ok(household, 201);
});
