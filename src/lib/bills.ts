// Bills read model (server-only): tracked utilities/bills for a household.
// Unpaid first, then by due date (nulls last), then newest.

import { eq, asc, desc } from "drizzle-orm";
import { db, bills } from "@/db";

export interface BillView {
  id: string;
  title: string;
  amountCents: number;
  dueDate: string | null;
  paid: boolean;
  createdBy: string;
  createdAt: Date;
}

/** All bills for a household: unpaid first, then soonest due date. */
export async function listBills(householdId: string): Promise<BillView[]> {
  return db
    .select({
      id: bills.id,
      title: bills.title,
      amountCents: bills.amountCents,
      dueDate: bills.dueDate,
      paid: bills.paid,
      createdBy: bills.createdBy,
      createdAt: bills.createdAt,
    })
    .from(bills)
    .where(eq(bills.householdId, householdId))
    .orderBy(asc(bills.paid), asc(bills.dueDate), desc(bills.createdAt));
}
