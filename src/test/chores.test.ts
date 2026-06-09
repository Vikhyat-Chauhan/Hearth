import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

// Integration: runs locally (DATABASE_URL from .env.local); skips in CI.
const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];
const householdIds: string[] = [];

describe.skipIf(!hasDb)("chore create + calendar sync", () => {
  afterAll(async () => {
    const { db, households, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (householdIds.length) await db.delete(households).where(inArray(households.id, householdIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  it("persists chore + assignments and skips calendar for unconnected assignees", async () => {
    const { db, profiles, households, memberships, chores, choreAssignments, calendarLinks } = await import("@/db");
    const { eq } = await import("drizzle-orm");
    const { syncChoreToAssignees } = await import("@/lib/chore-sync");
    const { generateInviteCode } = await import("@/lib/household");

    const adminId = randomUUID();
    const m1 = randomUUID();
    profileIds.push(adminId, m1);
    await db.insert(profiles).values([
      { id: adminId, email: `a-${adminId}@test.dev`, name: "Admin" },
      // No googleRefreshTokenEnc → calendar sync must skip, not error.
      { id: m1, email: `m-${m1}@test.dev`, name: "Mate" },
    ]);

    const [hh] = await db
      .insert(households)
      .values({ name: "Chore House", adminUserId: adminId, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(hh.id);
    await db.insert(memberships).values([
      { householdId: hh.id, userId: adminId, role: "admin" },
      { householdId: hh.id, userId: m1, role: "member" },
    ]);

    const [chore] = await db
      .insert(chores)
      .values({
        householdId: hh.id,
        title: "Take out trash",
        description: null,
        rrule: "FREQ=WEEKLY;BYDAY=MO",
        createdBy: adminId,
      })
      .returning();
    await db.insert(choreAssignments).values([
      { choreId: chore.id, userId: adminId },
      { choreId: chore.id, userId: m1 },
    ]);

    // Best-effort sync: no tokens → no links, and crucially no throw.
    await syncChoreToAssignees(chore, [adminId, m1]);

    const assignments = await db.select().from(choreAssignments).where(eq(choreAssignments.choreId, chore.id));
    expect(assignments).toHaveLength(2);

    const links = await db.select().from(calendarLinks).where(eq(calendarLinks.choreId, chore.id));
    expect(links).toHaveLength(0); // skipped — neither assignee connected Google
  });
});
