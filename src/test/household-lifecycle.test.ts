import { describe, it, expect, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";

// Mock only auth; the handlers run against the real DB.
vi.mock("@/lib/supabase/server", () => ({ getUser: vi.fn() }));

const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];
const householdIds: string[] = [];

function req(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!hasDb)("household lifecycle: leave / delete / transfer", () => {
  afterAll(async () => {
    const { db, households, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (householdIds.length) await db.delete(households).where(inArray(households.id, householdIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  // Seed an admin + two members + a chore assigned to both members. Returns ids.
  async function seedHousehold(name: string) {
    const { db, profiles, households, memberships, chores, choreAssignments } = await import("@/db");
    const { generateInviteCode } = await import("@/lib/household");
    const admin = randomUUID();
    const m1 = randomUUID();
    const m2 = randomUUID();
    profileIds.push(admin, m1, m2);
    await db.insert(profiles).values([
      { id: admin, email: `a-${admin}@t.dev`, name: "Admin" },
      { id: m1, email: `m1-${m1}@t.dev`, name: "Mem One" },
      { id: m2, email: `m2-${m2}@t.dev`, name: "Mem Two" },
    ]);
    const [hh] = await db
      .insert(households)
      .values({ name, adminUserId: admin, inviteCode: generateInviteCode() })
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
    return { admin, m1, m2, hh, chore };
  }

  it("member leaves: removes their membership + assignments, admin can't leave", async () => {
    const { db, memberships, choreAssignments } = await import("@/db");
    const { eq, and } = await import("drizzle-orm");
    const { getUser } = await import("@/lib/supabase/server");
    const { POST: LEAVE } = await import("@/app/api/households/leave/route");
    const mocked = getUser as unknown as ReturnType<typeof vi.fn>;
    const { admin, m1, m2, hh, chore } = await seedHousehold("Leave House");

    // A non-member can't leave → 403.
    mocked.mockResolvedValue({ id: randomUUID() });
    expect((await LEAVE(req("http://t/api/households/leave", "POST", { householdId: hh.id }))).status).toBe(403);

    // The admin can't leave → 400.
    mocked.mockResolvedValue({ id: admin });
    expect((await LEAVE(req("http://t/api/households/leave", "POST", { householdId: hh.id }))).status).toBe(400);

    // m1 leaves → 200; their membership + assignment gone, m2 untouched.
    mocked.mockResolvedValue({ id: m1 });
    expect((await LEAVE(req("http://t/api/households/leave", "POST", { householdId: hh.id }))).status).toBe(200);

    const m1Membership = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.householdId, hh.id), eq(memberships.userId, m1)));
    expect(m1Membership).toHaveLength(0);
    const assignments = await db.select().from(choreAssignments).where(eq(choreAssignments.choreId, chore.id));
    expect(assignments.map((a) => a.userId)).toEqual([m2]);
  });

  it("admin transfers to a member and leaves; non-admin/self/non-member are rejected", async () => {
    const { db, households, memberships } = await import("@/db");
    const { eq, and } = await import("drizzle-orm");
    const { getUser } = await import("@/lib/supabase/server");
    const { POST: TRANSFER } = await import("@/app/api/households/transfer/route");
    const mocked = getUser as unknown as ReturnType<typeof vi.fn>;
    const { admin, m1, m2, hh } = await seedHousehold("Transfer House");

    // A member can't transfer → 403.
    mocked.mockResolvedValue({ id: m2 });
    expect(
      (await TRANSFER(req("http://t/api/households/transfer", "POST", { householdId: hh.id, newAdminUserId: m1 }))).status,
    ).toBe(403);

    mocked.mockResolvedValue({ id: admin });
    // Transferring to self → 400.
    expect(
      (await TRANSFER(req("http://t/api/households/transfer", "POST", { householdId: hh.id, newAdminUserId: admin }))).status,
    ).toBe(400);
    // Transferring to a non-member → 400.
    expect(
      (await TRANSFER(req("http://t/api/households/transfer", "POST", { householdId: hh.id, newAdminUserId: randomUUID() }))).status,
    ).toBe(400);

    // Admin hands off to m1 → 200; m1 is admin, household.adminUserId updated, old admin gone.
    expect(
      (await TRANSFER(req("http://t/api/households/transfer", "POST", { householdId: hh.id, newAdminUserId: m1 }))).status,
    ).toBe(200);

    const [m1Row] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.householdId, hh.id), eq(memberships.userId, m1)));
    expect(m1Row.role).toBe("admin");
    const [hhRow] = await db.select().from(households).where(eq(households.id, hh.id));
    expect(hhRow.adminUserId).toBe(m1);
    const oldAdmin = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.householdId, hh.id), eq(memberships.userId, admin)));
    expect(oldAdmin).toHaveLength(0);
  });

  it("admin deletes the household (cascade); a member is forbidden", async () => {
    const { db, households, memberships, chores } = await import("@/db");
    const { eq } = await import("drizzle-orm");
    const { getUser } = await import("@/lib/supabase/server");
    const { DELETE } = await import("@/app/api/households/route");
    const mocked = getUser as unknown as ReturnType<typeof vi.fn>;
    const { admin, m1, hh, chore } = await seedHousehold("Delete House");

    // A member can't delete → 403.
    mocked.mockResolvedValue({ id: m1 });
    expect((await DELETE(req("http://t/api/households", "DELETE", { householdId: hh.id }))).status).toBe(403);

    // Admin deletes → 200; household + memberships + chores cascade-gone.
    mocked.mockResolvedValue({ id: admin });
    expect((await DELETE(req("http://t/api/households", "DELETE", { householdId: hh.id }))).status).toBe(200);

    expect(await db.select().from(households).where(eq(households.id, hh.id))).toHaveLength(0);
    expect(await db.select().from(memberships).where(eq(memberships.householdId, hh.id))).toHaveLength(0);
    expect(await db.select().from(chores).where(eq(chores.id, chore.id))).toHaveLength(0);
  });
});
