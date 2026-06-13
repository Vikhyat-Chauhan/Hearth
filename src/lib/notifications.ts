// Notification recipient/digest logic (server-only). Pure DB reads — no network
// — so the selection rules (who gets emailed, what's due today) are unit-testable
// without sending mail. The actual sending lives in src/lib/email.ts.

import { eq, and, inArray } from "drizzle-orm";
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

export interface DueChoreDigest {
  email: string;
  name: string | null;
  householdName: string;
  titles: string[];
}

/**
 * One digest per member with ≥1 chore due *today* and not yet done, across ALL
 * households (the cron has no per-user/cookie context). Mirrors the occurrence
 * math in buildChoreViews: count from scheduleFrom (fallback created_at) and ask
 * whether today is the next occurrence. Skips members who opted out of chore
 * reminders and occurrences already logged done (any-one-marks-it).
 */
export async function dueChoreDigests(): Promise<DueChoreDigest[]> {
  const today = toISODate(new Date());

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

  // Which chores are already completed for today's occurrence (any assignee).
  const choreIds = [...new Set(rows.map((r) => r.choreId))];
  const doneRows = await db
    .select({ choreId: choreLogs.choreId })
    .from(choreLogs)
    .where(
      and(inArray(choreLogs.choreId, choreIds), eq(choreLogs.occurrenceDate, today)),
    );
  const doneToday = new Set(doneRows.map((r) => r.choreId));

  // Group due-today, not-done, opted-in titles by recipient (keyed by user).
  const byUser = new Map<string, DueChoreDigest>();
  for (const r of rows) {
    if (!r.notifyChores || !r.email) continue;
    if (doneToday.has(r.choreId)) continue;
    const anchor = r.scheduleFrom ?? toISODate(new Date(r.createdAt));
    const next = nextOccurrences(r.rrule, anchor, { from: today, count: 1 })[0];
    if (next !== today) continue;

    let entry = byUser.get(r.userId);
    if (!entry) {
      entry = { email: r.email, name: r.name, householdName: r.householdName, titles: [] };
      byUser.set(r.userId, entry);
    }
    entry.titles.push(r.title);
  }

  return [...byUser.values()];
}
