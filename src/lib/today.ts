// The viewer's local "today", server-side. Chore dates are bare YYYY-MM-DD
// calendar dates, but the server runs in UTC — so "today" must come from the
// viewer's timezone, not the server's clock, or today's chores wrongly flip to
// overdue (west of UTC, evening) or lock as upcoming (east of UTC, morning).
//
// The `hearth-tz` cookie mirrors the browser's IANA timezone (set by an inline
// head script in layout.tsx), the same pattern as the `hearth-theme` cookie.
import { cookies } from "next/headers";
import { todayInTimeZone } from "@/lib/recurrence";

export const TZ_COOKIE = "hearth-tz";
// Persist for a year; the cookie is a non-sensitive mirror of the browser zone.
export const TZ_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The viewer's local "today" (YYYY-MM-DD), from the hearth-tz cookie; UTC fallback. */
export async function viewerToday(): Promise<string> {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  return todayInTimeZone(tz);
}
