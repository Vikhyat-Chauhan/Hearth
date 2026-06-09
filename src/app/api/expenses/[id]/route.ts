// DELETE /api/expenses/[id] — remove an expense (its splits cascade).
// Any member of the expense's household may delete it.
import { eq } from "drizzle-orm";
import { db, expenses } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { isMember } from "@/lib/household";
import { ok, unauthorized, forbidden, notFound, withErrorHandling } from "@/lib/api";

export const DELETE = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const id = req.url.split("/").pop()!.split("?")[0];

  const [row] = await db
    .select({ householdId: expenses.householdId })
    .from(expenses)
    .where(eq(expenses.id, id))
    .limit(1);
  if (!row) return notFound("Expense not found");

  if (!(await isMember(user.id, row.householdId))) {
    return forbidden("Only household members can delete this expense");
  }

  await db.delete(expenses).where(eq(expenses.id, id));
  return ok({ id, deleted: true });
});
