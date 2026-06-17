// Chore read model (server-only): the chores assigned to a user, each with its
// upcoming occurrences and which of those are already marked done.

import { eq, and, inArray, gte, lt } from "drizzle-orm";
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
export async function getMyChores(
  userId: string,
  upcoming = 5,
  today: string = toISODate(new Date()),
): Promise<MyChore[]> {
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

  return buildChoreViews(rows, userId, upcoming, today);
}

/**
 * Every active chore in `userId`'s active household (not just the ones assigned
 * to them), each with its assignee roster and upcoming occurrences. Powers the
 * "All chores" view; `isSelf` is still computed for the viewer.
 */
export async function getHouseholdChores(
  userId: string,
  upcoming = 5,
  today: string = toISODate(new Date()),
): Promise<MyChore[]> {
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

  return buildChoreViews(rows, userId, upcoming, today);
}

export type ChoreHistoryStatus = "done" | "overdue";

/** A person attached to a history entry (the completer, or an overdue assignee). */
export interface ChoreHistoryPerson {
  name: string | null;
  email: string;
  /** Matches the viewer — drives "you" in the UI. */
  isSelf: boolean;
}

/** One past chore occurrence in the household's recent history (done or overdue). */
export interface ChoreHistoryEntry {
  choreId: string;
  title: string;
  /** Occurrence date (YYYY-MM-DD), not the moment it was marked done. */
  date: string;
  /** "done" if anyone logged it; "overdue" if the occurrence passed unmarked. */
  status: ChoreHistoryStatus;
  /** Completer fields are null for overdue occurrences. */
  completedById: string | null;
  completedByName: string | null;
  completedByEmail: string | null;
  /** completedById === viewer — drives "by you" (false when overdue). */
  isSelf: boolean;
  completedAt: Date | null;
  /** Everyone the chore is assigned to — who an overdue occurrence belongs to. */
  assignees: ChoreHistoryPerson[];
}

/**
 * Every past chore occurrence across `userId`'s household in the last `days`
 * days *by occurrence date* (strictly before today, so it never overlaps the
 * forward-looking views). Occurrences are expanded from each chore's recurrence
 * and labeled "done" (anyone logged it, any-one-marks-it) or "overdue". One row
 * per (chore, occurrence date), household-wide. Newest first.
 */
export async function getChoreHistory(
  userId: string,
  days = 14,
  today: string = toISODate(new Date()),
): Promise<ChoreHistoryEntry[]> {
  const ctx = await getHouseholdContext(userId);
  if (!ctx) return [];

  // Window the last `days` by occurrence date, anchored on the viewer's local
  // today so today's occurrences are never (yet) counted as past/overdue.
  const back = new Date(`${today}T00:00:00Z`);
  back.setUTCDate(back.getUTCDate() - days);
  const cutoff = toISODate(back);
  const DAY_MS = 86_400_000;
  const cutoffMs = Date.parse(`${cutoff}T00:00:00Z`);
  const todayMs = Date.parse(`${today}T00:00:00Z`);

  // All chores in the household (incl. recently deactivated ones — their recent
  // past occurrences still belong in history).
  const choreRows = await db
    .select({
      id: chores.id,
      title: chores.title,
      rrule: chores.rrule,
      scheduleFrom: chores.scheduleFrom,
      createdAt: chores.createdAt,
    })
    .from(chores)
    .where(eq(chores.householdId, ctx.household.id));

  if (choreRows.length === 0) return [];
  const choreIds = choreRows.map((c) => c.id);

  // Completions in the window, keyed by `${choreId}|${occurrenceDate}`.
  const logRows = await db
    .select({
      choreId: choreLogs.choreId,
      occurrenceDate: choreLogs.occurrenceDate,
      completedById: choreLogs.userId,
      completedByName: profiles.name,
      completedByEmail: profiles.email,
      completedAt: choreLogs.completedAt,
    })
    .from(choreLogs)
    .innerJoin(profiles, eq(choreLogs.userId, profiles.id))
    .where(
      and(
        inArray(choreLogs.choreId, choreIds),
        gte(choreLogs.occurrenceDate, cutoff),
        lt(choreLogs.occurrenceDate, today),
      ),
    );
  const logByOccurrence = new Map<string, (typeof logRows)[number]>();
  for (const l of logRows) logByOccurrence.set(`${l.choreId}|${l.occurrenceDate}`, l);

  // Assignee roster per chore (named) — who an overdue occurrence belongs to.
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
  const assigneesByChore = new Map<string, ChoreHistoryPerson[]>();
  for (const a of assignRows) {
    if (!assigneesByChore.has(a.choreId)) assigneesByChore.set(a.choreId, []);
    assigneesByChore
      .get(a.choreId)!
      .push({ name: a.name, email: a.email, isSelf: a.userId === userId });
  }

  const entries: ChoreHistoryEntry[] = [];
  for (const c of choreRows) {
    const anchor = c.scheduleFrom ?? toISODate(new Date(c.createdAt));
    // nextOccurrences walks forward from min(anchor, from); size the horizon to
    // reach today even when the anchor predates the window, and allow one more
    // than the window's worth of daily occurrences (today is filtered out below).
    const anchorMs = Date.parse(`${anchor}T00:00:00Z`);
    const horizonDays = Math.ceil((todayMs - Math.min(anchorMs, cutoffMs)) / DAY_MS) + 1;
    const dates = nextOccurrences(c.rrule, anchor, {
      from: cutoff,
      count: days + 1,
      horizonDays,
    });
    for (const date of dates) {
      if (date >= today) continue; // past occurrences only
      const log = logByOccurrence.get(`${c.id}|${date}`);
      entries.push({
        choreId: c.id,
        title: c.title,
        date,
        status: log ? "done" : "overdue",
        completedById: log?.completedById ?? null,
        completedByName: log?.completedByName ?? null,
        completedByEmail: log?.completedByEmail ?? null,
        isSelf: log ? log.completedById === userId : false,
        completedAt: log?.completedAt ?? null,
        assignees: assigneesByChore.get(c.id) ?? [],
      });
    }
  }

  // Newest occurrence first; tie-break by title for a stable order.
  entries.sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : a.date < b.date ? 1 : -1));
  return entries;
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
  today: string,
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
