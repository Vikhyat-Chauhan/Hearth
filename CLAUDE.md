# [Project Name] — Agent Steering Guide

> [One-sentence description of what the app does and who it's for.]

Live URL: **(written automatically by `npm run provision:vercel`)**

---

## Tech Stack

| Concern    | Choice                                            |
|------------|---------------------------------------------------|
| Framework  | Next.js (App Router, TypeScript)                  |
| Frontend   | React + Tailwind CSS                              |
| Database   | Supabase + Drizzle ORM                                    |
| Auth       | *(only if needed)* Supabase Auth — email/password |
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

- **Navbar auth contract (always enforced when a Navbar is created):**
  1. Create `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts` (server) if they don't exist — wrappers around `@supabase/ssr`.
  2. Create `src/app/login/page.tsx` — Supabase email/password form. On success → redirect to `/`.
  3. Create `src/app/auth/callback/route.ts` — exchanges Supabase auth code for a session.
  4. Add `src/middleware.ts` that redirects unauthenticated requests on `/(app)/*` to `/login`.
  5. `Navbar.tsx` is a server component: reads session via server client. Renders a Login link (`/login`) when no session; renders user avatar + email + Logout dropdown when session exists. Logout calls `supabase.auth.signOut()` and redirects to `/login`.
  6. Add `@supabase/ssr` to `package.json` if not already present (the one approved exception to the no-new-deps rule for auth).

**Domain-specific (add during intake):**

- [key enums, utility names, etc.]

---

## Directory Map

Keeps parallel agents off each other's files. Update as files are created.

| Path | Purpose |
|------|---------|
| `src/app/(app)/` | App pages |
| `src/app/api/` | API route handlers |
| `src/app/login/` | Login page |
| `src/app/auth/callback/` | Supabase auth callback handler |
| `src/components/` | Shared UI components |
| `src/components/states/` | Loading / Empty / Error UI primitives (reuse everywhere) |
| `src/lib/types.ts` | Shared types / data shapes — **frozen after Sprint 0** |
| `src/lib/validation.ts` | zod schemas per entity (create/update) — **frozen after Sprint 0** |
| `src/lib/api.ts` | Consistent JSON response + error-handling helpers for routes |
| `src/lib/utils.ts` | Shared utilities |
| `src/lib/supabase/` | Supabase client helpers (client.ts + server.ts) |
| `src/middleware.ts` | Route protection — redirects unauthed users to /login |
| `src/db/index.ts` | DB client + table exports — single entry point |
| `src/db/schema.ts` | Drizzle schema — **frozen after Sprint 0** |
| `src/app/error.tsx` · `loading.tsx` · `not-found.tsx` | App-level error boundary / loading / 404 |
| `src/test/` | Test setup + cross-cutting tests (feature tests may colocate) |
| `.github/workflows/ci.yml` | CI: typecheck + lint + test + build on every PR and on push to `main` |

---

## Backlog

*(From spec, sorted P0 → P1 → P2.)*

| Priority | Feature | Notes |
|----------|---------|-------|
|          |         |       |

---

## Stories

*(Filled during intake. One block per P0/P1 feature — copied verbatim from docs/SPEC.md.)*

### [Feature Name]
ENTRY: [entry condition]
FLOW:

  1. [step]
  2. [step]
    -
  n. [step]
EXIT:  [success state]
ACCEPTANCE CRITERIA:
  - [happy path: row persisted, survives reload]
  - [failure path: invalid input rejected, nothing persisted]
  - [ownership, if applicable: user sees only their own rows]

---

## Active Feature Streams

| Status | Stream ID | Feature |
|--------|-----------|---------|
| —      | —         | *(set by the orchestrator at sprint start)* |

---

## Implemented Features

| Feature | Priority | Key Files | Stream ID |
|---------|----------|-----------|-----------|
| *(none yet)* | — | — | — |

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
