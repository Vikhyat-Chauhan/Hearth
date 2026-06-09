// PATCH /api/shopping/[id] — check/uncheck an item.
// DELETE /api/shopping/[id] — remove an item.
// Any member of the item's household may do either.
import { eq } from "drizzle-orm";
import { db, shoppingItems } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { shoppingItemUpdateSchema, parseBody } from "@/lib/validation";
import { isMember } from "@/lib/household";
import { ok, badRequest, unauthorized, forbidden, notFound, withErrorHandling } from "@/lib/api";

function idFromUrl(url: string): string {
  return url.split("/").pop()!.split("?")[0];
}

async function loadItem(id: string) {
  const [row] = await db
    .select({ id: shoppingItems.id, householdId: shoppingItems.householdId })
    .from(shoppingItems)
    .where(eq(shoppingItems.id, id))
    .limit(1);
  return row ?? null;
}

export const PATCH = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const id = idFromUrl(req.url);
  const result = parseBody(shoppingItemUpdateSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);

  const item = await loadItem(id);
  if (!item) return notFound("Item not found");
  if (!(await isMember(user.id, item.householdId))) {
    return forbidden("Only household members can change this item");
  }

  const { checked } = result.data;
  const [updated] = await db
    .update(shoppingItems)
    .set({ checked, checkedBy: checked ? user.id : null })
    .where(eq(shoppingItems.id, id))
    .returning();

  return ok(updated);
});

export const DELETE = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const id = idFromUrl(req.url);
  const item = await loadItem(id);
  if (!item) return notFound("Item not found");
  if (!(await isMember(user.id, item.householdId))) {
    return forbidden("Only household members can remove this item");
  }

  await db.delete(shoppingItems).where(eq(shoppingItems.id, id));
  return ok({ id, deleted: true });
});
