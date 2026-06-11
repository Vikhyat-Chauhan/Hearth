import { describe, it, expect } from "vitest";
import { nextOccurrences, firstOccurrence, parseRRule, buildRRule, nextAnchorOnEdit } from "@/lib/recurrence";

describe("parseRRule", () => {
  it("extracts freq, interval, byday", () => {
    const r = parseRRule("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE");
    expect(r.freq).toBe("WEEKLY");
    expect(r.interval).toBe(2);
    expect(r.byday).toEqual([
      { ordinal: null, day: 1 }, // MO
      { ordinal: null, day: 3 }, // WE
    ]);
  });

  it("parses ordinal BYDAY (monthly-by-weekday)", () => {
    expect(parseRRule("FREQ=MONTHLY;BYDAY=2MO").byday).toEqual([{ ordinal: 2, day: 1 }]);
    expect(parseRRule("FREQ=MONTHLY;BYDAY=-1FR").byday).toEqual([{ ordinal: -1, day: 5 }]);
  });
});

describe("buildRRule", () => {
  it("omits INTERVAL when 1 and formats UNTIL", () => {
    expect(buildRRule({ freq: "WEEKLY", interval: 1, byday: ["MO", "WE"], until: "2026-08-30" })).toBe(
      "FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20260830",
    );
  });

  it("includes INTERVAL when > 1 and supports ordinal byday", () => {
    expect(buildRRule({ freq: "MONTHLY", interval: 2, byday: ["2MO"], until: "2026-12-31" })).toBe(
      "FREQ=MONTHLY;INTERVAL=2;BYDAY=2MO;UNTIL=20261231",
    );
  });

  it("round-trips through parseRRule", () => {
    const r = parseRRule(buildRRule({ freq: "DAILY", interval: 3, until: "2026-07-01" }));
    expect(r.freq).toBe("DAILY");
    expect(r.interval).toBe(3);
    expect(r.until).toBe("2026-07-01");
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

  it("monthly on the 2nd Monday (ordinal BYDAY)", () => {
    // June 2026: Mondays 1,8,15,22,29 -> 2nd = the 8th. July 2026: 2nd Monday = the 13th.
    const out = nextOccurrences("FREQ=MONTHLY;BYDAY=2MO", "2026-06-01", { from: "2026-06-01", count: 2 });
    expect(out).toEqual(["2026-06-08", "2026-07-13"]);
  });

  it("monthly on the last Friday (-1 ordinal)", () => {
    // June 2026: last Friday = the 26th. July 2026: last Friday = the 31st.
    const out = nextOccurrences("FREQ=MONTHLY;BYDAY=-1FR", "2026-06-01", { from: "2026-06-01", count: 2 });
    expect(out).toEqual(["2026-06-26", "2026-07-31"]);
  });

  it("monthly with ordinal-less BYDAY matches every such weekday", () => {
    // "Every Monday each month" — every Monday on/after the anchor.
    const out = nextOccurrences("FREQ=MONTHLY;BYDAY=MO", "2026-06-01", { from: "2026-06-01", count: 3 });
    expect(out).toEqual(["2026-06-01", "2026-06-08", "2026-06-15"]);
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

describe("nextAnchorOnEdit", () => {
  it("re-anchors to today when the recurrence changes", () => {
    expect(nextAnchorOnEdit("FREQ=WEEKLY;BYDAY=MO", "2026-01-01", "FREQ=DAILY", "2026-06-11")).toBe(
      "2026-06-11",
    );
  });

  it("keeps the previous anchor when the recurrence is unchanged", () => {
    expect(
      nextAnchorOnEdit("FREQ=WEEKLY;BYDAY=MO", "2026-01-01", "FREQ=WEEKLY;BYDAY=MO", "2026-06-11"),
    ).toBe("2026-01-01");
  });
});
