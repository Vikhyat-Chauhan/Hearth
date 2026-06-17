import { describe, it, expect, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { toISODate } from "@/lib/recurrence";

// Mock only auth; handlers run against the real DB.
vi.mock("@/lib/supabase/server", () => ({ getUser: vi.fn() }));
// No Next request scope in this unit test: stub cookies() so viewerToday() (used
// by the POST future-occurrence guard) falls back to UTC, like the server default.
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

// Integration: runs locally (DATABASE_URL from .env.local); skips in CI.
const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];
const householdIds: string[] = [];

describe.skipIf(!hasDb)("my chores + mark done", () => {
  afterAll(async () => {
    const { db, households, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (householdIds.length) await db.delete(households).where(inArray(households.id, householdIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  it("lists assigned chores, marks done idempotently, and reflects done state", async () => {
    const { db, profiles, households, memberships, chores, choreAssignments, choreLogs } = await import("@/db");
    const { and, eq } = await import("drizzle-orm");
    const { getMyChores, isAssignee } = await import("@/lib/chores");
    const { generateInviteCode } = await import("@/lib/household");

    const userId = randomUUID();
    const stranger = randomUUID();
    profileIds.push(userId);
    await db.insert(profiles).values({ id: userId, email: `u-${userId}@test.dev`, name: "User" });

    const [hh] = await db
      .insert(households)
      .values({ name: "Logs House", adminUserId: userId, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(hh.id);
    await db.insert(memberships).values({ householdId: hh.id, userId, role: "admin" });

    // Daily chore so "today" is always an occurrence.
    const [chore] = await db
      .insert(chores)
      .values({ householdId: hh.id, title: "Dishes", rrule: "FREQ=DAILY", createdBy: userId })
      .returning();
    await db.insert(choreAssignments).values({ choreId: chore.id, userId });

    expect(await isAssignee(userId, chore.id)).toBe(true);
    expect(await isAssignee(stranger, chore.id)).toBe(false);

    const before = await getMyChores(userId);
    expect(before).toHaveLength(1);
    const today = toISODate(new Date());
    expect(before[0].occurrences[0].date).toBe(today);
    expect(before[0].occurrences[0].done).toBe(false);

    // Mark today done — twice, to prove idempotency (unique chore+date).
    for (let i = 0; i < 2; i++) {
      await db
        .insert(choreLogs)
        .values({ choreId: chore.id, userId, occurrenceDate: today })
        .onConflictDoNothing();
    }
    const logs = await db.select().from(choreLogs).where(eq(choreLogs.choreId, chore.id));
    expect(logs).toHaveLength(1); // not duplicated

    const after = await getMyChores(userId);
    expect(after[0].occurrences.find((o) => o.date === today)?.done).toBe(true);

    // Mark undone — twice, to prove the delete is idempotent (no row, no error).
    for (let i = 0; i < 2; i++) {
      await db
        .delete(choreLogs)
        .where(and(eq(choreLogs.choreId, chore.id), eq(choreLogs.occurrenceDate, today)));
    }
    const afterUndo = await db.select().from(choreLogs).where(eq(choreLogs.choreId, chore.id));
    expect(afterUndo).toHaveLength(0);

    const reverted = await getMyChores(userId);
    expect(reverted[0].occurrences.find((o) => o.date === today)?.done).toBe(false);
  });

  it("rejects marking a future occurrence done via the POST route, writing no log", async () => {
    const { db, profiles, households, memberships, chores, choreAssignments, choreLogs } = await import("@/db");
    const { eq } = await import("drizzle-orm");
    const { getUser } = await import("@/lib/supabase/server");
    const { POST } = await import("@/app/api/chore-logs/route");
    const { generateInviteCode } = await import("@/lib/household");

    const userId = randomUUID();
    profileIds.push(userId);
    await db.insert(profiles).values({ id: userId, email: `u-${userId}@test.dev`, name: "User" });

    const [hh] = await db
      .insert(households)
      .values({ name: "Future House", adminUserId: userId, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(hh.id);
    await db.insert(memberships).values({ householdId: hh.id, userId, role: "admin" });

    const [chore] = await db
      .insert(chores)
      .values({ householdId: hh.id, title: "Trash", rrule: "FREQ=DAILY", createdBy: userId })
      .returning();
    await db.insert(choreAssignments).values({ choreId: chore.id, userId });

    const mocked = getUser as unknown as ReturnType<typeof vi.fn>;
    mocked.mockResolvedValue({ id: userId });

    function reqWith(occurrenceDate: string) {
      return new Request("http://localhost/api/chore-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choreId: chore.id, occurrenceDate }),
      });
    }

    // A future occurrence is rejected with 400 and persists nothing.
    const tomorrow = toISODate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    expect((await POST(reqWith(tomorrow))).status).toBe(400);
    const none = await db.select().from(choreLogs).where(eq(choreLogs.choreId, chore.id));
    expect(none).toHaveLength(0);

    // Today still succeeds and writes a single log.
    const today = toISODate(new Date());
    expect((await POST(reqWith(today))).status).toBe(200);
    const after = await db.select().from(choreLogs).where(eq(choreLogs.choreId, chore.id));
    expect(after).toHaveLength(1);
  });
});
