// Drizzle schema — the single source of truth for the database shape.
//
// FROZEN after Sprint 0: parallel feature streams read this but never edit it.
// Changes go through the user (Schema Change Protocol in docs/4-ORCHESTRATION.md),
// followed by `npm run db:generate`.
//
// Conventions:
// - User-owned / household-scoped entities carry the owning id and are query-scoped.
// - `profiles.id` mirrors the Supabase auth user id (auth.users.id). We don't FK to
//   the auth schema from Drizzle; the app upserts a profile row on first login.
// - No monetary fields in V1 (bills/splitting are later SCOPE phases).

import {
  pgTable,
  uuid,
  text,
  boolean,
  date,
  timestamp,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";

// A member's profile. id === Supabase auth user id.
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  email: text("email").notNull(),
  name: text("name"),
  // Encrypted Google refresh token; null until the user connects Google.
  googleRefreshTokenEnc: text("google_refresh_token_enc"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  adminUserId: uuid("admin_user_id").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: text("role", { enum: ["admin", "member"] }).notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueMember: unique("memberships_household_user_unique").on(t.householdId, t.userId),
  }),
);

export const chores = pgTable("chores", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  // RFC 5545 RRULE string, e.g. "FREQ=WEEKLY;BYDAY=MO".
  rrule: text("rrule").notNull(),
  createdBy: uuid("created_by").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const choreAssignments = pgTable(
  "chore_assignments",
  {
    choreId: uuid("chore_id")
      .notNull()
      .references(() => chores.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.choreId, t.userId] }),
  }),
);

// Honor-system completion. Any-one-marks-it: unique per (chore, occurrence date).
export const choreLogs = pgTable(
  "chore_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    choreId: uuid("chore_id")
      .notNull()
      .references(() => chores.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    occurrenceDate: date("occurrence_date").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueOccurrence: unique("chore_logs_chore_occurrence_unique").on(
      t.choreId,
      t.occurrenceDate,
    ),
  }),
);

// One row per (chore, assignee) holding the Google Calendar event id.
export const calendarLinks = pgTable(
  "calendar_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    choreId: uuid("chore_id")
      .notNull()
      .references(() => chores.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["google"] }).notNull().default("google"),
    externalEventId: text("external_event_id").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueLink: unique("calendar_links_user_chore_unique").on(t.userId, t.choreId),
  }),
);
