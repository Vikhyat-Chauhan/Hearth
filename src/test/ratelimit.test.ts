import { describe, it, expect } from "vitest";
import { rateLimit, clientIp } from "@/lib/ratelimit";

describe("rateLimit (fixed window)", () => {
  it("allows up to the limit then blocks within the window", () => {
    const key = `t-${Math.random()}`; // unique bucket per test run
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).success).toBe(true);
    }
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.success).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    const key = `t-${Math.random()}`;
    // 0ms window → the next call is already past resetAt and starts fresh.
    expect(rateLimit(key, 1, 0).success).toBe(true);
    expect(rateLimit(key, 1, 0).success).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the first hop from x-forwarded-for", () => {
    const req = new Request("https://x.test", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to 'unknown' with no proxy headers", () => {
    expect(clientIp(new Request("https://x.test"))).toBe("unknown");
  });
});
