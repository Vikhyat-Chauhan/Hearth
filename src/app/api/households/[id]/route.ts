// PATCH /api/households/[id] — admin renames the household.
import { eq } from "drizzle-orm";
import { db, households } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { householdCreateSchema, parseBody } from "@/lib/validation";
import { isAdmin } from "@/lib/household";
import { ok, badRequest, unauthorized, forbidden, notFound, withErrorHandling } from "@/lib/api";

async function loadHousehold(id: string) {
  const [row] = await db.select().from(households).where(eq(households.id, id)).limit(1);
  return row ?? null;
}

export const PATCH = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const id = req.url.split("/").pop()!.split("?")[0];
  const household = await loadHousehold(id);
  if (!household) return notFound("Household not found");
  if (!(await isAdmin(user.id, id))) {
    return forbidden("Only the household admin can rename the household");
  }

  const result = parseBody(householdCreateSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);

  const [updated] = await db
    .update(households)
    .set({ name: result.data.name })
    .where(eq(households.id, id))
    .returning();

  return ok(updated);
});
