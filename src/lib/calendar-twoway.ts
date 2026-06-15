// Two-way calendar sync orchestration (server-only). Sits between the watch/
// webhook routes and the raw Calendar boundary (src/lib/calendar.ts). Owns the
// calendar_channels bookkeeping and the calendar → app reconciliation.
//
// Best-effort: every Google failure is caught so a webhook never 500s and a
// failed watch never blocks anything.

import { randomUUID, randomBytes } from "node:crypto";
import { eq, lt, isNotNull, and } from "drizzle-orm";
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
  // Per-channel secret. Google echoes it back as X-Goog-Channel-Token on every
  // notification; the webhook verifies it so a forged POST can't drive reconcile.
  const channelToken = randomBytes(24).toString("base64url");
  const res = await watchCalendar(tokenEnc, { channelId, address: webhookAddress, token: channelToken });
  if (res.status !== "watching") return { status: "skipped" };

  await db.insert(calendarChannels).values({
    userId,
    channelId,
    token: channelToken,
    resourceId: res.resourceId,
    expiration: res.expiration ? new Date(res.expiration) : null,
  });

  return { status: "watching", channelId };
}

export type EnsureWatchResult = RegisterWatchResult | { status: "already" };

/**
 * Make sure two-way sync is ON for a connected user — this is the default, armed
 * automatically when Google is connected (see the auth callback). No-ops when a
 * still-valid watch channel already exists; otherwise clears any expired channels
 * and registers a fresh one (so a periodic re-login renews the watch). Self-skips
 * when the user hasn't connected Google. Best-effort: callers swallow failures.
 */
export async function ensureWatch(
  userId: string,
  webhookAddress: string,
): Promise<EnsureWatchResult> {
  const channels = await db
    .select({ id: calendarChannels.id, expiration: calendarChannels.expiration })
    .from(calendarChannels)
    .where(eq(calendarChannels.userId, userId));

  const now = new Date();
  const hasActive = channels.some((c) => !c.expiration || c.expiration > now);
  if (hasActive) return { status: "already" };

  // No live channel — drop any expired rows before re-arming a fresh one.
  if (channels.length) {
    await db.delete(calendarChannels).where(eq(calendarChannels.userId, userId));
  }
  return registerWatch(userId, webhookAddress);
}

export interface RefreshWatchesResult {
  refreshed: number;
  skipped: number;
  failed: number;
}

/**
 * Re-arm watch channels nearing expiration so two-way sync doesn't silently lapse.
 * Google channels live ~7 days; this finds channels whose `expiration` falls within
 * the next `withinHours`, drops them, and registers a fresh channel for each owner.
 * Invoked by the /api/calendar/refresh-channels cron (daily). The 72h default leaves
 * margin so a channel is renewed even if a daily run fires late or is skipped — Hobby
 * crons trigger within their scheduled hour (±59 min). Best-effort: a failure for one
 * user is counted and skipped, never thrown. `registerWatch` self-skips a user who
 * has since disconnected Google.
 */
export async function refreshExpiringWatches(
  webhookAddress: string,
  withinHours = 72,
): Promise<RefreshWatchesResult> {
  const soon = new Date(Date.now() + withinHours * 60 * 60 * 1000);
  const expiring = await db
    .select({ userId: calendarChannels.userId })
    .from(calendarChannels)
    .where(and(isNotNull(calendarChannels.expiration), lt(calendarChannels.expiration, soon)));

  // One refresh per owner even if they have several expiring channels.
  const userIds = [...new Set(expiring.map((r) => r.userId))];

  const out: RefreshWatchesResult = { refreshed: 0, skipped: 0, failed: 0 };
  await Promise.allSettled(
    userIds.map(async (userId) => {
      try {
        // Clear the user's channels (the expiring ones plus any stale rows) then re-arm.
        await db.delete(calendarChannels).where(eq(calendarChannels.userId, userId));
        const res = await registerWatch(userId, webhookAddress);
        if (res.status === "watching") out.refreshed += 1;
        else out.skipped += 1;
      } catch (err) {
        console.error(`[calendar-twoway] refresh failed for user ${userId}:`, err);
        out.failed += 1;
      }
    }),
  );

  return out;
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
 * Resolve the user owning a webhook notification, verifying its channel token.
 * Returns the userId only when the channel exists AND the token Google echoed back
 * matches the stored secret. Legacy channels with no stored token are accepted
 * (channel-id only) — they pick up a token on their next watch refresh. Returns
 * null on an unknown channel or a token mismatch (a forged or stale notification).
 */
export async function verifiedChannelOwner(
  channelId: string,
  headerToken: string | null,
): Promise<string | null> {
  const [row] = await db
    .select({ userId: calendarChannels.userId, token: calendarChannels.token })
    .from(calendarChannels)
    .where(eq(calendarChannels.channelId, channelId))
    .limit(1);
  if (!row) return null;
  if (row.token && row.token !== headerToken) return null;
  return row.userId;
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
