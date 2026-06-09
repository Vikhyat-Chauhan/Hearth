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

  it("defaults isAnonymous to false when omitted", () => {
    const r = parseBody(announcementCreateSchema, { householdId: randomUUID(), body: "Hi" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.isAnonymous).toBe(false);
  });

  it("accepts isAnonymous true and rejects a non-boolean", () => {
    expect(parseBody(announcementCreateSchema, { householdId: randomUUID(), body: "Hi", isAnonymous: true }).success).toBe(true);
    expect(parseBody(announcementCreateSchema, { householdId: randomUUID(), body: "Hi", isAnonymous: "yes" }).success).toBe(false);
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

  it("hides the author name for anonymous posts but keeps it for normal ones", async () => {
    const { db, profiles, households, memberships, announcements } = await import("@/db");
    const { generateInviteCode } = await import("@/lib/household");
    const { listAnnouncements } = await import("@/lib/announcements");

    const authorId = randomUUID();
    profileIds.push(authorId);
    await db.insert(profiles).values({ id: authorId, email: `anon-${authorId}@test.dev`, name: "Secret Poster" });

    const [hh] = await db
      .insert(households)
      .values({ name: "Anon House", adminUserId: authorId, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(hh.id);
    await db.insert(memberships).values({ householdId: hh.id, userId: authorId, role: "admin" });

    await db.insert(announcements).values({ householdId: hh.id, authorId, body: "Signed", isAnonymous: false });
    await db.insert(announcements).values({ householdId: hh.id, authorId, body: "Hidden", isAnonymous: true });

    const list = await listAnnouncements(hh.id);
    const anon = list.find((a) => a.body === "Hidden")!;
    const signed = list.find((a) => a.body === "Signed")!;

    // Anonymous: name/email stripped, but authorId retained for delete rights.
    expect(anon.isAnonymous).toBe(true);
    expect(anon.authorName).toBeNull();
    expect(anon.authorEmail).toBe("");
    expect(anon.authorId).toBe(authorId);

    // Normal post still shows the author.
    expect(signed.isAnonymous).toBe(false);
    expect(signed.authorName).toBe("Secret Poster");
  });
});
