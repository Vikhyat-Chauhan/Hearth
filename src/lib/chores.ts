// Chore read model (server-only): the chores assigned to a user, each with its
// upcoming occurrences and which of those are already marked done.

import { eq, and, inArray } from "drizzle-orm";
import { db, chores, choreAssignments, choreLogs } from "@/db";
import { getHouseholdContext } from "@/lib/household";
import { nextOccurrences, toISODate } from "@/lib/recurrence";

export interface ChoreOccurrence {
  date: string; // YYYY-MM-DD
  done: boolean;
}

export interface MyChore {
  id: string;
  title: string;
  description: string | null;
  rrule: string;
  occurrences: ChoreOccurrence[];
}

/**
 * Chores assigned to `userId` in their active household, each with up to
 * `upcoming` future occurrences and their done state (any-one-marks-it).
 */
export async function getMyChores(userId: string, upcoming = 5): Promise<MyChore[]> {
  const ctx = await getHouseholdContext(userId);
  if (!ctx) return [];

  const rows = await db
    .select({
      id: chores.id,
      title: chores.title,
      description: chores.description,
      rrule: chores.rrule,
      createdAt: chores.createdAt,
    })
    .from(chores)
    .innerJoin(choreAssignments, eq(choreAssignments.choreId, chores.id))
    .where(
      and(
        eq(choreAssignments.userId, userId),
        eq(chores.householdId, ctx.household.id),
        eq(chores.active, true),
      ),
    );

  if (rows.length === 0) return [];

  // Completed occurrences across all of these chores (any assignee counts).
  const choreIds = rows.map((r) => r.id);
  const logs = await db
    .select({ choreId: choreLogs.choreId, occurrenceDate: choreLogs.occurrenceDate })
    .from(choreLogs)
    .where(inArray(choreLogs.choreId, choreIds));
  const doneByChore = new Map<string, Set<string>>();
  for (const l of logs) {
    if (!doneByChore.has(l.choreId)) doneByChore.set(l.choreId, new Set());
    doneByChore.get(l.choreId)!.add(l.occurrenceDate);
  }

  const today = toISODate(new Date());
  return rows.map((r) => {
    const done = doneByChore.get(r.id) ?? new Set<string>();
    const dates = nextOccurrences(r.rrule, toISODate(new Date(r.createdAt)), {
      from: today,
      count: upcoming,
    });
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      rrule: r.rrule,
      occurrences: dates.map((date) => ({ date, done: done.has(date) })),
    };
  });
}

/** True if the user is an assignee of the chore (authorizes marking it done). */
export async function isAssignee(userId: string, choreId: string): Promise<boolean> {
  const rows = await db
    .select({ choreId: choreAssignments.choreId })
    .from(choreAssignments)
    .where(and(eq(choreAssignments.userId, userId), eq(choreAssignments.choreId, choreId)))
    .limit(1);
  return rows.length > 0;
}
