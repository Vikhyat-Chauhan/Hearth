import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

// Integration: runs locally (where .env.local provides DATABASE_URL); skips in CI.
const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];
const householdIds: string[] = [];

describe.skipIf(!hasDb)("my chores read model: co-assignees + schedule anchor", () => {
  afterAll(async () => {
    const { db, households, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (householdIds.length) await db.delete(households).where(inArray(households.id, householdIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  it("names co-assignees (with isSelf) and anchors occurrences on schedule_from", async () => {
    const { db, profiles, households, memberships, chores, choreAssignments } = await import("@/db");
    const { getMyChores } = await import("@/lib/chores");
    const { generateInviteCode } = await import("@/lib/household");

    const admin = randomUUID();
    const mate = randomUUID();
    profileIds.push(admin, mate);
    await db.insert(profiles).values([
      { id: admin, email: `a-${admin}@t.dev`, name: "Ada" },
      { id: mate, email: `b-${mate}@t.dev`, name: "Ben" },
    ]);

    const [hh] = await db
      .insert(households)
      .values({ name: "Read House", adminUserId: admin, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(hh.id);
    await db.insert(memberships).values([
      { householdId: hh.id, userId: admin, role: "admin" },
      { householdId: hh.id, userId: mate, role: "member" },
    ]);

    // Anchor a few weeks back (as a real create/edit would) so upcoming Mondays
    // fall inside the occurrence horizon; weekly-on-Monday → all occurrences Mondays.
    const back = new Date();
    back.setUTCDate(back.getUTCDate() - 28);
    const scheduleFrom = back.toISOString().slice(0, 10);
    const [chore] = await db
      .insert(chores)
      .values({
        householdId: hh.id,
        title: "Trash",
        rrule: "FREQ=WEEKLY;BYDAY=MO",
        scheduleFrom,
        createdBy: admin,
      })
      .returning();
    await db.insert(choreAssignments).values([
      { choreId: chore.id, userId: admin },
      { choreId: chore.id, userId: mate },
    ]);

    const mine = await getMyChores(admin);
    const row = mine.find((c) => c.id === chore.id);
    expect(row).toBeTruthy();

    // Co-assignee roster: both members, isSelf correct for the viewer.
    const self = row!.assignees.find((a) => a.userId === admin)!;
    const other = row!.assignees.find((a) => a.userId === mate)!;
    expect(self.isSelf).toBe(true);
    expect(other.isSelf).toBe(false);
    expect(other.name).toBe("Ben");

    // Occurrences are computed from the schedule anchor → all Mondays, non-empty.
    expect(row!.occurrences.length).toBeGreaterThan(0);
    for (const occ of row!.occurrences) {
      const [y, m, d] = occ.date.split("-").map(Number);
      expect(new Date(Date.UTC(y, m - 1, d)).getUTCDay()).toBe(1); // Monday
    }
  });
});

describe.skipIf(!hasDb)("all-household chores read model", () => {
  afterAll(async () => {
    const { db, households, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (householdIds.length) await db.delete(households).where(inArray(households.id, householdIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  it("returns every active chore in the household (incl. ones not assigned to the viewer); excludes inactive and other-household chores", async () => {
    const { db, profiles, households, memberships, chores, choreAssignments } = await import("@/db");
    const { getHouseholdChores } = await import("@/lib/chores");
    const { generateInviteCode } = await import("@/lib/household");

    const member = randomUUID(); // the viewer — assigned to nothing
    const mate = randomUUID();
    profileIds.push(member, mate);
    await db.insert(profiles).values([
      { id: member, email: `m-${member}@t.dev`, name: "Mia" },
      { id: mate, email: `n-${mate}@t.dev`, name: "Noah" },
    ]);

    const [hh] = await db
      .insert(households)
      .values({ name: "All House", adminUserId: mate, inviteCode: generateInviteCode() })
      .returning();
    const [other] = await db
      .insert(households)
      .values({ name: "Other House", adminUserId: mate, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(hh.id, other.id);
    await db.insert(memberships).values([
      { householdId: hh.id, userId: member, role: "member" },
      { householdId: hh.id, userId: mate, role: "admin" },
    ]);

    // A chore assigned to mate only (NOT the viewer); an inactive chore; and a
    // chore in another household the viewer doesn't belong to.
    const [assigned] = await db
      .insert(chores)
      .values({ householdId: hh.id, title: "Dishes", rrule: "FREQ=DAILY", createdBy: mate })
      .returning();
    await db.insert(choreAssignments).values({ choreId: assigned.id, userId: mate });
    const [inactive] = await db
      .insert(chores)
      .values({ householdId: hh.id, title: "Old", rrule: "FREQ=DAILY", active: false, createdBy: mate })
      .returning();
    const [foreign] = await db
      .insert(chores)
      .values({ householdId: other.id, title: "Not mine", rrule: "FREQ=DAILY", createdBy: mate })
      .returning();

    const all = await getHouseholdChores(member);
    const ids = all.map((c) => c.id);
    expect(ids).toContain(assigned.id); // visible though the viewer isn't an assignee
    expect(ids).not.toContain(inactive.id);
    expect(ids).not.toContain(foreign.id);

    // isSelf is computed for the viewer (who is assigned to nothing here).
    const row = all.find((c) => c.id === assigned.id)!;
    expect(row.assignees.every((a) => !a.isSelf)).toBe(true);
  });

  it("returns [] for a user with no household", async () => {
    const { getHouseholdChores } = await import("@/lib/chores");
    expect(await getHouseholdChores(randomUUID())).toEqual([]);
  });
});
