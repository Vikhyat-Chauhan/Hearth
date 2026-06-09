// POST /api/shopping — add an item to the household shopping list.
// Any member may add.
import { db, shoppingItems } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { shoppingItemCreateSchema, parseBody } from "@/lib/validation";
import { isMember } from "@/lib/household";
import { ok, badRequest, unauthorized, forbidden, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const result = parseBody(shoppingItemCreateSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);
  const { householdId, name } = result.data;

  if (!(await isMember(user.id, householdId))) {
    return forbidden("Only household members can add items");
  }

  const [created] = await db
    .insert(shoppingItems)
    .values({ householdId, name, addedBy: user.id })
    .returning();

  return ok(created, 201);
});
