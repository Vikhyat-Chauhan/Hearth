import { describe, it, expect } from "vitest";
import { formatRelativeTime, formatOccurrenceDate } from "@/lib/utils";

describe("formatRelativeTime", () => {
  const now = new Date("2026-06-09T12:00:00");

  it("shows 'just now' for under a minute", () => {
    expect(formatRelativeTime(new Date("2026-06-09T11:59:30"), now)).toBe("just now");
  });

  it("shows minutes, hours, and days for recent times", () => {
    expect(formatRelativeTime(new Date("2026-06-09T11:45:00"), now)).toBe("15m ago");
    expect(formatRelativeTime(new Date("2026-06-09T09:00:00"), now)).toBe("3h ago");
    expect(formatRelativeTime(new Date("2026-06-07T12:00:00"), now)).toBe("2d ago");
  });

  it("falls back to a short date for anything older than a week", () => {
    // 30 days earlier → not an "Nd ago" string.
    const out = formatRelativeTime(new Date("2026-05-10T12:00:00"), now);
    expect(out).not.toMatch(/ago/);
    expect(out).toMatch(/May/);
  });
});

describe("formatOccurrenceDate", () => {
  const today = "2026-06-09";

  it("labels today and tomorrow", () => {
    expect(formatOccurrenceDate("2026-06-09", today)).toBe("Today");
    expect(formatOccurrenceDate("2026-06-10", today)).toBe("Tomorrow");
  });

  it("formats other dates as a weekday + date", () => {
    const out = formatOccurrenceDate("2026-06-15", today);
    expect(out).not.toBe("Today");
    expect(out).not.toBe("Tomorrow");
    expect(out).toMatch(/Jun/);
  });
});
