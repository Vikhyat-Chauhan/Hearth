// Shared types / data shapes for Hearth.
//
// FROZEN after Sprint 0: parallel feature streams read these but never edit them.
// Changes go through the user (Schema Change Protocol in docs/4-ORCHESTRATION.md).
//
// These mirror the Drizzle row types in src/db/schema.ts. Import entity row types
// from there (`typeof households.$inferSelect`) for DB code; use these hand-written
// shapes for API/UI contracts and enums shared across streams.

export type Role = "admin" | "member";

export type CalendarProvider = "google";

/** A household member's profile. id === the Supabase auth user id. */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  /** Encrypted Google refresh token; null until the user connects Google. Never sent to the client. */
  googleRefreshTokenEnc: string | null;
  createdAt: Date;
}

export interface Household {
  id: string;
  name: string;
  adminUserId: string;
  inviteCode: string;
  createdAt: Date;
}

export interface Membership {
  id: string;
  householdId: string;
  userId: string;
  role: Role;
  joinedAt: Date;
}

export interface Chore {
  id: string;
  householdId: string;
  title: string;
  description: string | null;
  /** RFC 5545 RRULE string, e.g. "FREQ=WEEKLY;BYDAY=MO". Drives both the in-app schedule and the calendar event. */
  rrule: string;
  createdBy: string;
  active: boolean;
  createdAt: Date;
}

export interface ChoreAssignment {
  choreId: string;
  userId: string;
}

/** Honor-system completion. Any-one-marks-it: unique per (choreId, occurrenceDate). */
export interface ChoreLog {
  id: string;
  choreId: string;
  userId: string;
  /** The occurrence's calendar date (YYYY-MM-DD). */
  occurrenceDate: string;
  completedAt: Date;
}

/** Maps a chore's calendar event for one assignee. Unique per (userId, choreId). */
export interface CalendarLink {
  id: string;
  userId: string;
  choreId: string;
  provider: CalendarProvider;
  externalEventId: string;
  lastSyncedAt: Date;
}

/** A chore as the /chores view needs it: the chore plus its assignees and the dates already marked done. */
export interface ChoreWithStatus extends Chore {
  assigneeUserIds: string[];
  completedOccurrences: string[];
}
