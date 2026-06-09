// Shopping list read model (server-only): the shared list for a household,
// unchecked items first, each with the name of who added it.

import { eq, asc, desc } from "drizzle-orm";
import { db, shoppingItems, profiles } from "@/db";

export interface ShoppingItemView {
  id: string;
  name: string;
  checked: boolean;
  addedBy: string;
  addedByName: string | null;
  addedByEmail: string;
  createdAt: Date;
}

/** All shopping items for a household: unchecked first, then newest first. */
export async function listShoppingItems(householdId: string): Promise<ShoppingItemView[]> {
  return db
    .select({
      id: shoppingItems.id,
      name: shoppingItems.name,
      checked: shoppingItems.checked,
      addedBy: shoppingItems.addedBy,
      addedByName: profiles.name,
      addedByEmail: profiles.email,
      createdAt: shoppingItems.createdAt,
    })
    .from(shoppingItems)
    .innerJoin(profiles, eq(shoppingItems.addedBy, profiles.id))
    .where(eq(shoppingItems.householdId, householdId))
    .orderBy(asc(shoppingItems.checked), desc(shoppingItems.createdAt));
}
