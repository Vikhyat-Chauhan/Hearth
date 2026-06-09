// POST /api/bills — add a bill to track. Any member may add.
// amountCents is validated as a positive integer count of cents.
import { db, bills } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { billCreateSchema, parseBody } from "@/lib/validation";
import { isMember } from "@/lib/household";
import { ok, badRequest, unauthorized, forbidden, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const result = parseBody(billCreateSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);
  const { householdId, title, amountCents, dueDate } = result.data;

  if (!(await isMember(user.id, householdId))) {
    return forbidden("Only household members can add bills");
  }

  const [created] = await db
    .insert(bills)
    .values({ householdId, title, amountCents, dueDate: dueDate ?? null, createdBy: user.id })
    .returning();

  return ok(created, 201);
});
