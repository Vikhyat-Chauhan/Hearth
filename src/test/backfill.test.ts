import { describe, it, expect, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";

// Mock auth and the Google Calendar boundary (no real network).
vi.mock("@/lib/supabase/server", () => ({ getUser: vi.fn() }));
vi.mock("@/lib/calendar", () => ({
  syncChoreEvent: vi.fn().mockResolvedValue({ status: "synced", externalEventId: "evt_test" }),
  deleteChoreEvent: vi.fn().mockResolvedValue(undefined),
}));

const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];
const householdIds: string[] = [];

const req = () => new Request("http://localhost/api/calendar/backfill", { method: "POST" });

describe.skipIf(!hasDb)("connect Google later — backfill", () => {
  afterAll(async () => {
    const { db, households, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (householdIds.length) await db.delete(households).where(inArray(households.id, householdIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  it("rejects when not connected, and backfills CalendarLinks when connected", async () => {
    const { db, profiles, households, memberships, chores, choreAssignments, calendarLinks } = await import("@/db");
    const { eq, and } = await import("drizzle-orm");
    const { getUser } = await import("@/lib/supabase/server");
    const { POST } = await import("@/app/api/calendar/backfill/route");
    const { generateInviteCode } = await import("@/lib/household");

    const connectedUser = randomUUID();
    const unconnectedUser = randomUUID();
    profileIds.push(connectedUser, unconnectedUser);
    await db.insert(profiles).values([
      { id: connectedUser, email: `c-${connectedUser}@t.dev`, name: "C", googleRefreshTokenEnc: "enc-token" },
      { id: unconnectedUser, email: `u-${unconnectedUser}@t.dev`, name: "U" }, // no token
    ]);
    const [hh] = await db
      .insert(households)
      .values({ name: "Backfill House", adminUserId: connectedUser, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(hh.id);
    await db.insert(memberships).values({ householdId: hh.id, userId: connectedUser, role: "admin" });
    const [chore] = await db
      .insert(chores)
      .values({ householdId: hh.id, title: "Trash", rrule: "FREQ=WEEKLY;BYDAY=MO", createdBy: connectedUser })
      .returning();
    await db.insert(choreAssignments).values({ choreId: chore.id, userId: connectedUser });

    const mocked = getUser as unknown as ReturnType<typeof vi.fn>;

    // Unconnected → 400, no link.
    mocked.mockResolvedValue({ id: unconnectedUser });
    expect((await POST(req())).status).toBe(400);

    // Connected → 200, a CalendarLink created for the assigned chore.
    mocked.mockResolvedValue({ id: connectedUser });
    const res = await POST(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.synced).toBeGreaterThanOrEqual(1);

    const links = await db
      .select()
      .from(calendarLinks)
      .where(and(eq(calendarLinks.userId, connectedUser), eq(calendarLinks.choreId, chore.id)));
    expect(links).toHaveLength(1);
    expect(links[0].externalEventId).toBe("evt_test");
  });
});
