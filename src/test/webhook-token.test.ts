import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];
const channelIds: string[] = [];

describe.skipIf(!hasDb)("webhook channel-token verification", () => {
  afterAll(async () => {
    const { db, profiles, calendarChannels } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (channelIds.length)
      await db.delete(calendarChannels).where(inArray(calendarChannels.channelId, channelIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  it("only resolves the owner when the channel token matches", async () => {
    const { db, profiles, calendarChannels } = await import("@/db");
    const { verifiedChannelOwner } = await import("@/lib/calendar-twoway");

    const uid = randomUUID();
    profileIds.push(uid);
    await db.insert(profiles).values({ id: uid, email: `wt-${uid}@test.dev`, name: "Watcher" });

    const channelId = randomUUID();
    channelIds.push(channelId);
    await db
      .insert(calendarChannels)
      .values({ userId: uid, channelId, token: "secret-token", resourceId: "res-1" });

    // Correct token → owner; wrong/absent token → null (forged notification).
    expect(await verifiedChannelOwner(channelId, "secret-token")).toBe(uid);
    expect(await verifiedChannelOwner(channelId, "wrong")).toBeNull();
    expect(await verifiedChannelOwner(channelId, null)).toBeNull();
    expect(await verifiedChannelOwner(randomUUID(), "secret-token")).toBeNull();
  });

  it("accepts a legacy channel that has no stored token", async () => {
    const { db, profiles, calendarChannels } = await import("@/db");
    const { verifiedChannelOwner } = await import("@/lib/calendar-twoway");

    const uid = randomUUID();
    profileIds.push(uid);
    await db.insert(profiles).values({ id: uid, email: `wt2-${uid}@test.dev`, name: "Legacy" });

    const channelId = randomUUID();
    channelIds.push(channelId);
    // No token column value → legacy row registered before the token existed.
    await db.insert(calendarChannels).values({ userId: uid, channelId, resourceId: "res-2" });

    expect(await verifiedChannelOwner(channelId, null)).toBe(uid);
  });
});
