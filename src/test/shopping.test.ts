import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { shoppingItemCreateSchema, parseBody } from "@/lib/validation";

describe("shopping item validation", () => {
  it("rejects an empty item name", () => {
    const r = parseBody(shoppingItemCreateSchema, { householdId: randomUUID(), name: "" });
    expect(r.success).toBe(false);
  });

  it("accepts a valid item name", () => {
    const r = parseBody(shoppingItemCreateSchema, { householdId: randomUUID(), name: "Milk" });
    expect(r.success).toBe(true);
  });
});

const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];
const householdIds: string[] = [];

describe.skipIf(!hasDb)("shopping list read model", () => {
  afterAll(async () => {
    const { db, households, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (householdIds.length) await db.delete(households).where(inArray(households.id, householdIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  it("orders unchecked items before checked ones", async () => {
    const { db, profiles, households, memberships, shoppingItems } = await import("@/db");
    const { generateInviteCode } = await import("@/lib/household");
    const { listShoppingItems } = await import("@/lib/shopping");

    const uid = randomUUID();
    profileIds.push(uid);
    await db.insert(profiles).values({ id: uid, email: `s-${uid}@test.dev`, name: "Shopper" });

    const [hh] = await db
      .insert(households)
      .values({ name: "Cart House", adminUserId: uid, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(hh.id);
    await db.insert(memberships).values({ householdId: hh.id, userId: uid, role: "admin" });

    await db.insert(shoppingItems).values({ householdId: hh.id, name: "Bought", addedBy: uid, checked: true });
    await db.insert(shoppingItems).values({ householdId: hh.id, name: "Needed", addedBy: uid, checked: false });

    const list = await listShoppingItems(hh.id);
    expect(list).toHaveLength(2);
    expect(list[0].checked).toBe(false); // unchecked first
    expect(list[0].name).toBe("Needed");
  });
});
