import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { announcementCreateSchema, parseBody } from "@/lib/validation";

// Validation failure path needs no DB.
describe("announcement validation", () => {
  it("rejects an empty message body", () => {
    const r = parseBody(announcementCreateSchema, { householdId: randomUUID(), body: "  " });
    expect(r.success).toBe(false);
  });

  it("accepts a valid message", () => {
    const r = parseBody(announcementCreateSchema, { householdId: randomUUID(), body: "Hi all" });
    expect(r.success).toBe(true);
  });
});

const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];
const householdIds: string[] = [];

describe.skipIf(!hasDb)("announcements read model", () => {
  afterAll(async () => {
    const { db, households, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (householdIds.length) await db.delete(households).where(inArray(households.id, householdIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  it("persists an announcement and lists it newest-first with author info", async () => {
    const { db, profiles, households, memberships, announcements } = await import("@/db");
    const { generateInviteCode } = await import("@/lib/household");
    const { listAnnouncements } = await import("@/lib/announcements");

    const authorId = randomUUID();
    profileIds.push(authorId);
    await db.insert(profiles).values({ id: authorId, email: `a-${authorId}@test.dev`, name: "Poster" });

    const [hh] = await db
      .insert(households)
      .values({ name: "Board House", adminUserId: authorId, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(hh.id);
    await db.insert(memberships).values({ householdId: hh.id, userId: authorId, role: "admin" });

    await db.insert(announcements).values({ householdId: hh.id, authorId, body: "First post" });
    await db.insert(announcements).values({ householdId: hh.id, authorId, body: "Second post" });

    const list = await listAnnouncements(hh.id);
    expect(list).toHaveLength(2);
    expect(list[0].body).toBe("Second post"); // newest first
    expect(list[0].authorName).toBe("Poster");
  });
});
