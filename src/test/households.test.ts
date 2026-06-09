import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { generateInviteCode } from "@/lib/household";

describe("generateInviteCode", () => {
  it("produces an 8-char code from the unambiguous alphabet", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/); // no 0/O/1/I
  });
  it("is effectively unique across calls", () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateInviteCode()));
    expect(codes.size).toBe(200);
  });
});

// Integration: runs locally (where .env.local provides DATABASE_URL); skips in CI.
const hasDb = !!process.env.DATABASE_URL;
const createdProfiles: string[] = [];
const createdHouseholds: string[] = [];

describe.skipIf(!hasDb)("household DB flow", () => {
  afterAll(async () => {
    const { db, households, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (createdHouseholds.length) await db.delete(households).where(inArray(households.id, createdHouseholds));
    if (createdProfiles.length) await db.delete(profiles).where(inArray(profiles.id, createdProfiles));
  });

  it("create → context → join → roles", async () => {
    const { db, households, memberships, profiles } = await import("@/db");
    const { getHouseholdContext, listMembers, isAdmin } = await import("@/lib/household");

    const adminId = randomUUID();
    const memberId = randomUUID();
    createdProfiles.push(adminId, memberId);

    await db.insert(profiles).values([
      { id: adminId, email: `admin-${adminId}@test.dev`, name: "Admin" },
      { id: memberId, email: `member-${memberId}@test.dev`, name: "Member" },
    ]);

    // Admin creates a household.
    const [hh] = await db
      .insert(households)
      .values({ name: "Test House", adminUserId: adminId, inviteCode: generateInviteCode() })
      .returning();
    createdHouseholds.push(hh.id);
    await db.insert(memberships).values({ householdId: hh.id, userId: adminId, role: "admin" });

    // Admin's context reflects the household and admin role.
    const ctx = await getHouseholdContext(adminId);
    expect(ctx?.household.id).toBe(hh.id);
    expect(ctx?.role).toBe("admin");
    expect(await isAdmin(adminId, hh.id)).toBe(true);

    // A member joins.
    await db.insert(memberships).values({ householdId: hh.id, userId: memberId, role: "member" });
    expect(await isAdmin(memberId, hh.id)).toBe(false);

    const members = await listMembers(hh.id);
    expect(members).toHaveLength(2);
    expect(members.map((m) => m.role).sort()).toEqual(["admin", "member"]);
  });
});
