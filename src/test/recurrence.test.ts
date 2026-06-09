import { describe, it, expect } from "vitest";
import { nextOccurrences, firstOccurrence, parseRRule } from "@/lib/recurrence";

describe("parseRRule", () => {
  it("extracts freq, interval, byday", () => {
    const r = parseRRule("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE");
    expect(r.freq).toBe("WEEKLY");
    expect(r.interval).toBe(2);
    expect(r.byday).toEqual([1, 3]); // MO, WE
  });
});

describe("nextOccurrences", () => {
  it("weekly on Monday returns Mondays on/after `from`", () => {
    // 2026-06-01 is a Monday.
    const out = nextOccurrences("FREQ=WEEKLY;BYDAY=MO", "2026-06-01", { from: "2026-06-01", count: 3 });
    expect(out).toEqual(["2026-06-01", "2026-06-08", "2026-06-15"]);
  });

  it("daily with interval 2 steps every other day from the anchor", () => {
    const out = nextOccurrences("FREQ=DAILY;INTERVAL=2", "2026-06-01", { from: "2026-06-01", count: 3 });
    expect(out).toEqual(["2026-06-01", "2026-06-03", "2026-06-05"]);
  });

  it("monthly on the 15th", () => {
    const out = nextOccurrences("FREQ=MONTHLY;BYMONTHDAY=15", "2026-06-01", { from: "2026-06-01", count: 2 });
    expect(out).toEqual(["2026-06-15", "2026-07-15"]);
  });

  it("respects COUNT", () => {
    const out = nextOccurrences("FREQ=DAILY;COUNT=2", "2026-06-01", { from: "2026-06-01", count: 10 });
    expect(out).toEqual(["2026-06-01", "2026-06-02"]);
  });

  it("respects UNTIL", () => {
    const out = nextOccurrences("FREQ=DAILY;UNTIL=20260603", "2026-06-01", { from: "2026-06-01", count: 10 });
    expect(out).toEqual(["2026-06-01", "2026-06-02", "2026-06-03"]);
  });

  it("only returns dates on/after `from`", () => {
    const out = nextOccurrences("FREQ=WEEKLY;BYDAY=MO", "2026-06-01", { from: "2026-06-10", count: 2 });
    expect(out).toEqual(["2026-06-15", "2026-06-22"]);
  });
});

describe("firstOccurrence", () => {
  it("returns the first matching date at/after the anchor", () => {
    // Anchor 2026-06-03 (Wed); first Monday on/after is 2026-06-08.
    expect(firstOccurrence("FREQ=WEEKLY;BYDAY=MO", "2026-06-03")).toBe("2026-06-08");
  });
});
