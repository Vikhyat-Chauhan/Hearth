// Chore → Google Calendar orchestration (server-only). Sits between the chore
// APIs and the raw Calendar boundary (src/lib/calendar.ts), and owns the
// CalendarLink bookkeeping. Best-effort: every per-assignee failure is caught
// and logged so chore persistence is never blocked.

import { eq, and } from "drizzle-orm";
import { db, profiles, calendarLinks } from "@/db";
import {
  syncChoreEvent,
  deleteChoreEvent,
  cancelChoreInstance,
  restoreChoreInstance,
} from "@/lib/calendar";
import { firstOccurrence, toISODate } from "@/lib/recurrence";
import type { Chore } from "@/lib/types";

async function refreshTokenFor(userId: string): Promise<string | null> {
  const [p] = await db
    .select({ tok: profiles.googleRefreshTokenEnc })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return p?.tok ?? null;
}

/**
 * Create/update the chore's calendar event for each given assignee. Upserts a
 * CalendarLink per (chore, user) when Google returns an event id; assignees who
 * haven't connected Google are simply skipped.
 */
export async function syncChoreToAssignees(
  chore: Pick<Chore, "id" | "title" | "description" | "rrule" | "createdAt" | "scheduleFrom">,
  assigneeIds: string[],
): Promise<void> {
  // Count the recurrence from the chore's effective schedule anchor (moves to the
  // edit date when the recurrence changes); fall back to the creation date.
  const anchor = chore.scheduleFrom ?? toISODate(new Date(chore.createdAt));
  const startDate = firstOccurrence(chore.rrule, anchor);

  for (const userId of assigneeIds) {
    try {
      const tokenEnc = await refreshTokenFor(userId);
      const [link] = await db
        .select()
        .from(calendarLinks)
        .where(and(eq(calendarLinks.choreId, chore.id), eq(calendarLinks.userId, userId)))
        .limit(1);

      const res = await syncChoreEvent(
        tokenEnc,
        { title: chore.title, description: chore.description, rrule: chore.rrule, startDate },
        link?.externalEventId,
      );
      if (res.status !== "synced") continue;

      if (link) {
        await db
          .update(calendarLinks)
          .set({ externalEventId: res.externalEventId, lastSyncedAt: new Date() })
          .where(eq(calendarLinks.id, link.id));
      } else {
        await db.insert(calendarLinks).values({
          userId,
          choreId: chore.id,
          provider: "google",
          externalEventId: res.externalEventId,
        });
      }
    } catch (err) {
      console.error(`[chore-sync] event sync failed for user ${userId}, chore ${chore.id}:`, err);
      // Swallow — chore persists; a later connect/reconcile can repair this.
    }
  }
}

/**
 * Delete the chore's calendar events for the given assignees (or all linked
 * assignees if none specified) and remove their CalendarLink rows.
 */
export async function unsyncChore(choreId: string, userIds?: string[]): Promise<void> {
  const links = await db.select().from(calendarLinks).where(eq(calendarLinks.choreId, choreId));
  const targets = userIds ? links.filter((l) => userIds.includes(l.userId)) : links;

  for (const link of targets) {
    try {
      const tokenEnc = await refreshTokenFor(link.userId);
      await deleteChoreEvent(tokenEnc, link.externalEventId);
    } catch (err) {
      console.error(`[chore-sync] event delete failed for user ${link.userId}, chore ${choreId}:`, err);
    } finally {
      await db.delete(calendarLinks).where(eq(calendarLinks.id, link.id));
    }
  }
}

/**
 * Cancel a single occurrence on every assignee's calendar — called when an
 * assignee marks that occurrence done (shared completion). The recurring event
 * and its CalendarLink stay; only that one instance is removed. Best-effort:
 * each per-assignee failure is caught and logged, never thrown.
 */
export async function cancelOccurrenceOnCalendars(
  choreId: string,
  occurrenceDate: string,
): Promise<void> {
  const links = await db.select().from(calendarLinks).where(eq(calendarLinks.choreId, choreId));
  for (const link of links) {
    try {
      const tokenEnc = await refreshTokenFor(link.userId);
      await cancelChoreInstance(tokenEnc, link.externalEventId, occurrenceDate);
    } catch (err) {
      console.error(
        `[chore-sync] instance cancel failed for user ${link.userId}, chore ${choreId} @ ${occurrenceDate}:`,
        err,
      );
    }
  }
}

/**
 * Restore a single occurrence on every assignee's calendar — the inverse of
 * `cancelOccurrenceOnCalendars`, called when an assignee marks that occurrence
 * undone. Best-effort: each per-assignee failure is caught and logged, never thrown.
 */
export async function restoreOccurrenceOnCalendars(
  choreId: string,
  occurrenceDate: string,
): Promise<void> {
  const links = await db.select().from(calendarLinks).where(eq(calendarLinks.choreId, choreId));
  for (const link of links) {
    try {
      const tokenEnc = await refreshTokenFor(link.userId);
      await restoreChoreInstance(tokenEnc, link.externalEventId, occurrenceDate);
    } catch (err) {
      console.error(
        `[chore-sync] instance restore failed for user ${link.userId}, chore ${choreId} @ ${occurrenceDate}:`,
        err,
      );
    }
  }
}
