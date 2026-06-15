// Notification recipient/digest logic (server-only). Pure DB reads — no network
// — so the selection rules (who gets emailed, what's due today) are unit-testable
// without sending mail. The actual sending lives in src/lib/email.ts.

import { eq, and, inArray, gte, lte } from "drizzle-orm";
import {
  db,
  chores,
  choreAssignments,
  choreLogs,
  profiles,
  households,
} from "@/db";
import { listMembers } from "@/lib/household";
import { nextOccurrences, toISODate } from "@/lib/recurrence";

export interface EmailRecipient {
  email: string;
  name: string | null;
}

/**
 * Members who should be emailed when a new announcement is posted: everyone in
 * the household except the author, minus anyone who opted out of announcement
 * emails. Reuses listMembers (which now carries the notify flags).
 */
export async function recipientsForAnnouncement(
  householdId: string,
  authorId: string,
): Promise<EmailRecipient[]> {
  const members = await listMembers(householdId);
  return members
    .filter((m) => m.userId !== authorId && m.notifyAnnouncements && m.email)
    .map((m) => ({ email: m.email, name: m.name }));
}

/** A chore with past-due occurrences still not marked done, grouped per chore. */
export interface OverdueChore {
  title: string;
  /** Oldest still-undone occurrence within the lookback window (YYYY-MM-DD). */
  oldestDate: string;
  /** How many occurrences in the window remain undone. */
  count: number;
}

export interface DueChoreDigest {
  email: string;
  name: string | null;
  householdName: string;
  titles: string[];
  overdue: OverdueChore[];
}

/** How far back the digest looks for missed (overdue) occurrences. */
const OVERDUE_LOOKBACK_DAYS = 14;

/**
 * One digest per member with ≥1 chore due *today* and not yet done, OR with a
 * past-due occurrence in the last {@link OVERDUE_LOOKBACK_DAYS} days, across ALL
 * households (the cron has no per-user/cookie context). Mirrors the occurrence
 * math in buildChoreViews: count from scheduleFrom (fallback created_at) and ask
 * whether today is the next occurrence. Skips members who opted out of chore
 * reminders and occurrences already logged done (any-one-marks-it).
 */
export async function dueChoreDigests(): Promise<DueChoreDigest[]> {
  const today = toISODate(new Date());
  const lookbackStart = toISODate(new Date(Date.now() - OVERDUE_LOOKBACK_DAYS * 86400000));

  // Every active chore + each assignee's profile + household name, in one pass.
  const rows = await db
    .select({
      choreId: chores.id,
      title: chores.title,
      rrule: chores.rrule,
      scheduleFrom: chores.scheduleFrom,
      createdAt: chores.createdAt,
      householdName: households.name,
      userId: choreAssignments.userId,
      email: profiles.email,
      name: profiles.name,
      notifyChores: profiles.notifyChores,
    })
    .from(chores)
    .innerJoin(choreAssignments, eq(choreAssignments.choreId, chores.id))
    .innerJoin(profiles, eq(choreAssignments.userId, profiles.id))
    .innerJoin(households, eq(chores.householdId, households.id))
    .where(eq(chores.active, true));

  if (rows.length === 0) return [];

  // Which (chore, occurrence) pairs are already completed (any assignee) across
  // the overdue window through today. Keyed `${choreId}|${date}`.
  const choreIds = [...new Set(rows.map((r) => r.choreId))];
  const doneRows = await db
    .select({ choreId: choreLogs.choreId, occurrenceDate: choreLogs.occurrenceDate })
    .from(choreLogs)
    .where(
      and(
        inArray(choreLogs.choreId, choreIds),
        gte(choreLogs.occurrenceDate, lookbackStart),
        lte(choreLogs.occurrenceDate, today),
      ),
    );
  const doneSet = new Set(doneRows.map((r) => `${r.choreId}|${r.occurrenceDate}`));

  // Group due-today titles + overdue chores by recipient (keyed by user). A user
  // gets a digest if they have anything due today OR any missed past occurrence.
  const byUser = new Map<string, DueChoreDigest>();
  const entryFor = (r: (typeof rows)[number]): DueChoreDigest => {
    let entry = byUser.get(r.userId);
    if (!entry) {
      entry = { email: r.email!, name: r.name, householdName: r.householdName, titles: [], overdue: [] };
      byUser.set(r.userId, entry);
    }
    return entry;
  };

  for (const r of rows) {
    if (!r.notifyChores || !r.email) continue;
    const anchor = r.scheduleFrom ?? toISODate(new Date(r.createdAt));

    // Due today (and not yet done today).
    if (!doneSet.has(`${r.choreId}|${today}`)) {
      const next = nextOccurrences(r.rrule, anchor, { from: today, count: 1 })[0];
      if (next === today) entryFor(r).titles.push(r.title);
    }

    // Past-due occurrences in the lookback window still not done.
    const occ = nextOccurrences(r.rrule, anchor, { from: lookbackStart, count: 32 });
    const missed = occ.filter((d) => d < today && !doneSet.has(`${r.choreId}|${d}`));
    if (missed.length > 0) {
      entryFor(r).overdue.push({ title: r.title, oldestDate: missed[0], count: missed.length });
    }
  }

  return [...byUser.values()];
}
