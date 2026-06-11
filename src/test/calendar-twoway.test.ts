import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];
const channelIds: string[] = [];

describe.skipIf(!hasDb)("two-way calendar sync", () => {
  afterAll(async () => {
    const { db, profiles, calendarChannels } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (channelIds.length) await db.delete(calendarChannels).where(inArray(calendarChannels.channelId, channelIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  it("maps a watch channel back to its owner", async () => {
    const { db, profiles, calendarChannels } = await import("@/db");
    const { channelOwner } = await import("@/lib/calendar-twoway");

    const uid = randomUUID();
    profileIds.push(uid);
    await db.insert(profiles).values({ id: uid, email: `cw-${uid}@test.dev`, name: "Watcher" });

    const channelId = randomUUID();
    channelIds.push(channelId);
    await db.insert(calendarChannels).values({ userId: uid, channelId, resourceId: "res-123" });

    expect(await channelOwner(channelId)).toBe(uid);
    expect(await channelOwner(randomUUID())).toBeNull();
  });

  it("skips reconciliation safely for a user without Google connected (no throw)", async () => {
    const { db, profiles } = await import("@/db");
    const { reconcileUserCalendar, registerWatch } = await import("@/lib/calendar-twoway");

    const uid = randomUUID();
    profileIds.push(uid);
    // No googleRefreshTokenEnc → not connected.
    await db.insert(profiles).values({ id: uid, email: `cw2-${uid}@test.dev`, name: "Unlinked" });

    // Reconcile is a best-effort no-op (0 removed), never throws.
    expect(await reconcileUserCalendar(uid)).toBe(0);

    // Registering a watch is skipped, not an error.
    const res = await registerWatch(uid, "https://example.com/api/calendar/webhook");
    expect(res.status).toBe("skipped");
  });

  it("ensureWatch no-ops when a live channel already exists, and skips without Google", async () => {
    const { db, profiles, calendarChannels } = await import("@/db");
    const { ensureWatch } = await import("@/lib/calendar-twoway");

    // Connected user who already has a non-expired watch channel → "already" (no Google call).
    const uid = randomUUID();
    profileIds.push(uid);
    await db.insert(profiles).values({
      id: uid,
      email: `cw3-${uid}@test.dev`,
      name: "Armed",
      googleRefreshTokenEnc: "enc",
    });
    const channelId = randomUUID();
    channelIds.push(channelId);
    await db.insert(calendarChannels).values({
      userId: uid,
      channelId,
      resourceId: "res-live",
      expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // a week out
    });
    expect((await ensureWatch(uid, "https://example.com/api/calendar/webhook")).status).toBe("already");

    // User without Google connected → skipped, never throws.
    const uid2 = randomUUID();
    profileIds.push(uid2);
    await db.insert(profiles).values({ id: uid2, email: `cw4-${uid2}@test.dev`, name: "Unlinked2" });
    expect((await ensureWatch(uid2, "https://example.com/api/calendar/webhook")).status).toBe("skipped");
  });
});
