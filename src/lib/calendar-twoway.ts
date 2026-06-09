// Two-way calendar sync orchestration (server-only). Sits between the watch/
// webhook routes and the raw Calendar boundary (src/lib/calendar.ts). Owns the
// calendar_channels bookkeeping and the calendar → app reconciliation.
//
// Best-effort: every Google failure is caught so a webhook never 500s and a
// failed watch never blocks anything.

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, profiles, calendarLinks, calendarChannels } from "@/db";
import { watchCalendar, getEventStatus } from "@/lib/calendar";

async function refreshTokenFor(userId: string): Promise<string | null> {
  const [p] = await db
    .select({ tok: profiles.googleRefreshTokenEnc })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return p?.tok ?? null;
}

export type RegisterWatchResult =
  | { status: "watching"; channelId: string }
  | { status: "skipped" };

/**
 * Register a Google watch channel for a user so calendar changes notify our
 * webhook. Stores the (channelId → user) mapping in calendar_channels. Returns
 * "skipped" if the user hasn't connected Google.
 */
export async function registerWatch(
  userId: string,
  webhookAddress: string,
): Promise<RegisterWatchResult> {
  const tokenEnc = await refreshTokenFor(userId);
  if (!tokenEnc) return { status: "skipped" };

  const channelId = randomUUID();
  const res = await watchCalendar(tokenEnc, { channelId, address: webhookAddress, token: userId });
  if (res.status !== "watching") return { status: "skipped" };

  await db.insert(calendarChannels).values({
    userId,
    channelId,
    resourceId: res.resourceId,
    expiration: res.expiration ? new Date(res.expiration) : null,
  });

  return { status: "watching", channelId };
}

/** Which user owns a given watch channel (from a webhook notification). */
export async function channelOwner(channelId: string): Promise<string | null> {
  const [row] = await db
    .select({ userId: calendarChannels.userId })
    .from(calendarChannels)
    .where(eq(calendarChannels.channelId, channelId))
    .limit(1);
  return row?.userId ?? null;
}

/**
 * Reconcile a user's calendar back into the app: for each of their chore
 * CalendarLinks, check the event's current state on Google. If the user deleted
 * or cancelled the event, drop the stale CalendarLink. Returns how many links
 * were removed. Best-effort — individual check failures are swallowed.
 */
export async function reconcileUserCalendar(userId: string): Promise<number> {
  const tokenEnc = await refreshTokenFor(userId);
  if (!tokenEnc) return 0;

  const links = await db
    .select()
    .from(calendarLinks)
    .where(eq(calendarLinks.userId, userId));

  let removed = 0;
  for (const link of links) {
    try {
      const state = await getEventStatus(tokenEnc, link.externalEventId);
      if (state === "missing") {
        await db.delete(calendarLinks).where(eq(calendarLinks.id, link.id));
        removed += 1;
      }
    } catch (err) {
      console.error(`[calendar-twoway] reconcile failed for link ${link.id}:`, err);
    }
  }
  return removed;
}
