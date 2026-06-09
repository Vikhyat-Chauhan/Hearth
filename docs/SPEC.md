# Spec: Hearth

> A shared-household app for students and roommates: the main roommate creates a household, invites the others, and assigns recurring chores that show up on everyone's Google Calendar.

**Core Loop:** The admin creates a household, invites roommates by code, and assigns a recurring chore to one or more members → the chore is written to each assignee's Google Calendar → members view their chores and mark each occurrence done (honor system).

> **Build boundary (V1 / SCOPE Phase 1).** This sprint delivers Phase 1 only: Google sign-in, household + invite, admin chore creation/assignment with recurrence, member view + mark-done, and **full one-way Google Calendar sync** (app → calendar). SCOPE Phases 2–5 (announcements, shopping list, bills, two-way sync, expense splitting) are P2/out of scope. Decisions locked during intake: **(a)** full Google OAuth + calendar sync in V1; **(b)** a shared chore occurrence is complete when **any one** assignee marks it done.

---

## Features

### P0 — Must Have
- Google sign-in (login = Google Calendar authorization; calendar scope requested at consent)
- Create household (creator becomes admin; invite code generated)
- Join household via invite code/link (joiner becomes member)
- Admin creates & assigns a chore (single or shared) with an RRULE recurrence
- Member views their assigned chores with upcoming occurrences
- Member marks a chore occurrence done (honor system, logged)
- One-way Google Calendar sync: chore create/edit/delete writes/updates/removes events on each connected assignee's calendar

### P1 — Should Have
- Admin edits/deletes a chore (changes propagate to calendar events)
- Admin manages household: remove a member (their assignments + calendar events removed)
- Connect Google later: a member who joined before connecting Google connects it and their existing chores backfill onto their calendar

### P2 — Nice to Have (later SCOPE phases — in scopre)
- Announcements / message board (Phase 2)
- Shared shopping list (Phase 2)
- Utilities & bills tracking (Phase 3)
- Two-way Google Calendar sync (Phase 4)
- Splitwise-style expense splitting (Phase 5)
- Multiple households per user

---

## Data Model

| Entity | Key Fields |
|--------|------------|
| User (profile) | id (= Supabase auth user id), email, name, google_refresh_token_enc (nullable), created_at |
| Household | id, name, admin_user_id, invite_code (unique), created_at |
| Membership | id, household_id, user_id, role [admin\|member], joined_at — unique (household_id, user_id) |
| Chore | id, household_id, title, description (nullable), rrule, created_by, active, created_at |
| ChoreAssignment | chore_id, user_id — many-to-many (shared chores); unique (chore_id, user_id) |
| ChoreLog | id, chore_id, user_id, occurrence_date, completed_at — unique (chore_id, occurrence_date) (any-one-marks-it) |
| CalendarLink | id, user_id, chore_id, provider, external_event_id, last_synced_at — unique (user_id, chore_id) |

---

## Non-Functional Requirements

> Drives the frozen validation schemas and auth scaffold in Sprint 0.

- **Auth & ownership:** Accounts required — **Google OAuth via Supabase Auth** ("Sign in with Google"), requesting the Google Calendar scope in the same consent so login *is* calendar authorization. The auth callback captures `provider_refresh_token` and stores it encrypted on the profile. Two roles per household: **admin** (creator — invites/removes members, creates/edits/deletes chores) and **member** (views own chores, marks done). All Household/Chore data is household-scoped: a user only sees households they belong to and chores in those households. Chore creation/editing/deletion is admin-only. A member sees only chores assigned to them.
- **Validation rules:**
  - Household: `name` required, 1–80 chars; `invite_code` unique, generated server-side.
  - Membership: `role` ∈ {admin, member}; unique (household_id, user_id); exactly one admin per household.
  - Chore: `title` required, 1–120 chars; `description` optional, ≤1000 chars; `rrule` required, must be a valid RFC 5545 RRULE string; at least one assignee required.
  - ChoreAssignment: each user_id must be a member of the chore's household; unique (chore_id, user_id).
  - ChoreLog: `occurrence_date` required, valid ISO date; the marking user must be an assignee of the chore; unique (chore_id, occurrence_date) — second mark of the same occurrence is idempotent, not an error.
  - CalendarLink: `external_event_id` required; unique (user_id, chore_id).
  - (No monetary fields in V1 — bills/splitting are later phases.)
- **Data integrity:**
  - Deleting a Chore cascades to its ChoreAssignments, ChoreLogs, and CalendarLinks — and deletes the corresponding Google Calendar events across all assignees.
  - Removing a Membership removes that user's ChoreAssignments for the household and deletes their CalendarLinks/calendar events; chores assigned to others are unaffected.
  - A member who has not connected Google has chores in-app but no CalendarLink/event until they connect — sync backfills then.
  - Calendar writes are best-effort and retryable: a failed write never blocks chore persistence and never returns an unhandled 500; the chore is saved and the sync is queued/retried.

---

## Stories

> One block per P0/P1 feature. P2 features are in scopre — omitted.

### Google sign-in
ENTRY: user navigates to /login
FLOW:
  1. Click "Sign in with Google"
  2. Grant Google consent (incl. calendar scope)
  3. Redirected back; session created
EXIT: User lands on / authenticated; a profile row exists and the encrypted Google refresh token is stored.
ACCEPTANCE CRITERIA:
  - Happy path: a session is created and survives a reload; a profile row is persisted with the encrypted refresh token.
  - Failure path: declined consent or auth error returns the user to /login with a clear message and no session.
  - Ownership: after login the user sees only households they belong to.

### Create household
ENTRY: user navigates to /households/new (or onboarding when they belong to no household)
FLOW:
  1. Enter a household name
  2. Submit
  3. Become admin; an invite code is shown
EXIT: A Household row is persisted with admin = current user and a unique invite_code, plus an admin Membership row.
ACCEPTANCE CRITERIA:
  - Happy path: the household and admin membership persist and survive a reload; the invite code is displayed.
  - Failure path: an empty or >80-char name is rejected with a clear error and nothing is persisted.
  - Ownership: only members of the household can view it.

### Join household via invite code
ENTRY: user navigates to /join (or /join/[code])
FLOW:
  1. Enter or follow an invite code
  2. Confirm join
  3. Become a member
EXIT: A Membership row (role=member) is persisted and the user can see the household's chores.
ACCEPTANCE CRITERIA:
  - Happy path: the membership persists and survives a reload; the user appears in the household.
  - Failure path: an invalid code is rejected with a clear error and no membership is created; re-joining a household the user is already in is rejected cleanly.
  - Ownership: joining grants access only to that household.

### Create & assign a chore
ENTRY: admin navigates to /chores/new
FLOW:
  1. Enter title, optional description, and recurrence (RRULE)
  2. Select one or more assignees
  3. Submit
EXIT: A Chore and its ChoreAssignment rows are persisted; calendar events are created for each connected assignee (CalendarLink rows written).
ACCEPTANCE CRITERIA:
  - Happy path: the chore and assignments persist and survive a reload; a CalendarLink/event is created for each assignee who has Google connected.
  - Failure path: an empty title, invalid RRULE, or zero assignees is rejected with a clear error and nothing is persisted.
  - Ownership: only the household admin can create chores; a member gets 403.

### View my chores
ENTRY: member navigates to /chores
FLOW:
  1. Navigate to /chores
  2. See chores assigned to me with their upcoming occurrences
EXIT: A list of the current user's assigned chores renders with next-occurrence dates.
ACCEPTANCE CRITERIA:
  - Happy path: only chores assigned to the current user in their household are shown; the list survives a reload.
  - Failure path: a user with no assignments sees an empty state, not an error.
  - Ownership: a user never sees chores from other households or chores not assigned to them.

### Mark a chore occurrence done
ENTRY: member taps "Mark done" on an occurrence on /chores
FLOW:
  1. Find an occurrence
  2. Tap "Mark done"
  3. See it logged as done
EXIT: A ChoreLog row is persisted for (chore, occurrence_date) by the current user; the occurrence shows as done.
ACCEPTANCE CRITERIA:
  - Happy path: the completion persists and the occurrence still shows done after a reload.
  - Failure path: marking a chore the user is not assigned to is rejected; a second mark of the same occurrence is idempotent (no error, no duplicate).
  - Ownership: only an assignee of the chore can mark its occurrence done.

### One-way Google Calendar sync
ENTRY: triggered server-side by chore create / edit / delete (and by "connect Google later")
FLOW:
  1. On chore create → write a recurring (RRULE) event to each connected assignee's Google Calendar
  2. On chore edit → update those events
  3. On chore delete or unassign → delete those events
EXIT: CalendarLink rows hold the Google `external_event_id` per (chore, user); each assignee's calendar reflects the chore's current state.
ACCEPTANCE CRITERIA:
  - Happy path: creating a chore creates a recurring Google Calendar event for each connected assignee and stores its CalendarLink; editing/deleting the chore updates/removes those events.
  - Failure path: a calendar API failure is captured and retryable and never returns an unhandled 500; an assignee without Google connected simply gets no event while the chore still persists.
  - Ownership: events are written only to each assignee's own calendar using that user's stored token.

### Admin edits/deletes a chore  *(P1)*
ENTRY: admin navigates to /chores/[id]/edit
FLOW:
  1. Change title/description/recurrence/assignees, or delete
  2. Submit
  3. See the chore and its calendar events updated/removed
EXIT: The Chore (and assignments) are updated or deleted; calendar events are updated/removed across all assignees.
ACCEPTANCE CRITERIA:
  - Happy path: edits persist and survive a reload; deleting cascades to assignments, logs, CalendarLinks, and calendar events.
  - Failure path: invalid input is rejected with a clear error and nothing is changed; a non-admin gets 403.
  - Ownership: only the household admin can edit or delete a chore.

### Admin removes a member  *(P1)*
ENTRY: admin navigates to /household
FLOW:
  1. View the member list
  2. Remove a member
  3. See the member and their chore data removed
EXIT: The Membership is deleted; the removed member's ChoreAssignments and CalendarLinks/events are removed.
ACCEPTANCE CRITERIA:
  - Happy path: removal persists and survives a reload; the member's assignments and calendar events are gone, others' are unaffected.
  - Failure path: a member cannot remove anyone (403); the admin cannot remove themselves while admin.
  - Ownership: only the household admin can remove members.

### Connect Google later  *(P1)*
ENTRY: member navigates to /settings/calendar
FLOW:
  1. Click "Connect Google Calendar"
  2. Grant calendar consent
  3. See existing chores backfilled onto the calendar
EXIT: The member's refresh token is stored; CalendarLinks/events are created for all chores already assigned to them.
ACCEPTANCE CRITERIA:
  - Happy path: after connecting, every chore already assigned to the member has a calendar event and CalendarLink; survives a reload.
  - Failure path: a failed backfill is retryable and surfaces a clear status, never a 500.
  - Ownership: events are written only to the connecting user's own calendar.

---

## Tech Stack

| Concern    | Choice |
|------------|--------|
| Framework  | Next.js (App Router, TypeScript) |
| Database   | Supabase (Postgres) + Drizzle ORM |
| Auth       | Google OAuth via Supabase Auth ("Sign in with Google" + Google Calendar scope) |

**External services to provision:** a Google Cloud OAuth app with the Google Calendar API enabled and the calendar scope on the consent screen; the Google client ID/secret configured as the Supabase Auth Google provider. A small reconcile/retry cron (later) repairs failed/backfilled event writes.

---

## Success Criteria

- [ ] A roommate can sign in with Google, create a household, and invite others by code.
- [ ] An admin can assign a recurring chore to one or several members, and it appears on each connected member's Google Calendar.
- [ ] A member can view their chores and mark an occurrence done, and it persists.
- [ ] The Core Loop works end-to-end with real persistence.
- [ ] Every P0/P1 feature passes its Quality Gate (typecheck + lint + test + build + smoke).
