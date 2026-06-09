import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];
const householdIds: string[] = [];

describe.skipIf(!hasDb)("chore edit reconcile + delete cascade", () => {
  afterAll(async () => {
    const { db, households, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (householdIds.length) await db.delete(households).where(inArray(households.id, householdIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  it("reassigns assignees and cascades on delete", async () => {
    const { db, profiles, households, memberships, chores, choreAssignments, choreLogs } = await import("@/db");
    const { eq, and, inArray } = await import("drizzle-orm");
    const { unsyncChore } = await import("@/lib/chore-sync");
    const { generateInviteCode } = await import("@/lib/household");

    const admin = randomUUID();
    const m1 = randomUUID();
    const m2 = randomUUID();
    profileIds.push(admin, m1, m2);
    await db.insert(profiles).values([
      { id: admin, email: `a-${admin}@t.dev`, name: "A" },
      { id: m1, email: `m1-${m1}@t.dev`, name: "M1" },
      { id: m2, email: `m2-${m2}@t.dev`, name: "M2" },
    ]);

    const [hh] = await db
      .insert(households)
      .values({ name: "Edit House", adminUserId: admin, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(hh.id);
    await db.insert(memberships).values([
      { householdId: hh.id, userId: admin, role: "admin" },
      { householdId: hh.id, userId: m1, role: "member" },
      { householdId: hh.id, userId: m2, role: "member" },
    ]);

    const [chore] = await db
      .insert(chores)
      .values({ householdId: hh.id, title: "Vacuum", rrule: "FREQ=WEEKLY;BYDAY=MO", createdBy: admin })
      .returning();
    await db.insert(choreAssignments).values([
      { choreId: chore.id, userId: admin },
      { choreId: chore.id, userId: m1 },
    ]);
    await db.insert(choreLogs).values({ choreId: chore.id, userId: m1, occurrenceDate: "2026-06-08" });

    // Edit: reassign from [admin, m1] → [admin, m2].
    await db
      .delete(choreAssignments)
      .where(and(eq(choreAssignments.choreId, chore.id), inArray(choreAssignments.userId, [m1])));
    await db.insert(choreAssignments).values({ choreId: chore.id, userId: m2 });
    await unsyncChore(chore.id, [m1]); // no links (no tokens) — must not throw

    const after = await db.select().from(choreAssignments).where(eq(choreAssignments.choreId, chore.id));
    expect(after.map((a) => a.userId).sort()).toEqual([admin, m2].sort());

    // Delete: cascades assignments + logs.
    await unsyncChore(chore.id);
    await db.delete(chores).where(eq(chores.id, chore.id));

    expect(await db.select().from(chores).where(eq(chores.id, chore.id))).toHaveLength(0);
    expect(await db.select().from(choreAssignments).where(eq(choreAssignments.choreId, chore.id))).toHaveLength(0);
    expect(await db.select().from(choreLogs).where(eq(choreLogs.choreId, chore.id))).toHaveLength(0);
  });
});
