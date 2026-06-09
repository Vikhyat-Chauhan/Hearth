import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Money. Amounts are stored as integer cents; never use floats for math. ---

/** Format integer cents as a currency string, e.g. 1234 → "$12.34". */
export function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

/**
 * Parse a user-entered dollar string (e.g. "12.34") into integer cents.
 * Returns null if it isn't a valid non-negative money value. Rounds to the
 * nearest cent to avoid float drift.
 */
export function parseDollarsToCents(input: string): number | null {
  const trimmed = input.trim().replace(/^\$/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(parseFloat(trimmed) * 100);
}

// --- Dates. Used by the home dashboard to render timestamps compactly. ---

/**
 * Compact relative time for a past timestamp, e.g. "just now", "3h ago",
 * "2d ago", falling back to a short date for anything older than a week.
 * `now` is injectable for testing.
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

/**
 * Friendly label for a chore occurrence date ("YYYY-MM-DD"): "Today",
 * "Tomorrow", else a short weekday+date like "Mon, Jun 15". `todayIso` is
 * injectable for testing; defaults to the local current date.
 */
export function formatOccurrenceDate(isoDate: string, todayIso: string = localISODate()): string {
  if (isoDate === todayIso) return "Today";
  if (isoDate === addDays(todayIso, 1)) return "Tomorrow";
  // Parse as a local date (avoid UTC shift from `new Date("YYYY-MM-DD")`).
  const [y, m, d] = isoDate.split("-").map(Number);
  const local = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(local);
}

function localISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/**
 * Split an integer cents total into `n` shares as evenly as possible. The
 * remainder cents are spread one-each across the first shares, so the result
 * always sums exactly to `totalCents` (no rounding loss).
 */
export function splitEqually(totalCents: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(totalCents / n);
  let remainder = totalCents - base * n;
  return Array.from({ length: n }, () => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    return base + extra;
  });
}
