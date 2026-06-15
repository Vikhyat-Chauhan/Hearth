import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { toISODate } from "@/lib/recurrence";

// --- Cron route auth (no DB; 401 paths return before any query) ------------
describe("GET /api/cron/retention auth", () => {
  it("returns 401 without the correct bearer token", async () => {
    process.env.CRON_SECRET = "test-secret";
    const { GET } = await import("@/app/api/cron/retention/route");

    const none = await GET(new Request("http://localhost/api/cron/retention"));
    expect(none.status).toBe(401);

    const wrong = await GET(
      new Request("http://localhost/api/cron/retention", {
        headers: { authorization: "Bearer nope" },
      }),
    );
    expect(wrong.status).toBe(401);
  });
});

// --- Pruning logic (DB-backed) ---------------------------------------------
const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];
const householdIds: string[] = [];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

describe.skipIf(!hasDb)("pruneOldData", () => {
  afterAll(async () => {
    const { db, households, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    // households cascade-delete chores/logs/announcements/shopping_items.
    if (householdIds.length) await db.delete(households).where(inArray(households.id, householdIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  it("deletes data past its window and keeps recent data", async () => {
    const { db, profiles, households, memberships, chores, choreLogs, announcements, shoppingItems } =
      await import("@/db");
    const { generateInviteCode } = await import("@/lib/household");
    const { pruneOldData } = await import("@/lib/retention");
    const { eq } = await import("drizzle-orm");

    // Tight windows so the test's "old" rows fall outside them deterministically.
    process.env.RETENTION_CHORELOG_DAYS = "30";
    process.env.RETENTION_ANNOUNCEMENT_DAYS = "30";
    process.env.RETENTION_SHOPPING_DAYS = "30";

    const uid = randomUUID();
    profileIds.push(uid);
    await db.insert(profiles).values({ id: uid, email: `ret-${uid}@test.dev`, name: "Ret" });

    const [hh] = await db
      .insert(households)
      .values({ name: "Retention House", adminUserId: uid, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(hh.id);
    await db.insert(memberships).values({ householdId: hh.id, userId: uid, role: "admin" });

    const [chore] = await db
      .insert(chores)
      .values({ householdId: hh.id, title: "Trash", rrule: "FREQ=DAILY", scheduleFrom: toISODate(daysAgo(100)), createdBy: uid })
      .returning();

    // chore_logs: one old (by occurrence_date), one recent.
    await db.insert(choreLogs).values([
      { choreId: chore.id, userId: uid, occurrenceDate: toISODate(daysAgo(100)) },
      { choreId: chore.id, userId: uid, occurrenceDate: toISODate(daysAgo(2)) },
    ]);

    // announcements: one old, one recent (created_at).
    const [oldAnn] = await db
      .insert(announcements)
      .values({ householdId: hh.id, authorId: uid, body: "old", createdAt: daysAgo(100) })
      .returning();
    const [newAnn] = await db
      .insert(announcements)
      .values({ householdId: hh.id, authorId: uid, body: "new", createdAt: daysAgo(1) })
      .returning();

    // shopping_items: old+checked (pruned), old+unchecked (kept), recent+checked (kept).
    const [oldChecked] = await db
      .insert(shoppingItems)
      .values({ householdId: hh.id, name: "old checked", addedBy: uid, checked: true, createdAt: daysAgo(100) })
      .returning();
    const [oldOpen] = await db
      .insert(shoppingItems)
      .values({ householdId: hh.id, name: "old open", addedBy: uid, checked: false, createdAt: daysAgo(100) })
      .returning();
    const [recentChecked] = await db
      .insert(shoppingItems)
      .values({ householdId: hh.id, name: "recent checked", addedBy: uid, checked: true, createdAt: daysAgo(1) })
      .returning();

    await pruneOldData();

    // chore_logs: old gone, recent kept.
    const logs = await db.select().from(choreLogs).where(eq(choreLogs.choreId, chore.id));
    expect(logs.map((l) => l.occurrenceDate)).toContain(toISODate(daysAgo(2)));
    expect(logs.map((l) => l.occurrenceDate)).not.toContain(toISODate(daysAgo(100)));

    // announcements: old gone, recent kept.
    expect(await db.select().from(announcements).where(eq(announcements.id, oldAnn.id))).toHaveLength(0);
    expect(await db.select().from(announcements).where(eq(announcements.id, newAnn.id))).toHaveLength(1);

    // shopping_items: only old+checked pruned.
    expect(await db.select().from(shoppingItems).where(eq(shoppingItems.id, oldChecked.id))).toHaveLength(0);
    expect(await db.select().from(shoppingItems).where(eq(shoppingItems.id, oldOpen.id))).toHaveLength(1);
    expect(await db.select().from(shoppingItems).where(eq(shoppingItems.id, recentChecked.id))).toHaveLength(1);
  });
});
