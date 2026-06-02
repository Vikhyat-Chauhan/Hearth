# [Project Name] — Agent Steering Guide

> [One-sentence description of what the app does and who it's for.]

Live URL: **(paste after first deploy)**

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

- Build the thinnest thing that demos. Stub anything not in scope. Prefer read + create over full CRUD.
- A feature must run even if another active stream's files are missing — never call another stream's endpoint at runtime. Seed or query locally instead.
- All internal pages: `export const dynamic = "force-dynamic"`.
- No new npm dependencies without explicit user approval — exhaust existing packages first.

- Monetary amounts stored as **cents** (integers) — never floats.
- All DB access through `src/db/index.ts` only — never import the Drizzle client elsewhere.
- Protected API routes: `createClient()` + `getUser()` → return 401 if no session.

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
| `src/lib/types.ts` | Shared types / data shapes |
| `src/lib/utils.ts` | Shared utilities |
| `src/lib/supabase/` | Supabase client helpers (client.ts + server.ts) |
| `src/middleware.ts` | Route protection — redirects unauthed users to /login |
| `src/db/index.ts` | DB client + table exports — single entry point |
| `src/db/schema.ts` | Drizzle schema |

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
EXIT:  [success state]

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

## Handoff Contract

On completion, each agent updates this file directly:
1. In **Active Feature Streams**: change `[ ] In Progress` → `[x] Complete` for the stream.
2. In **Implemented Features**: add a row — feature name, priority, key files, stream ID.

`CLAUDE.md` is the shared memory across all terminals.
