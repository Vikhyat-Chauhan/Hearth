# Hearth — Agent Steering Guide

> A shared-household app for students and roommates: the main roommate creates a household, invites the others, and assigns recurring chores that show up on everyone's Google Calendar.

Live URL: **https://hearth-ruby-eight.vercel.app**

---

## Tech Stack

| Concern    | Choice                                            |
|------------|---------------------------------------------------|
| Framework  | Next.js (App Router, TypeScript)                  |
| Frontend   | React + Tailwind CSS                              |
| Database   | Supabase + Drizzle ORM                                    |
| Auth       | Google OAuth via Supabase Auth ("Sign in with Google" + Google Calendar scope) |
| Calendar   | Google Calendar API — two-way sync (app ↔ each assignee's calendar)             |
| Deployment | Vercel (`vercel --prod`)                          |

---

## Golden Principles

**Universal — always enforced:**

- Build the simplest thing that is correct and complete — no broken states, no gold-plating. Simple ≠ hollow: in-scope features are real, out-of-scope ones are stubbed.
- A feature must run even if another active stream's files are missing — never call another stream's endpoint at runtime. Streams integrate through the frozen contracts (`types.ts`, `schema.ts`, `validation.ts`), not through runtime coupling.
- In-scope features **persist to the real database** through `src/db/index.ts`. Mock only what is explicitly out of scope.
- Every mutation input is **validated** with the entity's zod schema in `src/lib/validation.ts` before it touches the DB; invalid input is rejected with a clear error.
- Every async UI renders **loading, empty, and error** states using the shared primitives in `src/components/states/`. API logic is wrapped so failures return a structured error, never an unhandled 500 (see `src/lib/api.ts`).
- Every feature ships a **test** for its core path plus at least one failure case (invalid input rejected). A feature is done only when the **Quality Gate** passes: `npm run typecheck && npm run lint && npm run test && npm run build`, plus the smoke check.
- No new npm dependencies without explicit user approval — exhaust existing packages first.

- Monetary amounts stored as **cents** (integers) — never floats.
- All DB access through `src/db/index.ts` only — never import the Drizzle client elsewhere.
- Protected API routes (user-owned entities): `createClient()` + `getUser()` → return 401 if no session; scope every query to the current user.

- **Auth contract (Google OAuth variant — Hearth uses Google, NOT email/password; no `/login` page):**
  1. `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts` (server) are wrappers around `@supabase/ssr`.
  2. There is **no `/login` page**. The marketing landing (`src/app/page.tsx`) is the sign-in surface: its CTAs render `src/components/GoogleSignIn.tsx`, which calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { scopes: 'https://www.googleapis.com/auth/calendar', queryParams: { access_type: 'offline', prompt: 'consent' }, redirectTo: <origin>/auth/callback } })`. `access_type=offline` + `prompt=consent` are required to receive a `provider_refresh_token`.
  3. `src/app/auth/callback/route.ts` — exchanges the auth code for a session AND captures `session.provider_refresh_token`; encrypts it (see Calendar rules) and upserts it onto the user's profile row. On success → redirect to `/`.
  4. `src/middleware.ts` keeps `/` and `/auth/callback` public and redirects every other unauthenticated request to `/`. API routes enforce auth themselves and return JSON `401` rather than redirecting.
  5. `Navbar.tsx` is a server component: reads session via server client. Logged-out visitors see the landing's "Sign in with Google" CTAs; logged-in users get the avatar + email + a Settings dropdown with Logout. Logout calls `supabase.auth.signOut()` and redirects to `/`.
  6. `@supabase/ssr` is already in `package.json`.
  7. The Google provider must be enabled in the Supabase project with the Google Cloud OAuth client ID/secret, and the Calendar API enabled on that Google Cloud project (provisioning step — see docs/SPEC.md "External services").

**Domain-specific:**

- **Roles:** one `admin` per household (the creator); everyone else is a `member`. Only the admin creates/edits/deletes chores and removes members. Members view chores assigned to them and mark occurrences done. Enforce role in the API, not just the UI.
- **Household scoping:** every Household/Chore/Membership query is scoped to households the current user belongs to. A member sees only chores assigned to them. Never leak cross-household data.
- **Recurrence is an RRULE** (RFC 5545) string, stored verbatim on `Chore.rrule` and passed straight to the Google Calendar API `recurrence` field — one representation drives both the in-app schedule and the calendar event. Validate it as a well-formed RRULE in `validation.ts`.
- **Shared-chore completion = any-one-marks-it.** A `ChoreLog` is unique per `(chore_id, occurrence_date)`; any assignee marking an occurrence completes it for everyone. A repeat mark is idempotent, not an error.
- **Calendar sync is one-way (app → calendar) and best-effort.** Chore create/edit/delete writes/updates/deletes a recurring event on each *connected* assignee's calendar; the `external_event_id` lives on `CalendarLink` per `(user_id, chore_id)`. A failed or skipped write (member hasn't connected Google) NEVER blocks chore persistence and NEVER returns a 500 — it is queued/retryable. All Google Calendar calls go through one server-only module (`src/lib/calendar.ts`); no other file talks to the Calendar API directly.
- **Refresh tokens are encrypted at rest.** `User.google_refresh_token_enc` is encrypted with a server-only key (`TOKEN_ENC_KEY` env var) via a helper in `src/lib/crypto.ts`; it is never sent to the client.
- **No monetary fields in V1** — bills/expense splitting are later SCOPE phases. (The "money as cents" rule applies only when those arrive.)

---

## Directory Map

Keeps parallel agents off each other's files. Update as files are created.

| Path | Purpose |
|------|---------|
| `src/app/(app)/` | App pages |
| `src/app/api/` | API route handlers |
| `src/app/page.tsx` | Marketing landing — also the sign-in surface (CTAs launch Google directly; no `/login` page) |
| `src/components/GoogleSignIn.tsx` | "Sign in with Google" CTA — calls `signInWithOAuth` |
| `src/app/auth/callback/` | OAuth callback — exchanges code, captures + encrypts the Google refresh token |
| `src/lib/calendar.ts` | **Only** module that calls the Google Calendar API (create/update/delete events) — **frozen contract after Sprint 0** |
| `src/lib/crypto.ts` | Encrypt/decrypt the Google refresh token at rest (`TOKEN_ENC_KEY`) |
| `src/lib/email.ts` | **Only** module that sends email (Resend) — best-effort; `RESEND_API_KEY`/`EMAIL_FROM` |
| `src/lib/notifications.ts` | Notification recipient/digest logic (announcement recipients, due-chore digests) |
| `src/components/` | Shared UI components |
| `src/components/states/` | Loading / Empty / Error UI primitives (reuse everywhere) |
| `src/lib/types.ts` | Shared types / data shapes — **frozen after Sprint 0** |
| `src/lib/validation.ts` | zod schemas per entity (create/update) — **frozen after Sprint 0** |
| `src/lib/api.ts` | Consistent JSON response + error-handling helpers for routes |
| `src/lib/utils.ts` | Shared utilities |
| `src/lib/supabase/` | Supabase client helpers (client.ts + server.ts) |
| `src/middleware.ts` | Route protection — redirects unauthed users to `/` (landing) |
| `src/db/index.ts` | DB client + table exports — single entry point |
| `src/db/schema.ts` | Drizzle schema — **frozen after Sprint 0** |
| `src/app/error.tsx` · `loading.tsx` · `not-found.tsx` | App-level error boundary / loading / 404 |
| `src/test/` | Test setup + cross-cutting tests (feature tests may colocate) |
| `.github/workflows/ci.yml` | CI: typecheck + lint + test + build on every PR and on push to `main` |

---

## Backlog

*(From spec, sorted P0 → P1 → P2. V1 = SCOPE Phase 1 only.)*

| Priority | Feature | Notes |
|----------|---------|-------|
| P0 | Google sign-in | Supabase Auth Google provider + calendar scope; captures encrypted refresh token |
| P0 | Create household | Creator becomes admin; unique invite code generated |
| P0 | Join household via invite code | Joiner becomes member |
| P0 | Create & assign chore (single or shared) | Admin-only; RRULE recurrence; ≥1 assignee |
| P0 | View my chores | Member sees own assigned chores + upcoming occurrences |
| P0 | Mark chore occurrence done | Honor system; any-one-marks-it for shared chores |
| P0 | One-way Google Calendar sync | create/edit/delete events per connected assignee via `src/lib/calendar.ts` |
| P1 | Admin edits/deletes a chore | Propagates to calendar events |
| P1 | Admin removes a member | Removes their assignments + calendar events |
| P1 | Connect Google later | Backfills events for a member who connects after assignment |
| P2 | Announcements / message board | SCOPE Phase 2 — **shipped** |
| P2 | Shared shopping list | SCOPE Phase 2 — **shipped** |
| P2 | Utilities & bills tracking | SCOPE Phase 3 — **shipped** |
| P2 | Two-way calendar sync | SCOPE Phase 4 — **shipped** |
| P2 | Splitwise-style expense splitting | SCOPE Phase 5 — **shipped** |
| P2 | Multiple households per user | **shipped** |

---

## Stories

*(Copied verbatim from docs/SPEC.md. One block per P0/P1 feature.)*

### Google sign-in
ENTRY: user opens the landing page (/) and clicks a "Sign in with Google" CTA
FLOW:
  1. Click "Sign in with Google"
  2. Grant Google consent (incl. calendar scope)
  3. Redirected back; session created
EXIT: User lands on / authenticated; a profile row exists and the encrypted Google refresh token is stored.
ACCEPTANCE CRITERIA:
  - Happy path: a session is created and survives a reload; a profile row is persisted with the encrypted refresh token.
  - Failure path: declined consent or auth error returns the user to the landing (/) with a clear message and no session.
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
EXIT: CalendarLink rows hold the Google external_event_id per (chore, user); each assignee's calendar reflects the chore's current state.
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

## Active Feature Streams

| Status | Stream ID | Feature |
|--------|-----------|---------|
| —      | —         | *(set by the orchestrator at sprint start)* |

---

## Implemented Features

| Feature | Priority | Key Files | Stream ID |
|---------|----------|-----------|-----------|
| Households: create + join | P0 | `app/api/households/route.ts`, `app/api/households/join/route.ts`, `(app)/households/new`, `(app)/join`, `(app)/household`, `lib/household.ts` | feat/households |
| Chores: create & assign + calendar sync | P0 | `app/api/chores/route.ts`, `(app)/chores/new`, `components/ChoreForm.tsx`, `lib/chore-sync.ts`, `lib/calendar.ts`, `lib/recurrence.ts` | feat/chores |
| My Chores: view + mark done | P0 | `app/api/chore-logs/route.ts`, `(app)/chores/page.tsx`, `components/MarkDoneButton.tsx`, `lib/chores.ts` | feat/my-chores |
| Chores page: My / All chores tabs | P2 | `(app)/chores/page.tsx`, `components/ChoreTabs.tsx`, `components/ChoreList.tsx`, `lib/chores.ts` (`getHouseholdChores`) | feat/chores-allview |
| Admin edits/deletes a chore | P1 | `app/api/chores/[id]/route.ts`, `(app)/chores/[id]/edit`, `components/ChoreForm.tsx` | feat/chore-edit |
| Admin removes a member | P1 | `app/api/households/members/route.ts`, `components/RemoveMemberButton.tsx`, `(app)/household` | feat/member-remove |
| Rename household (admin) | P2 | `app/api/households/[id]/route.ts` (`PATCH`), `components/RenameHouseholdControl.tsx`, `(app)/household` | feat/household-rename |
| Leave / delete / transfer household | P2 | `app/api/households/route.ts` (`DELETE`), `app/api/households/leave/route.ts`, `app/api/households/transfer/route.ts`, `components/LeaveHouseholdButton.tsx`, `components/DeleteHouseholdButton.tsx`, `components/TransferAdminControl.tsx`, `lib/household.ts` (`purgeMemberFromHousehold`), `(app)/household` (Danger zone) | feat/household-exit |
| Connect Google later (backfill) | P1 | `app/api/calendar/backfill/route.ts`, `(app)/settings/calendar`, `components/ConnectCalendar.tsx` | feat/connect-later |
| Announcements / message board | P2 | `app/api/announcements/route.ts`, `app/api/announcements/[id]/route.ts`, `(app)/announcements`, `components/AnnouncementForm.tsx`, `lib/announcements.ts` | feat/announcements |
| Shared shopping list | P2 | `app/api/shopping/route.ts`, `app/api/shopping/[id]/route.ts`, `(app)/shopping`, `components/ShoppingForm.tsx`, `components/ShoppingToggle.tsx`, `lib/shopping.ts` | feat/shopping |
| Utilities & bills tracking | P2 | `app/api/bills/route.ts`, `app/api/bills/[id]/route.ts`, `(app)/bills`, `components/BillForm.tsx`, `components/BillPaidToggle.tsx`, `lib/bills.ts` | feat/bills |
| Splitwise-style expense splitting | P2 | `app/api/expenses/route.ts`, `app/api/expenses/[id]/route.ts`, `app/api/settlements/route.ts`, `(app)/expenses`, `components/ExpenseForm.tsx`, `components/SettlementForm.tsx`, `lib/expenses.ts` | feat/expenses |
| Multiple households per user | P2 | `app/api/households/active/route.ts`, `components/HouseholdSwitcher.tsx`, `lib/household.ts` (`listUserHouseholds`, active-household cookie) | feat/multi-household |
| Two-way Google Calendar sync | P2 | `app/api/calendar/watch/route.ts`, `app/api/calendar/webhook/route.ts`, `(app)/settings/calendar`, `components/TwoWaySync.tsx`, `lib/calendar-twoway.ts`, `lib/calendar.ts` (`watchCalendar`/`getEventStatus`) | feat/calendar-twoway |
| Email notifications (announcements + due-chore digest) | P2 | `lib/email.ts` (Resend — **only** mailer), `lib/notifications.ts` (`recipientsForAnnouncement`/`dueChoreDigests`), `app/api/announcements/route.ts` (best-effort notify on post), `app/api/cron/due-chores/route.ts` + `vercel.json` (daily cron, `CRON_SECRET`-guarded), `app/api/settings/notifications/route.ts` (PATCH prefs), `(app)/settings/notifications`, `components/NotificationPrefs.tsx`, `profiles.notify_announcements`/`notify_chores`, `drizzle/0007_*.sql` | feat/email-notifications |
| Shared types/schema/validation additions | P2 | `db/schema.ts`, `lib/types.ts`, `lib/validation.ts`, `lib/utils.ts` (money helpers), `drizzle/0001_*.sql` | (shared) |

---

## Definition of Done

A feature is **not** done until all of these hold. Self-check before flipping a stream to Complete:

- [ ] In-scope data persists to the real DB through `src/db/index.ts` (survives a reload).
- [ ] Every mutation validates input with the entity's zod schema; invalid input is rejected with a clear error.
- [ ] UI renders loading, empty, and error states; API failures return a structured error, not a 500.
- [ ] User-owned entities are auth-protected and query-scoped to the current user.
- [ ] A test covers the happy path and at least one acceptance-criteria failure case.
- [ ] **Quality Gate passes:** `npm run typecheck && npm run lint && npm run test && npm run build`, plus the smoke action confirms the acceptance criteria.

---

## Handoff Contract

On completion — **only after the Definition of Done above is met** — each agent updates this file directly:
1. In **Active Feature Streams**: change `[ ] In Progress` → `[x] Complete` for the stream.
2. In **Implemented Features**: add a row — feature name, priority, key files, stream ID.

A stream that can't pass the Quality Gate stays `[ ] In Progress` and is re-queued solo — never marked Complete.

`CLAUDE.md` is the shared memory across all terminals.
