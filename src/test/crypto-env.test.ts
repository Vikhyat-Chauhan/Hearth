import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken, assertTokenEncKey } from "@/lib/crypto";

const VALID_KEY = "a".repeat(64); // 32 bytes as hex

describe("token encryption key validation", () => {
  it("passes for a valid 32-byte hex key", () => {
    process.env.TOKEN_ENC_KEY = VALID_KEY;
    expect(() => assertTokenEncKey()).not.toThrow();
  });

  it("throws when the key is missing", () => {
    const prev = process.env.TOKEN_ENC_KEY;
    delete process.env.TOKEN_ENC_KEY;
    expect(() => assertTokenEncKey()).toThrow(/not set/);
    process.env.TOKEN_ENC_KEY = prev;
  });

  it("throws when the key decodes to the wrong length", () => {
    const prev = process.env.TOKEN_ENC_KEY;
    process.env.TOKEN_ENC_KEY = "deadbeef"; // 4 bytes
    expect(() => assertTokenEncKey()).toThrow(/32 bytes/);
    process.env.TOKEN_ENC_KEY = prev;
  });
});

describe("encrypt/decrypt round-trip", () => {
  it("recovers the plaintext and rejects a tampered payload", () => {
    process.env.TOKEN_ENC_KEY = VALID_KEY;
    const enc = encryptToken("refresh-token-123");
    expect(enc).not.toContain("refresh-token-123");
    expect(decryptToken(enc)).toBe("refresh-token-123");
    expect(() => decryptToken("garbage")).toThrow();
  });
});
