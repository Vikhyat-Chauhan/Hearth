import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

// --- Cron route auth (no DB; 401 paths return before any query) ------------
describe("calendar maintenance cron auth", () => {
  it("refresh-channels returns 401 without the correct bearer token", async () => {
    process.env.CRON_SECRET = "test-secret";
    const { GET } = await import("@/app/api/calendar/refresh-channels/route");
    expect((await GET(new Request("http://localhost/api/calendar/refresh-channels"))).status).toBe(401);
    const wrong = await GET(
      new Request("http://localhost/api/calendar/refresh-channels", {
        headers: { authorization: "Bearer nope" },
      }),
    );
    expect(wrong.status).toBe(401);
  });

  it("calendar-cleanup returns 401 without the correct bearer token", async () => {
    process.env.CRON_SECRET = "test-secret";
    const { GET } = await import("@/app/api/cron/calendar-cleanup/route");
    expect((await GET(new Request("http://localhost/api/cron/calendar-cleanup"))).status).toBe(401);
    const wrong = await GET(
      new Request("http://localhost/api/cron/calendar-cleanup", {
        headers: { authorization: "Bearer nope" },
      }),
    );
    expect(wrong.status).toBe(401);
  });
});

// --- refreshExpiringWatches (DB-backed) ------------------------------------
const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];
const channelIds: string[] = [];

describe.skipIf(!hasDb)("refreshExpiringWatches", () => {
  afterAll(async () => {
    const { db, profiles, calendarChannels } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (channelIds.length) await db.delete(calendarChannels).where(inArray(calendarChannels.channelId, channelIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  it("clears an expiring channel for a disconnected user and leaves far-future ones", async () => {
    const { db, profiles, calendarChannels } = await import("@/db");
    const { refreshExpiringWatches } = await import("@/lib/calendar-twoway");
    const { eq } = await import("drizzle-orm");

    // Disconnected user (no Google token) with a channel expiring in 1h → within the
    // 48h window. refreshExpiringWatches drops it; registerWatch self-skips (no token).
    const expiringUser = randomUUID();
    profileIds.push(expiringUser);
    await db.insert(profiles).values({ id: expiringUser, email: `exp-${expiringUser}@test.dev`, name: "Exp" });
    const expiringChannel = randomUUID();
    channelIds.push(expiringChannel);
    await db.insert(calendarChannels).values({
      userId: expiringUser,
      channelId: expiringChannel,
      resourceId: "res-exp",
      expiration: new Date(Date.now() + 60 * 60 * 1000),
    });

    // A different user whose channel is a week out → untouched.
    const liveUser = randomUUID();
    profileIds.push(liveUser);
    await db.insert(profiles).values({ id: liveUser, email: `live-${liveUser}@test.dev`, name: "Live" });
    const liveChannel = randomUUID();
    channelIds.push(liveChannel);
    await db.insert(calendarChannels).values({
      userId: liveUser,
      channelId: liveChannel,
      resourceId: "res-live",
      expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const result = await refreshExpiringWatches("https://example.com/api/calendar/webhook");
    expect(result.skipped).toBeGreaterThanOrEqual(1); // disconnected user → skipped

    // Expiring channel was cleared; far-future channel untouched.
    expect(await db.select().from(calendarChannels).where(eq(calendarChannels.channelId, expiringChannel))).toHaveLength(0);
    expect(await db.select().from(calendarChannels).where(eq(calendarChannels.channelId, liveChannel))).toHaveLength(1);
  });
});
