// Chore read model (server-only): the chores assigned to a user, each with its
// upcoming occurrences and which of those are already marked done.

import { eq, and, inArray, gte, lt, desc } from "drizzle-orm";
import { db, chores, choreAssignments, choreLogs, profiles } from "@/db";
import { getHouseholdContext } from "@/lib/household";
import { nextOccurrences, toISODate } from "@/lib/recurrence";

export interface ChoreOccurrence {
  date: string; // YYYY-MM-DD
  done: boolean;
}

/** One assignee of a chore, as the dashboard names them. */
export interface ChoreAssignee {
  userId: string;
  name: string | null;
  email: string;
  isSelf: boolean;
}

export interface MyChore {
  id: string;
  title: string;
  description: string | null;
  rrule: string;
  /** Everyone the chore is assigned to (incl. the viewer) — drives "Shared with …". */
  assignees: ChoreAssignee[];
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
      scheduleFrom: chores.scheduleFrom,
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

  return buildChoreViews(rows, userId, upcoming);
}

/**
 * Every active chore in `userId`'s active household (not just the ones assigned
 * to them), each with its assignee roster and upcoming occurrences. Powers the
 * "All chores" view; `isSelf` is still computed for the viewer.
 */
export async function getHouseholdChores(userId: string, upcoming = 5): Promise<MyChore[]> {
  const ctx = await getHouseholdContext(userId);
  if (!ctx) return [];

  const rows = await db
    .select({
      id: chores.id,
      title: chores.title,
      description: chores.description,
      rrule: chores.rrule,
      scheduleFrom: chores.scheduleFrom,
      createdAt: chores.createdAt,
    })
    .from(chores)
    .where(and(eq(chores.householdId, ctx.household.id), eq(chores.active, true)))
    .orderBy(chores.createdAt);

  return buildChoreViews(rows, userId, upcoming);
}

/** One completed occurrence in the household's recent history. */
export interface ChoreHistoryEntry {
  choreId: string;
  title: string;
  /** Occurrence date (YYYY-MM-DD), not the moment it was marked done. */
  date: string;
  completedById: string;
  completedByName: string | null;
  completedByEmail: string;
  /** completedById === viewer — drives "by you". */
  isSelf: boolean;
  completedAt: Date;
}

/**
 * Completed chore occurrences across `userId`'s active household, limited to the
 * last `days` days *by occurrence date* (strictly before today, so it never
 * overlaps the forward-looking views). Nothing is deleted — older logs simply
 * fall outside the window. Newest first.
 */
export async function getChoreHistory(
  userId: string,
  days = 14,
): Promise<ChoreHistoryEntry[]> {
  const ctx = await getHouseholdContext(userId);
  if (!ctx) return [];

  const today = toISODate(new Date());
  const back = new Date();
  back.setUTCDate(back.getUTCDate() - days);
  const cutoff = toISODate(back);

  const rows = await db
    .select({
      choreId: choreLogs.choreId,
      title: chores.title,
      occurrenceDate: choreLogs.occurrenceDate,
      completedById: choreLogs.userId,
      completedByName: profiles.name,
      completedByEmail: profiles.email,
      completedAt: choreLogs.completedAt,
    })
    .from(choreLogs)
    .innerJoin(
      chores,
      and(eq(choreLogs.choreId, chores.id), eq(chores.householdId, ctx.household.id)),
    )
    .innerJoin(profiles, eq(choreLogs.userId, profiles.id))
    .where(and(gte(choreLogs.occurrenceDate, cutoff), lt(choreLogs.occurrenceDate, today)))
    .orderBy(desc(choreLogs.occurrenceDate), desc(choreLogs.completedAt));

  return rows.map((r) => ({
    choreId: r.choreId,
    title: r.title,
    date: r.occurrenceDate,
    completedById: r.completedById,
    completedByName: r.completedByName,
    completedByEmail: r.completedByEmail,
    isSelf: r.completedById === userId,
    completedAt: r.completedAt,
  }));
}

/** Row shape selected for the chore read model. */
type ChoreRow = {
  id: string;
  title: string;
  description: string | null;
  rrule: string;
  scheduleFrom: string | null;
  createdAt: Date;
};

/**
 * Turn a set of chore rows into the dashboard read model: attach the named
 * assignee roster (with `isSelf` for `viewerId`), the completed-occurrence set
 * (any-one-marks-it), and up to `upcoming` future occurrences each.
 */
async function buildChoreViews(
  rows: ChoreRow[],
  viewerId: string,
  upcoming: number,
): Promise<MyChore[]> {
  if (rows.length === 0) return [];

  const choreIds = rows.map((r) => r.id);

  // Completed occurrences across all of these chores (any assignee counts).
  const logs = await db
    .select({ choreId: choreLogs.choreId, occurrenceDate: choreLogs.occurrenceDate })
    .from(choreLogs)
    .where(inArray(choreLogs.choreId, choreIds));
  const doneByChore = new Map<string, Set<string>>();
  for (const l of logs) {
    if (!doneByChore.has(l.choreId)) doneByChore.set(l.choreId, new Set());
    doneByChore.get(l.choreId)!.add(l.occurrenceDate);
  }

  // Full assignee roster per chore (named, so the UI can show "Shared with …").
  const assignRows = await db
    .select({
      choreId: choreAssignments.choreId,
      userId: choreAssignments.userId,
      name: profiles.name,
      email: profiles.email,
    })
    .from(choreAssignments)
    .innerJoin(profiles, eq(choreAssignments.userId, profiles.id))
    .where(inArray(choreAssignments.choreId, choreIds));
  const assigneesByChore = new Map<string, ChoreAssignee[]>();
  for (const a of assignRows) {
    if (!assigneesByChore.has(a.choreId)) assigneesByChore.set(a.choreId, []);
    assigneesByChore.get(a.choreId)!.push({
      userId: a.userId,
      name: a.name,
      email: a.email,
      isSelf: a.userId === viewerId,
    });
  }

  const today = toISODate(new Date());
  return rows.map((r) => {
    const done = doneByChore.get(r.id) ?? new Set<string>();
    // Count the recurrence from the chore's effective anchor (fall back to created date).
    const anchor = r.scheduleFrom ?? toISODate(new Date(r.createdAt));
    const dates = nextOccurrences(r.rrule, anchor, { from: today, count: upcoming });
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      rrule: r.rrule,
      assignees: assigneesByChore.get(r.id) ?? [],
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
