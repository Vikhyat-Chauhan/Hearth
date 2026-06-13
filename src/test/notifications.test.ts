import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { notificationPrefsSchema, parseBody } from "@/lib/validation";
import { toISODate } from "@/lib/recurrence";

// --- Validation (no DB) ----------------------------------------------------
describe("notificationPrefsSchema", () => {
  it("accepts a single boolean preference", () => {
    expect(parseBody(notificationPrefsSchema, { notifyChores: false }).success).toBe(true);
    expect(parseBody(notificationPrefsSchema, { notifyAnnouncements: true }).success).toBe(true);
  });

  it("rejects a non-boolean value", () => {
    expect(parseBody(notificationPrefsSchema, { notifyChores: "yes" }).success).toBe(false);
  });

  it("rejects an empty payload (nothing to update)", () => {
    expect(parseBody(notificationPrefsSchema, {}).success).toBe(false);
  });
});

// --- Cron route auth (no DB; 401 paths return before any query) ------------
describe("GET /api/cron/due-chores auth", () => {
  it("returns 401 without the correct bearer token", async () => {
    process.env.CRON_SECRET = "test-secret";
    const { GET } = await import("@/app/api/cron/due-chores/route");
    const res = await GET(new Request("http://localhost/api/cron/due-chores"));
    expect(res.status).toBe(401);

    const wrong = await GET(
      new Request("http://localhost/api/cron/due-chores", {
        headers: { authorization: "Bearer nope" },
      }),
    );
    expect(wrong.status).toBe(401);
  });
});

// --- Recipient/digest logic (DB-backed) ------------------------------------
const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];
const householdIds: string[] = [];

describe.skipIf(!hasDb)("notification recipients & digests", () => {
  afterAll(async () => {
    const { db, households, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (householdIds.length) await db.delete(households).where(inArray(households.id, householdIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  it("announcement recipients exclude the author and opted-out members", async () => {
    const { db, profiles, households, memberships } = await import("@/db");
    const { generateInviteCode } = await import("@/lib/household");
    const { recipientsForAnnouncement } = await import("@/lib/notifications");

    const author = randomUUID();
    const optedIn = randomUUID();
    const optedOut = randomUUID();
    profileIds.push(author, optedIn, optedOut);
    await db.insert(profiles).values([
      { id: author, email: `author-${author}@test.dev`, name: "Author" },
      { id: optedIn, email: `in-${optedIn}@test.dev`, name: "In" },
      { id: optedOut, email: `out-${optedOut}@test.dev`, name: "Out", notifyAnnouncements: false },
    ]);

    const [hh] = await db
      .insert(households)
      .values({ name: "Notify House", adminUserId: author, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(hh.id);
    await db.insert(memberships).values([
      { householdId: hh.id, userId: author, role: "admin" },
      { householdId: hh.id, userId: optedIn, role: "member" },
      { householdId: hh.id, userId: optedOut, role: "member" },
    ]);

    const recipients = await recipientsForAnnouncement(hh.id, author);
    const emails = recipients.map((r) => r.email);
    expect(emails).toContain(`in-${optedIn}@test.dev`);
    expect(emails).not.toContain(`author-${author}@test.dev`); // author excluded
    expect(emails).not.toContain(`out-${optedOut}@test.dev`); // opted out
  });

  it("due digest groups today's undone chores and skips done / opted-out", async () => {
    const { db, profiles, households, memberships, chores, choreAssignments, choreLogs } =
      await import("@/db");
    const { generateInviteCode } = await import("@/lib/household");
    const { dueChoreDigests } = await import("@/lib/notifications");

    const today = toISODate(new Date());
    const wantsEmail = randomUUID();
    const optedOut = randomUUID();
    profileIds.push(wantsEmail, optedOut);
    await db.insert(profiles).values([
      { id: wantsEmail, email: `due-${wantsEmail}@test.dev`, name: "Due Dan" },
      { id: optedOut, email: `noemail-${optedOut}@test.dev`, name: "Quiet", notifyChores: false },
    ]);

    const [hh] = await db
      .insert(households)
      .values({ name: "Chore House", adminUserId: wantsEmail, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(hh.id);
    await db.insert(memberships).values([
      { householdId: hh.id, userId: wantsEmail, role: "admin" },
      { householdId: hh.id, userId: optedOut, role: "member" },
    ]);

    // Three daily chores anchored today → all due today.
    const [dueChore] = await db
      .insert(chores)
      .values({ householdId: hh.id, title: "Take out trash", rrule: "FREQ=DAILY", scheduleFrom: today, createdBy: wantsEmail })
      .returning();
    const [doneChore] = await db
      .insert(chores)
      .values({ householdId: hh.id, title: "Already done", rrule: "FREQ=DAILY", scheduleFrom: today, createdBy: wantsEmail })
      .returning();
    const [optedOutChore] = await db
      .insert(chores)
      .values({ householdId: hh.id, title: "Quiet chore", rrule: "FREQ=DAILY", scheduleFrom: today, createdBy: wantsEmail })
      .returning();

    await db.insert(choreAssignments).values([
      { choreId: dueChore.id, userId: wantsEmail },
      { choreId: doneChore.id, userId: wantsEmail },
      { choreId: optedOutChore.id, userId: optedOut },
    ]);
    // doneChore already logged for today → excluded.
    await db.insert(choreLogs).values({ choreId: doneChore.id, userId: wantsEmail, occurrenceDate: today });

    const digests = await dueChoreDigests();
    const mine = digests.find((d) => d.email === `due-${wantsEmail}@test.dev`);
    expect(mine).toBeDefined();
    expect(mine!.titles).toContain("Take out trash");
    expect(mine!.titles).not.toContain("Already done"); // done today

    // Opted-out member gets no digest at all.
    expect(digests.find((d) => d.email === `noemail-${optedOut}@test.dev`)).toBeUndefined();
  });
});
