# [Project Name] — Agent Steering Guide

> [One-sentence description of what the app does and who it's for.]

Live URL: **(paste after first deploy)**
DB decision: **(set during the DB fork — "in-memory, no DB" or "Supabase / Postgres")**

---

## Tech Stack

| Concern    | Choice                                            |
|------------|---------------------------------------------------|
| Framework  | Next.js (App Router, TypeScript)                  |
| Frontend   | React + Tailwind CSS                              |
| Database   | *(only if DB decision = Supabase)* Supabase + Drizzle ORM |
| Auth       | *(only if needed)* Supabase Auth — email/password |
| Deployment | Vercel (`vercel --prod`)                          |

---

## Golden Principles

**Universal — always enforced:**

- Build the thinnest thing that demos. Stub anything not in scope. Prefer read + create over full CRUD.
- A feature must run even if another active stream's files are missing — never call another stream's endpoint at runtime. Seed or query locally instead.
- All internal pages: `export const dynamic = "force-dynamic"`.
- No new npm dependencies without explicit user approval — exhaust existing packages first.

**Apply ONLY if DB decision = Supabase:**

- Monetary amounts stored as **cents** (integers) — never floats.
- All DB access through `src/db/index.ts` only — never import the Drizzle client elsewhere.
- Protected API routes: `createClient()` + `getUser()` → return 401 if no session.

**Domain-specific (add during intake):**

- [key enums, utility names, etc.]

---

## Directory Map

Keeps parallel agents off each other's files. Update as files are created.

| Path | Purpose |
|------|---------|
| `src/app/(app)/` | App pages |
| `src/app/api/` | API route handlers |
| `src/components/` | Shared UI components |
| `src/lib/types.ts` | Shared types / data shapes |
| `src/lib/utils.ts` | Shared utilities |
| `src/db/index.ts` | *(Supabase only)* DB client + table exports — single entry point |
| `src/db/schema.ts` | *(Supabase only)* Drizzle schema |

---

## Backlog

*(From spec, sorted P0 → P1 → P2.)*

| Priority | Feature | Notes |
|----------|---------|-------|
|          |         |       |

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

On completion, each agent writes its notes back here per the POST-COMPLETION block in
`docs/ORC.md`: mark the stream **Complete**, record shortcuts taken, and move the feature
to **Implemented Features**. `CLAUDE.md` is the shared memory across all terminals.
