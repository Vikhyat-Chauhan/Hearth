// GET /api/cron/calendar-cleanup — remove expired watch-channel rows and reconcile
// stale CalendarLinks (chore events the user deleted on Google). Keeps the calendar
// bookkeeping tables from accumulating dead rows.
//
// Invoked by Vercel Cron, NOT a user session — guarded by `CRON_SECRET`. Best-effort:
// per-user reconcile failures are swallowed by reconcileUserCalendar and the whole
// run never 500s.

import { lt } from "drizzle-orm";
import { db, calendarChannels, calendarLinks } from "@/db";
import { reconcileUserCalendar } from "@/lib/calendar-twoway";
import { ok, unauthorized, withErrorHandling } from "@/lib/api";

export const GET = withErrorHandling(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return unauthorized();
  }

  // Drop watch-channel rows whose Google channel has already lapsed.
  const expired = await db
    .delete(calendarChannels)
    .where(lt(calendarChannels.expiration, new Date()))
    .returning({ id: calendarChannels.id });

  // Reconcile each user that still has chore CalendarLinks: drop links whose Google
  // event is gone. One pass per distinct owner.
  const owners = await db
    .selectDistinct({ userId: calendarLinks.userId })
    .from(calendarLinks);

  const settled = await Promise.allSettled(
    owners.map((o) => reconcileUserCalendar(o.userId)),
  );
  const linksRemoved = settled.reduce(
    (sum, r) => sum + (r.status === "fulfilled" ? r.value : 0),
    0,
  );

  return ok({ expiredChannelsDeleted: expired.length, linksRemoved });
});
