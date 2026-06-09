// Expense splitting read model (server-only). An expense is paid by one member
// and split into per-member shares (cents). Settlements are direct payments that
// reduce balances. All money is integer cents; balances are zero-sum.

import { eq, desc, inArray } from "drizzle-orm";
import { db, expenses, expenseSplits, settlements } from "@/db";
import { listMembers } from "@/lib/household";
import type { MemberBalance } from "@/lib/types";

export interface ExpenseView {
  id: string;
  description: string;
  amountCents: number;
  paidBy: string;
  createdAt: Date;
  splits: { userId: string; shareCents: number }[];
}

export interface SettlementView {
  id: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  createdAt: Date;
}

/** All expenses for a household, newest first, each with its split shares. */
export async function listExpenses(householdId: string): Promise<ExpenseView[]> {
  const rows = await db
    .select({
      id: expenses.id,
      description: expenses.description,
      amountCents: expenses.amountCents,
      paidBy: expenses.paidBy,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .where(eq(expenses.householdId, householdId))
    .orderBy(desc(expenses.createdAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const splitRows = await db
    .select({ expenseId: expenseSplits.expenseId, userId: expenseSplits.userId, shareCents: expenseSplits.shareCents })
    .from(expenseSplits)
    .where(inArray(expenseSplits.expenseId, ids));

  const byExpense = new Map<string, { userId: string; shareCents: number }[]>();
  for (const s of splitRows) {
    if (!byExpense.has(s.expenseId)) byExpense.set(s.expenseId, []);
    byExpense.get(s.expenseId)!.push({ userId: s.userId, shareCents: s.shareCents });
  }

  return rows.map((r) => ({ ...r, splits: byExpense.get(r.id) ?? [] }));
}

/** Settlements for a household, newest first. */
export async function listSettlements(householdId: string): Promise<SettlementView[]> {
  return db
    .select({
      id: settlements.id,
      fromUserId: settlements.fromUserId,
      toUserId: settlements.toUserId,
      amountCents: settlements.amountCents,
      createdAt: settlements.createdAt,
    })
    .from(settlements)
    .where(eq(settlements.householdId, householdId))
    .orderBy(desc(settlements.createdAt));
}

/**
 * Net balance per member. Positive = others owe them; negative = they owe.
 * Built so the result always sums to zero:
 *  - each split share moves `share` from the ower to the payer
 *  - each settlement moves `amount` from payer (from) toward zero, reducing the receiver (to)
 */
export async function computeBalances(householdId: string): Promise<MemberBalance[]> {
  const members = await listMembers(householdId);
  const net = new Map<string, number>();
  for (const m of members) net.set(m.userId, 0);
  const bump = (userId: string, delta: number) => {
    net.set(userId, (net.get(userId) ?? 0) + delta);
  };

  const expenseRows = await listExpenses(householdId);
  for (const e of expenseRows) {
    for (const s of e.splits) {
      bump(e.paidBy, s.shareCents); // payer is owed this share
      bump(s.userId, -s.shareCents); // this member owes their share
    }
  }

  const settlementRows = await listSettlements(householdId);
  for (const s of settlementRows) {
    bump(s.fromUserId, s.amountCents); // paying down what they owe
    bump(s.toUserId, -s.amountCents); // receiving reduces what they're owed
  }

  return members.map((m) => ({
    userId: m.userId,
    name: m.name,
    email: m.email,
    netCents: net.get(m.userId) ?? 0,
  }));
}
