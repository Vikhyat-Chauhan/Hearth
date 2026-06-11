import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { encryptToken } from "@/lib/crypto";
import { cancelChoreInstance } from "@/lib/calendar";

// cancelChoreInstance drops a single occurrence of a recurring chore event. Our
// chore events are all-day, so the instance id is `${eventId}_${YYYYMMDD}`.
describe("cancelChoreInstance", () => {
  beforeEach(() => {
    process.env.TOKEN_ENC_KEY = "a".repeat(64);
    process.env.GOOGLE_CLIENT_ID = "test-client";
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  });
  afterEach(() => vi.restoreAllMocks());

  function mockFetch(deleteStatus: number) {
    const calls: { url: string; method?: string }[] = [];
    const fetchMock = vi.fn((url: string, init: RequestInit = {}) => {
      calls.push({ url, method: init.method });
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "at" }), { status: 200 }));
      }
      return Promise.resolve(new Response(null, { status: deleteStatus }));
    });
    vi.stubGlobal("fetch", fetchMock);
    return calls;
  }

  it("DELETEs the all-day instance id for the occurrence date", async () => {
    const calls = mockFetch(204);
    await cancelChoreInstance(encryptToken("refresh"), "evt123", "2026-06-15");
    const del = calls.find((c) => c.method === "DELETE");
    expect(del?.url).toContain("/evt123_20260615");
  });

  it("treats 410 (already cancelled) as success", async () => {
    mockFetch(410);
    await expect(
      cancelChoreInstance(encryptToken("refresh"), "evt123", "2026-06-15"),
    ).resolves.toBeUndefined();
  });

  it("throws on a real API error (so the caller can retry)", async () => {
    mockFetch(500);
    await expect(
      cancelChoreInstance(encryptToken("refresh"), "evt123", "2026-06-15"),
    ).rejects.toThrow();
  });

  it("skips entirely when the member isn't connected (null token)", async () => {
    const calls = mockFetch(204);
    await cancelChoreInstance(null, "evt123", "2026-06-15");
    expect(calls).toHaveLength(0);
  });
});
