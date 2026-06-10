import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { encryptToken } from "@/lib/crypto";
import { getEventStatus } from "@/lib/calendar";

// A hung Google call must abort (and surface as a thrown error) rather than tie
// up the function. We simulate a request that never resolves on its own and only
// settles when its AbortSignal fires, then fast-forward past the timeout.
describe("Google API call timeout", () => {
  beforeEach(() => {
    process.env.TOKEN_ENC_KEY = "a".repeat(64);
    process.env.GOOGLE_CLIENT_ID = "test-client";
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("aborts a hung request after the timeout", async () => {
    const fetchMock = vi.fn((_url: string, init: RequestInit = {}) => {
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("The operation was aborted", "AbortError")),
        );
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    // First fetch in the chain is the token refresh; it never answers.
    const promise = getEventStatus(encryptToken("refresh"), "event-123");
    const assertion = expect(promise).rejects.toThrow();

    await vi.advanceTimersByTimeAsync(11_000); // > 10s ceiling
    await assertion;
    expect(fetchMock).toHaveBeenCalled();
  });
});
