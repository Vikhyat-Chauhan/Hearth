// POST /api/expenses — record a shared expense and its per-member split.
// Any member may add. The payer and every split member must belong to the
// household; split shares must sum to the total (enforced in validation).
import { and, eq, inArray } from "drizzle-orm";
import { db, expenses, expenseSplits, memberships } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { expenseCreateSchema, parseBody } from "@/lib/validation";
import { isMember } from "@/lib/household";
import { ok, badRequest, unauthorized, forbidden, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const result = parseBody(expenseCreateSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);
  const { householdId, description, amountCents, paidBy, splits } = result.data;

  if (!(await isMember(user.id, householdId))) {
    return forbidden("Only household members can add expenses");
  }

  // Everyone referenced (payer + split members) must be in this household.
  const referenced = Array.from(new Set([paidBy, ...splits.map((s) => s.userId)]));
  const members = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.householdId, householdId), inArray(memberships.userId, referenced)));
  const memberIds = new Set(members.map((m) => m.userId));
  if (referenced.some((id) => !memberIds.has(id))) {
    return badRequest("The payer and everyone in the split must be household members");
  }

  const expense = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(expenses)
      .values({ householdId, description, amountCents, paidBy, createdBy: user.id })
      .returning();
    await tx.insert(expenseSplits).values(
      splits.map((s) => ({ expenseId: created.id, userId: s.userId, shareCents: s.shareCents })),
    );
    return created;
  });

  return ok(expense, 201);
});
