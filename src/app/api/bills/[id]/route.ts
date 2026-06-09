// PATCH /api/bills/[id] — mark a bill paid/unpaid.
// DELETE /api/bills/[id] — remove a bill.
// Any member of the bill's household may do either.
import { eq } from "drizzle-orm";
import { db, bills } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { billUpdateSchema, parseBody } from "@/lib/validation";
import { isMember } from "@/lib/household";
import { ok, badRequest, unauthorized, forbidden, notFound, withErrorHandling } from "@/lib/api";

function idFromUrl(url: string): string {
  return url.split("/").pop()!.split("?")[0];
}

async function loadBill(id: string) {
  const [row] = await db
    .select({ id: bills.id, householdId: bills.householdId })
    .from(bills)
    .where(eq(bills.id, id))
    .limit(1);
  return row ?? null;
}

export const PATCH = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const id = idFromUrl(req.url);
  const result = parseBody(billUpdateSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);

  const bill = await loadBill(id);
  if (!bill) return notFound("Bill not found");
  if (!(await isMember(user.id, bill.householdId))) {
    return forbidden("Only household members can change this bill");
  }

  const [updated] = await db
    .update(bills)
    .set({ paid: result.data.paid })
    .where(eq(bills.id, id))
    .returning();

  return ok(updated);
});

export const DELETE = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const id = idFromUrl(req.url);
  const bill = await loadBill(id);
  if (!bill) return notFound("Bill not found");
  if (!(await isMember(user.id, bill.householdId))) {
    return forbidden("Only household members can remove this bill");
  }

  await db.delete(bills).where(eq(bills.id, id));
  return ok({ id, deleted: true });
});
