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
  integer,
  primaryKey,
  unique,
  index,
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

export const chores = pgTable(
  "chores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    // RFC 5545 RRULE string, e.g. "FREQ=WEEKLY;BYDAY=MO".
    rrule: text("rrule").notNull(),
    // Effective schedule anchor (YYYY-MM-DD): the date the recurrence is counted
    // from. Set to the creation date on create, and moved to the edit date when
    // the recurrence changes, so edits apply from then on and never touch the
    // past. Null on legacy rows → callers fall back to created_at.
    scheduleFrom: date("schedule_from"),
    createdBy: uuid("created_by").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    householdIdx: index("chores_household_idx").on(t.householdId),
  }),
);

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
    userIdx: index("chore_assignments_user_idx").on(t.userId),
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
    userIdx: index("calendar_links_user_idx").on(t.userId),
    choreIdx: index("calendar_links_chore_idx").on(t.choreId),
  }),
);

// ---------------------------------------------------------------------------
// P2 / later-SCOPE-phase features. Additive only — these tables extend the
// schema without touching the V1 tables above. Added under the Schema Change
// Protocol (user-authorized). Money is stored as integer cents, never floats.
// ---------------------------------------------------------------------------

// SCOPE Phase 2 — Announcements / message board. Any member may post; the
// author or the household admin may delete.
export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull(),
    body: text("body").notNull(),
    // When true, the board shows "Anonymous" instead of the author's name.
    // authorId is still stored so the author can delete their own post.
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    householdIdx: index("announcements_household_idx").on(t.householdId),
  }),
);

// SCOPE Phase 2 — Shared shopping list. Any member adds/checks/deletes items.
export const shoppingItems = pgTable(
  "shopping_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    addedBy: uuid("added_by").notNull(),
    checked: boolean("checked").notNull().default(false),
    checkedBy: uuid("checked_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    householdIdx: index("shopping_items_household_idx").on(t.householdId),
  }),
);

// SCOPE Phase 3 — Utilities & bills tracking. amountCents is integer cents.
export const bills = pgTable(
  "bills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    amountCents: integer("amount_cents").notNull(),
    dueDate: date("due_date"),
    paid: boolean("paid").notNull().default(false),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    householdIdx: index("bills_household_idx").on(t.householdId),
  }),
);

// SCOPE Phase 5 — Splitwise-style expense splitting. An expense is paid by one
// member and split into shares (one row per member who owes). amountCents must
// equal the sum of its split shareCents.
export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    paidBy: uuid("paid_by").notNull(),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    householdIdx: index("expenses_household_idx").on(t.householdId),
  }),
);

export const expenseSplits = pgTable(
  "expense_splits",
  {
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    shareCents: integer("share_cents").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.expenseId, t.userId] }),
  }),
);

// A direct payment from one member to another that reduces their balance.
export const settlements = pgTable(
  "settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    fromUserId: uuid("from_user_id").notNull(),
    toUserId: uuid("to_user_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    householdIdx: index("settlements_household_idx").on(t.householdId),
  }),
);

// SCOPE Phase 4 — Two-way calendar sync. A Google Calendar watch channel
// registered for a user so calendar changes notify our webhook. Best-effort.
export const calendarChannels = pgTable(
  "calendar_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    channelId: text("channel_id").notNull(),
    // Secret echoed back by Google as X-Goog-Channel-Token; the webhook requires
    // it to match before reconciling, so a forged notification can't trigger work.
    // Nullable for legacy rows registered before this column existed.
    token: text("token"),
    resourceId: text("resource_id").notNull(),
    expiration: timestamp("expiration", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueChannel: unique("calendar_channels_channel_unique").on(t.channelId),
  }),
);
