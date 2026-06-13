import { describe, it, expect, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";

// Mock only auth; the handler runs against the real DB.
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

describe.skipIf(!hasDb)("household rename: admin-only PATCH name", () => {
  afterAll(async () => {
    const { db, households, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (householdIds.length) await db.delete(households).where(inArray(households.id, householdIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  // Seed an admin + one member. Returns ids.
  async function seedHousehold(name: string) {
    const { db, profiles, households, memberships } = await import("@/db");
    const { generateInviteCode } = await import("@/lib/household");
    const admin = randomUUID();
    const m1 = randomUUID();
    profileIds.push(admin, m1);
    await db.insert(profiles).values([
      { id: admin, email: `a-${admin}@t.dev`, name: "Admin" },
      { id: m1, email: `m1-${m1}@t.dev`, name: "Mem One" },
    ]);
    const [hh] = await db
      .insert(households)
      .values({ name, adminUserId: admin, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(hh.id);
    await db.insert(memberships).values([
      { householdId: hh.id, userId: admin, role: "admin" },
      { householdId: hh.id, userId: m1, role: "member" },
    ]);
    return { admin, m1, hh };
  }

  async function nameOf(id: string) {
    const { db, households } = await import("@/db");
    const { eq } = await import("drizzle-orm");
    const [row] = await db.select().from(households).where(eq(households.id, id)).limit(1);
    return row?.name;
  }

  it("admin renames the household; rejects empty name and non-admins", async () => {
    const { getUser } = await import("@/lib/supabase/server");
    const { PATCH } = await import("@/app/api/households/[id]/route");
    const mocked = getUser as unknown as ReturnType<typeof vi.fn>;
    const { admin, m1, hh } = await seedHousehold("Old Name");
    const url = `http://t/api/households/${hh.id}`;

    // A member can't rename → 403, name unchanged.
    mocked.mockResolvedValue({ id: m1 });
    expect((await PATCH(req(url, "PATCH", { name: "Hijacked" }))).status).toBe(403);
    expect(await nameOf(hh.id)).toBe("Old Name");

    // Admin with an empty name → 400, name unchanged.
    mocked.mockResolvedValue({ id: admin });
    expect((await PATCH(req(url, "PATCH", { name: "   " }))).status).toBe(400);
    expect(await nameOf(hh.id)).toBe("Old Name");

    // Admin renames → 200 and the new name persists.
    expect((await PATCH(req(url, "PATCH", { name: "New Name" }))).status).toBe(200);
    expect(await nameOf(hh.id)).toBe("New Name");
  });
});
