# Hearth — Architecture

How the code fits together. This is the developer-facing companion to
[`SPEC.md`](SPEC.md) (the product spec) and [`../CLAUDE.md`](../CLAUDE.md) (the agent
steering guide, which carries the authoritative coding rules).

## Stack at a glance

Next.js App Router (TypeScript) on Vercel, React + Tailwind on the front end, Supabase
(Postgres) reached through Drizzle ORM, and Google OAuth via Supabase Auth. Google
Calendar is the one external integration.

## Directory map

| Path | Purpose |
|------|---------|
| `src/app/(app)/` | Authenticated pages (chores, household, settings, board, shopping, bills, expenses) |
| `src/app/api/` | API route handlers — one folder per resource |
| `src/app/auth/callback/` | OAuth callback — exchanges the code, captures + encrypts the Google refresh token |
| `src/app/auth/signout/` | Sign-out route |
| `src/app/page.tsx` | Marketing landing; doubles as the sign-in surface (no `/login` page) |
| `src/app/error.tsx` · `loading.tsx` · `not-found.tsx` | App-level error boundary / loading / 404 |
| `src/middleware.ts` | Route protection — redirects unauthenticated `(app)` requests to `/` |
| `src/lib/calendar.ts` | **Only** module that calls the Google Calendar API (create/update/delete events, watch) |
| `src/lib/calendar-twoway.ts` | Two-way sync: reconciles changes pushed from Google's webhook |
| `src/lib/crypto.ts` | Encrypt/decrypt the Google refresh token at rest (`TOKEN_ENC_KEY`) |
| `src/lib/env.ts` | `assertServerEnv` — fails the production boot if required env vars are missing |
| `src/lib/ratelimit.ts` | Small in-memory per-user throttle (best-effort; Vercel WAF is the real control) |
| `src/lib/api.ts` | Consistent JSON responses + `withErrorHandling` wrapper for routes |
| `src/lib/validation.ts` | zod schemas per entity (create/update) |
| `src/lib/types.ts` | Shared types / data shapes |
| `src/lib/recurrence.ts` | RRULE parsing / next-occurrence helpers |
| `src/lib/{household,chores,chore-sync,announcements,shopping,bills,expenses}.ts` | Per-domain logic |
| `src/lib/{utils,ui}.ts` | Shared utilities (incl. money-as-cents helpers) |
| `src/lib/supabase/` | Supabase client helpers (`client.ts` browser + `server.ts` server) |
| `src/components/ui/` | UI primitives (Button, Card, PageHeader, ConfirmDialog, Toast, …) |
| `src/components/states/` | Loading / Empty / Error primitives — reuse everywhere |
| `src/components/dashboard/` | Home dashboard widgets |
| `src/db/index.ts` | DB client + table exports — the single DB entry point |
| `src/db/schema.ts` | Drizzle schema — the source of truth for the database shape |
| `src/test/` | Vitest setup + tests |
| `drizzle/` | Generated SQL migrations + snapshots |

## Data model

All entities are household-scoped and query-scoped to the current user. Money is stored
as integer **cents**, never floats.

### Core (V1)

| Entity | Key fields |
|--------|------------|
| `profiles` | `id` (= Supabase auth user id), `email`, `name`, `google_refresh_token_enc` (nullable), `created_at` |
| `households` | `id`, `name`, `admin_user_id`, `invite_code` (unique), `created_at` |
| `memberships` | `id`, `household_id`, `user_id`, `role` [admin\|member] — unique (household_id, user_id) |
| `chores` | `id`, `household_id`, `title`, `description`, `rrule`, `created_by`, `active`, `created_at` |
| `chore_assignments` | (`chore_id`, `user_id`) — many-to-many for shared chores |
| `chore_logs` | `id`, `chore_id`, `user_id`, `occurrence_date`, `completed_at` — unique (chore_id, occurrence_date), any-one-marks-it |
| `calendar_links` | `id`, `user_id`, `chore_id`, `provider`, `external_event_id`, `last_synced_at` — unique (user_id, chore_id) |

### Post-V1 (additive — extend the schema without touching the core tables)

| Entity | Key fields |
|--------|------------|
| `announcements` | `id`, `household_id`, `author_id`, `body`, `is_anonymous`, `created_at` |
| `shopping_items` | `id`, `household_id`, `name`, `added_by`, `checked`, `checked_by`, `created_at` |
| `bills` | `id`, `household_id`, `title`, `amount_cents`, `due_date`, `paid`, `created_by`, `created_at` |
| `expenses` | `id`, `household_id`, `description`, `amount_cents`, `paid_by`, `created_by`, `created_at` |
| `expense_splits` | (`expense_id`, `user_id`), `share_cents` — shares sum to the expense `amount_cents` |
| `settlements` | `id`, `household_id`, `from_user_id`, `to_user_id`, `amount_cents`, `created_by`, `created_at` |
| `calendar_channels` | `id`, `user_id`, `channel_id` (unique), `token`, `resource_id`, `expiration`, `created_at` |

## Request lifecycle (protected API route)

Every mutating, user-owned route follows the same shape:

1. **Authenticate** — the Supabase server client (`createClient()` + `getUser()`) returns
   `401` via `unauthorized()` if there's no session.
2. **Authorize & scope** — confirm the user is a member (or admin) of the household and
   scope every query to it. Role is enforced in the API, not just the UI (a member hitting
   an admin action gets `403`).
3. **Validate** — parse the body with the entity's zod schema (`src/lib/validation.ts`);
   invalid input is rejected with `badRequest()` and never reaches the DB.
4. **Persist** — write through `src/db/index.ts` only; no file imports the Drizzle client
   directly.
5. **Respond** — wrap the handler in `withErrorHandling` (`src/lib/api.ts`) so an
   unexpected throw becomes a structured `500` instead of leaking a stack. Helpers:
   `ok`, `badRequest`, `unauthorized`, `forbidden`, `notFound`, `tooManyRequests`.

Async UI renders **loading / empty / error** states using the primitives in
`src/components/states/`.

## Authentication

Sign-in launches directly from the landing page's CTAs (`src/components/GoogleSignIn.tsx`)
via `supabase.auth.signInWithOAuth` with the Google Calendar scope and
`access_type=offline` + `prompt=consent` (required to receive a `provider_refresh_token`).
There is **no separate `/login` page**. `src/app/auth/callback/route.ts` exchanges the
code, captures `provider_refresh_token`, encrypts it (`src/lib/crypto.ts`), and upserts it
onto the profile row. `src/middleware.ts` keeps `/` and `/auth/callback` public and
redirects every other unauthenticated request to `/`; API routes enforce auth themselves
and return JSON `401` rather than redirecting.

## Calendar sync

- **One module, one boundary.** Only `src/lib/calendar.ts` talks to the Google Calendar
  API. Everything else calls into it.
- **One-way write (app → calendar).** Chore create/edit/delete writes/updates/deletes a
  recurring (RRULE) event on each *connected* assignee's calendar; the `external_event_id`
  lives on `calendar_links` per (user, chore). The chore's RRULE is passed verbatim to the
  Calendar API `recurrence` field — one representation drives both the in-app schedule and
  the event.
- **Best-effort, never blocking.** A failed or skipped write (assignee hasn't connected
  Google) never blocks chore persistence and never returns a `500` — it's queued/retryable.
- **Two-way (calendar → app).** `registerWatch` opens a Google watch channel
  (`calendar_channels`); Google posts changes to `/api/calendar/webhook`, which
  `src/lib/calendar-twoway.ts` reconciles. The webhook is authenticated by a per-channel
  secret echoed back as `X-Goog-Channel-Token`. Watch channels expire (~1 week) and have no
  auto-refresh job yet — see [`OPERATIONS.md`](OPERATIONS.md).
- **Connect later.** A member who connects Google after assignment has their existing
  chores backfilled (`/api/calendar/backfill`).

## Conventions

- **All DB access through `src/db/index.ts`.** Never import the Drizzle client elsewhere.
- **Recurrence is an RRULE** (RFC 5545) string stored verbatim on `chores.rrule`.
- **Shared-chore completion is any-one-marks-it**; a repeat mark is idempotent, not an error.
- **Refresh tokens are encrypted at rest** (`google_refresh_token_enc`, `TOKEN_ENC_KEY`)
  and never sent to the client.
- **Money as integer cents**, never floats.
