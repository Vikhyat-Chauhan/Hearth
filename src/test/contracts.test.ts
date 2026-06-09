// Sprint 0 contract tests: the frozen validation schemas and the token crypto
// roundtrip. Feature streams build on these, so they must hold from day one.
import { describe, it, expect, beforeAll } from "vitest";
import { randomBytes } from "node:crypto";
import {
  parseBody,
  isValidRRule,
  householdCreateSchema,
  choreCreateSchema,
  choreLogCreateSchema,
} from "@/lib/validation";

describe("isValidRRule", () => {
  it("accepts well-formed RRULEs", () => {
    expect(isValidRRule("FREQ=WEEKLY;BYDAY=MO")).toBe(true);
    expect(isValidRRule("RRULE:FREQ=DAILY")).toBe(true);
    expect(isValidRRule("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE")).toBe(true);
    expect(isValidRRule("FREQ=MONTHLY;BYMONTHDAY=1")).toBe(true);
  });

  it("rejects malformed or free-text recurrence", () => {
    expect(isValidRRule("every monday")).toBe(false); // free text
    expect(isValidRRule("BYDAY=MO")).toBe(false); // no FREQ
    expect(isValidRRule("FREQ=NEVER")).toBe(false); // bad freq
    expect(isValidRRule("FREQ=WEEKLY;BOGUS=1")).toBe(false); // unknown key
    expect(isValidRRule("")).toBe(false);
  });
});

describe("householdCreateSchema", () => {
  it("accepts a valid name", () => {
    expect(parseBody(householdCreateSchema, { name: "Apt 4B" }).success).toBe(true);
  });
  it("rejects empty and over-long names", () => {
    expect(parseBody(householdCreateSchema, { name: "" }).success).toBe(false);
    expect(parseBody(householdCreateSchema, { name: "x".repeat(81) }).success).toBe(false);
  });
});

describe("choreCreateSchema", () => {
  const valid = {
    householdId: "11111111-1111-1111-1111-111111111111",
    title: "Take out trash",
    description: null,
    rrule: "FREQ=WEEKLY;BYDAY=MO",
    assigneeUserIds: ["22222222-2222-2222-2222-222222222222"],
  };

  it("accepts a valid chore with at least one assignee", () => {
    expect(parseBody(choreCreateSchema, valid).success).toBe(true);
  });
  it("rejects an empty title", () => {
    expect(parseBody(choreCreateSchema, { ...valid, title: "" }).success).toBe(false);
  });
  it("rejects an invalid RRULE", () => {
    expect(parseBody(choreCreateSchema, { ...valid, rrule: "weekly" }).success).toBe(false);
  });
  it("rejects zero assignees", () => {
    expect(parseBody(choreCreateSchema, { ...valid, assigneeUserIds: [] }).success).toBe(false);
  });
});

describe("choreLogCreateSchema", () => {
  const choreId = "33333333-3333-3333-3333-333333333333";
  it("accepts a YYYY-MM-DD occurrence date", () => {
    expect(parseBody(choreLogCreateSchema, { choreId, occurrenceDate: "2026-06-09" }).success).toBe(true);
  });
  it("rejects a non-date occurrence", () => {
    expect(parseBody(choreLogCreateSchema, { choreId, occurrenceDate: "tomorrow" }).success).toBe(false);
  });
});

describe("token crypto", () => {
  beforeAll(() => {
    process.env.TOKEN_ENC_KEY = randomBytes(32).toString("hex");
  });

  it("roundtrips a refresh token", async () => {
    const { encryptToken, decryptToken } = await import("@/lib/crypto");
    const secret = "1//refresh-token-value";
    const enc = encryptToken(secret);
    expect(enc).not.toContain(secret);
    expect(decryptToken(enc)).toBe(secret);
  });

  it("rejects a tampered ciphertext", async () => {
    const { encryptToken, decryptToken } = await import("@/lib/crypto");
    const enc = encryptToken("secret");
    const tampered = enc.slice(0, -4) + "AAAA";
    expect(() => decryptToken(tampered)).toThrow();
  });
});
