import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];
const householdIds: string[] = [];

describe.skipIf(!hasDb)("multiple households per user", () => {
  afterAll(async () => {
    const { db, households, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (householdIds.length) await db.delete(households).where(inArray(households.id, householdIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  it("lists all memberships and defaults the active household to the most recent", async () => {
    const { db, profiles, households, memberships } = await import("@/db");
    const { generateInviteCode, listUserHouseholds, getHouseholdContext } = await import("@/lib/household");

    const uid = randomUUID();
    profileIds.push(uid);
    await db.insert(profiles).values({ id: uid, email: `mh-${uid}@test.dev`, name: "Nomad" });

    // First household (joined earlier).
    const [h1] = await db
      .insert(households)
      .values({ name: "House One", adminUserId: uid, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(h1.id);
    await db.insert(memberships).values({ householdId: h1.id, userId: uid, role: "admin" });

    // Second household, joined later → should be the most-recent default.
    const [h2] = await db
      .insert(households)
      .values({ name: "House Two", adminUserId: uid, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(h2.id);
    await db.insert(memberships).values({ householdId: h2.id, userId: uid, role: "member" });

    const list = await listUserHouseholds(uid);
    expect(list).toHaveLength(2);
    expect(list.map((h) => h.id).sort()).toEqual([h1.id, h2.id].sort());

    // No active cookie in unit scope → falls back to the most recent membership.
    const ctx = await getHouseholdContext(uid);
    expect(ctx?.household.id).toBe(h2.id);
  });
});
