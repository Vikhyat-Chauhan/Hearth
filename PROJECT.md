# Agentic Coding Interview — Workflow Design

## Overview

This document defines the repeating pattern a planning agent follows across all sprint rounds during the interview session. It governs how the agent bootstraps a project, selects and parallelizes features, delegates to sub-agents, and ships to production.

---

## Round 0 — Project Bootstrap (First Run Only)

When plan mode starts for the first time:

1. Read `SPEC.md` and `CLAUDE.md` to understand the full scope and constraints.
2. Choose a project name and create a new Git repository with:
   - `.gitignore`
   - `.env` (copied/seeded from the parent folder credentials)
   - A local `CLAUDE.md` inside the project root (the living documentation file)
3. Initialize the project scaffold (framework, dependencies, folder structure).

---

## Repeating Sprint Pattern (All Subsequent Rounds)

### Step 1 — Feature Selection

From the remaining unimplemented features in `SPEC.md`, identify the **3 best candidates** for this sprint:

- Prioritized by the order defined in the main `CLAUDE.md` (running → core loop → real data → deployed → stretch)
- Selected such that all 3 can be implemented **in parallel without interference** by 3 independent Claude Code instances

Present the 3 selected features to the user and ask for approval. Include an option for the user to swap in a different feature if preferred.

> ⚠️ **Open question:** The exact UX for how alternative features are suggested to the user is still undefined and needs refinement.

---

### Step 2 — On Approval: Prep the Git Streams

For each approved feature:

1. Create a new **Git branch** (feature stream) using credentials from `.env` and the `gh` CLI.
   - Branch naming convention: `feat/<short-slug>-<hash>` (e.g. `feat/gig-log-a3f9`)
2. Add a **feature entry** to the local `CLAUDE.md` under a `## Active Feature Streams` section. Each entry contains:
   - Feature name and short description
   - Branch name
   - A unique stream identifier / hash (used by the sub-agent to mark completion)
   - Status: `[ ] In Progress`

---

### Step 3 — Generate Sub-Agent Prompts

Produce **3 self-contained prompts** — one per feature — ready to paste into 3 separate terminal tabs running independent Claude Code sessions.

Each prompt must include:

- **One-sentence goal** — what this agent is building
- **Relevant file paths** — which files to create or modify, and their roles
- **Ordered task list** — specific, atomic steps to implement the feature
- **Key constraints** — tech stack, amounts in cents, no new deps unless necessary, auth pattern, etc.
- **Definition of done** — what "complete" looks like (e.g. "user can log a gig and see it in the dashboard")
- **Post-completion instruction** — once all tasks are done, the agent must open the local `CLAUDE.md`, find its stream identifier, and write:
  - What was implemented
  - What shortcuts were taken and why
  - Any deviations from the spec and the rationale
  - Status updated to `[x] Complete`

> **Alternative approach:** Instead of pasting prompts, save all 3 prompts directly into the local `CLAUDE.md` (or a `task_manager.md`) under their stream identifiers. Then each new Claude Code agent is told: "Read `task_manager.md`, pick one unclaimed task, claim it, and implement it." This enables self-routing without manual copy-paste.
>
> ⚠️ **Needs refinement** — self-routing claim mechanism not yet fully designed.

---

### Step 4 — Integration, Testing, and Commit

Once all 3 sub-agents report back (status `[x] Complete` in `CLAUDE.md`):

1. Spin up **multiple sub-agents** to test the implementation:
   - One agent verifies the UI renders and core interactions work
   - One agent checks data flows (create → read → update) end-to-end
   - One agent verifies no broken imports, missing env vars, or build errors
2. If all checks pass:
   - Merge the 3 feature branches
   - Ensure the local `CLAUDE.md` is updated with a clean separation between:
     - `## Implemented Features` (with stream notes)
     - `## Remaining Features` (pulled from `SPEC.md`, not yet built)
3. Commit with a descriptive message referencing all 3 features.

---

### Step 5 — Deploy to Production

1. Run `vercel --prod` using the Vercel CLI (credentials in `.env`).
2. Post the live URL.
3. Wait for the user to test the deployed build before starting the next sprint round.

---

## Technology Conventions

These choices are fixed across all rounds — no variation unless explicitly overridden by the user.

| Concern | Choice |
|---|---|
| Authentication | Supabase Auth — email + password (default); `/plan` presents options before creating tasks |
| Database | Supabase (Postgres) + Prisma — always |
| Deployment | Vercel CLI (`vercel --prod`) |
| Frontend | React + Tailwind |
| Environment | `.env` lives inside the project folder; seeded from parent on bootstrap |

---

## Sub-Agent Usage Philosophy

- Use sub-agents **aggressively** — every parallelizable task should be a separate agent
- The planning agent's job is orchestration, not implementation
- If a sub-agent is stuck or going off-track, kill and restart with a tighter prompt — don't nurse a failing thread
- Every ~5 minutes during a sprint, check what's shippable and redirect if needed

---

## Local `CLAUDE.md` Structure (Living Doc)

The local `CLAUDE.md` inside the project root is the single source of truth for both **agent state** and **codebase reference**. Every agent that touches this project reads it first. Keep it accurate and current — it is the handoff contract between agents.

The template below reflects the full structure a mature local `CLAUDE.md` should grow into over sprint rounds. On bootstrap (Round 0), populate the static sections (What This Is, Tech Stack, Key Conventions, Backlog). The sprint-tracking sections (Active Streams, Implemented Features) are populated and updated by agents as work progresses.

---

````markdown
# <Project Name> — Codebase Reference

## What This Is
<One paragraph: what the app does, who it's for, core value proposition.>

Live URL: **<vercel URL once deployed>**

---

## Tech Stack
- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** — <note any theme conventions, e.g. dark theme palette, exceptions>
- **<DB choice>** — <driver, file path or connection note>
- **Supabase Auth** — email/password login, JWT session cookies via `@supabase/ssr`
- **Vercel** — serverless deploy; <note any runtime constraints, e.g. ephemeral FS>

---

## Authentication

### How it works
- **Supabase Auth** (`@supabase/supabase-js` + `@supabase/ssr`) handles login/session
- Sessions are stored as cookies; `src/proxy.ts` reads them on every request
- User accounts managed in **Supabase Dashboard → Authentication → Users**
- To create or reset a user: https://supabase.com/dashboard/project/<project-id>/auth/users

### Route protection
| Route | Access |
|-------|--------|
| `/<protected routes>` | Requires login |
| All `/api/*` except noted | Requires login (401 if no session) |
| `/login` | Public |
| `/<public pages>` | Public |
| `/api/<public endpoints>` | Public |

### Key auth files
| File | Purpose |
|------|---------|
| `src/proxy.ts` | Route protection — Next.js proxy (replaces middleware.ts) |
| `src/lib/supabase/server.ts` | Server-side Supabase client (uses `cookies()`) |
| `src/lib/supabase/client.ts` | Browser-side Supabase client |
| `src/app/login/page.tsx` | Login form — `signInWithPassword` |
| `src/components/SignOutButton.tsx` | Client component — calls `supabase.auth.signOut()` |
| `src/app/api/auth/callback/route.ts` | Handles Supabase email confirmation redirects |

### Environment variables
| Variable | Where to find |
|----------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |

Both are set in `.env.local` and in Vercel production.

---

## What's Built

### Features
| Feature | Files |
|---------|-------|
| <Feature name> | `<primary file(s)>` |
| ... | ... |

### API Routes
| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/<route>` | GET, POST | Required | <purpose> |
| `/api/<public-route>` | POST | **Public** | <purpose> |

### Data Model
```
<table>:  id, <columns>, created_at
<table>:  id, <columns>, created_at
```
All tables created inline via `<method>` in `src/db/index.ts`. No migration files.
Seed data: `src/db/seed.ts` (<N> pre-seeded rows).

---

## Key Conventions
- All DB access via `src/db/index.ts` — exports `db` and all table references
- Monetary amounts stored as **cents** (integers), formatted with `formatDollars(cents)` in UI
- All internal pages use `export const dynamic = "force-dynamic"`
- All protected API routes call `createClient()` from `@/lib/supabase/server` and check `getUser()` — return 401 if no session
- <Domain-specific enum values, thresholds, or business rules go here>

---

## Known Limitations
- <Describe any architectural shortcuts taken for demo speed, e.g. ephemeral SQLite on Vercel>
- **Migration path:** <What to do when this limitation needs to be resolved, with specific steps>

---

## Deploying
```bash
git add -A && git commit -m "your message" && vercel --prod
```
<Any pre-deploy steps, e.g. commit the DB file so seed data is bundled.>

---

## Active Feature Streams

> Populated by the planning agent at the start of each sprint. Each sub-agent claims one stream, implements it, then updates its entry below with notes before marking complete.

| Status | Stream ID | Branch | Feature |
|--------|-----------|--------|---------|
| [ ] In Progress | `feat/<slug>-<hash>` | `feat/<slug>-<hash>` | <Feature name — one line description> |
| [ ] In Progress | `feat/<slug>-<hash>` | `feat/<slug>-<hash>` | <Feature name — one line description> |
| [ ] In Progress | `feat/<slug>-<hash>` | `feat/<slug>-<hash>` | <Feature name — one line description> |

### Stream Notes
#### `feat/<slug>-<hash>`
- **Implemented:** <What was built>
- **Shortcuts taken:** <What was simplified and why>
- **Deviations from spec:** <Anything not done per spec, and rationale>
---

## Implemented Features

> Moved here from Active Streams once `[x] Complete` and branches are merged.

| Feature | Priority | Files | Stream ID |
|---------|----------|-------|-----------|
| <Feature> | High | `<files>` | `feat/<slug>-<hash>` |

---

## Backlog (Remaining from SPEC.md)

> Not yet scheduled. Planning agent picks from here at the start of each sprint.

| Feature | Priority | What's Needed |
|---------|----------|---------------|
| **<Feature name>** | High | <Specific implementation note — enough for a sub-agent to start cold> |
| **<Feature name>** | Medium | <Specific implementation note> |
| **<Feature name>** | Low | <Specific implementation note> |
````