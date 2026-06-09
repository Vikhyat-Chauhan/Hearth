import { describe, it, expect, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";

// Mock only auth; the handler runs against the real DB.
vi.mock("@/lib/supabase/server", () => ({ getUser: vi.fn() }));

const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];
const householdIds: string[] = [];

function reqWith(body: unknown) {
  return new Request("http://localhost/api/households/members", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!hasDb)("admin removes a member", () => {
  afterAll(async () => {
    const { db, households, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (householdIds.length) await db.delete(households).where(inArray(households.id, householdIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  it("enforces admin/self guards and cascades the member's assignments", async () => {
    const { db, profiles, households, memberships, chores, choreAssignments, choreLogs } = await import("@/db");
    const { eq, and } = await import("drizzle-orm");
    const { getUser } = await import("@/lib/supabase/server");
    const { DELETE } = await import("@/app/api/households/members/route");
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
      .values({ name: "Remove House", adminUserId: admin, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(hh.id);
    await db.insert(memberships).values([
      { householdId: hh.id, userId: admin, role: "admin" },
      { householdId: hh.id, userId: m1, role: "member" },
      { householdId: hh.id, userId: m2, role: "member" },
    ]);
    const [chore] = await db
      .insert(chores)
      .values({ householdId: hh.id, title: "Mop", rrule: "FREQ=WEEKLY;BYDAY=FR", createdBy: admin })
      .returning();
    await db.insert(choreAssignments).values([
      { choreId: chore.id, userId: m1 },
      { choreId: chore.id, userId: m2 },
    ]);
    await db.insert(choreLogs).values({ choreId: chore.id, userId: m1, occurrenceDate: "2026-06-05" });

    const mocked = getUser as unknown as ReturnType<typeof vi.fn>;

    // A member cannot remove anyone → 403.
    mocked.mockResolvedValue({ id: m2 });
    expect((await DELETE(reqWith({ householdId: hh.id, userId: m1 }))).status).toBe(403);

    // Admin cannot remove themselves → 400.
    mocked.mockResolvedValue({ id: admin });
    expect((await DELETE(reqWith({ householdId: hh.id, userId: admin }))).status).toBe(400);

    // Admin removes m1 → 200, m1's assignment + membership gone, m2 untouched.
    const res = await DELETE(reqWith({ householdId: hh.id, userId: m1 }));
    expect(res.status).toBe(200);

    const assignments = await db.select().from(choreAssignments).where(eq(choreAssignments.choreId, chore.id));
    expect(assignments.map((a) => a.userId)).toEqual([m2]);
    const m1Membership = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.householdId, hh.id), eq(memberships.userId, m1)));
    expect(m1Membership).toHaveLength(0);
    // Completion history is preserved.
    expect(await db.select().from(choreLogs).where(eq(choreLogs.choreId, chore.id))).toHaveLength(1);
  });
});
