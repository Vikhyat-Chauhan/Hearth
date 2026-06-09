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
