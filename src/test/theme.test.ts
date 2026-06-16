import { describe, it, expect, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";

// Mock only auth; the handler runs against the real DB.
vi.mock("@/lib/supabase/server", () => ({ getUser: vi.fn() }));

const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];

function req(body: unknown) {
  return new Request("http://t/api/settings/theme", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!hasDb)("theme preference: PATCH /api/settings/theme", () => {
  afterAll(async () => {
    const { db, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  async function seedProfile() {
    const { db, profiles } = await import("@/db");
    const id = randomUUID();
    profileIds.push(id);
    await db.insert(profiles).values({ id, email: `t-${id}@t.dev`, name: "Themer" });
    return id;
  }

  async function themeOf(id: string) {
    const { db, profiles } = await import("@/db");
    const { eq } = await import("drizzle-orm");
    const [row] = await db
      .select({ theme: profiles.theme })
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    return row?.theme;
  }

  it("persists a valid theme, defaults to system, rejects junk and anon requests", async () => {
    const { getUser } = await import("@/lib/supabase/server");
    const { PATCH } = await import("@/app/api/settings/theme/route");
    const mocked = getUser as unknown as ReturnType<typeof vi.fn>;
    const id = await seedProfile();

    // New profiles default to "system".
    expect(await themeOf(id)).toBe("system");

    // Unauthenticated → 401, nothing changes.
    mocked.mockResolvedValue(null);
    expect((await PATCH(req({ theme: "dark" }))).status).toBe(401);
    expect(await themeOf(id)).toBe("system");

    // Invalid enum → 400, nothing changes.
    mocked.mockResolvedValue({ id });
    expect((await PATCH(req({ theme: "blue" }))).status).toBe(400);
    expect(await themeOf(id)).toBe("system");

    // Happy path → 200 and the choice persists.
    const res = await PATCH(req({ theme: "dark" }));
    expect(res.status).toBe(200);
    expect(await themeOf(id)).toBe("dark");
  });
});
