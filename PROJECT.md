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

### Step 2 — On Approval: Assign the Work Streams

For each approved feature:

1. Add a **feature entry** to the local `CLAUDE.md` under a `## Active Feature Streams` section. Each entry contains:
   - Feature name and short description
   - A unique stream identifier / hash (used by the sub-agent to mark completion)
   - Status: `[ ] In Progress`

---

### Step 3 — Generate Sub-Agent Prompts

Produce **3 self-contained prompts** — one per feature — ready to paste into 3 separate terminal tabs running independent Claude Code sessions.

Each prompt must include:

- **One-sentence goal** — what this agent is building
- **Relevant file paths** — which files to create or modify, and their roles
- **Ordered task list** — specific, atomic steps to implement the feature
- **Key constraints** — tech stack, amounts in dollars, no new deps unless necessary, auth pattern, etc.
- **Definition of done** — what "complete" looks like (e.g. "user can log a gig and see it in the dashboard")
- **Post-completion instruction** — once all tasks are done, the agent must:
  1. Commit all changes to `main` with a descriptive message referencing the feature
  2. Open the local `CLAUDE.md`, find its stream identifier, and write:
     - What was implemented
     - What shortcuts were taken and why
     - Any deviations from the spec and the rationale
     - Status updated to `[x] Complete`

---

### Step 4 — Integration, Testing, and Commit

Once all 3 sub-agents report back (status `[x] Complete` in `CLAUDE.md`):

1. Spin up **one build-check agent** that runs:
   ```bash
   npm run build && npm run typecheck
   ```
   If it passes, integration is assumed good. If it fails, fix errors before committing.
2. Once the build passes:
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
| Database | Supabase (Postgres) + Drizzle ORM — always |
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
<One sentence: what the app does and who it's for.>
Live URL: **<vercel URL once deployed>**

## Tech Stack
- Next.js 14 (App Router, TypeScript) · Tailwind CSS
- <DB choice + driver + file/connection note>
- Supabase Auth — email/password, JWT cookies via `@supabase/ssr`
- Vercel serverless deploy

## Key Conventions
- All DB access via `src/db/index.ts` — exports `db` + table refs
- Monetary amounts stored as **cents**; format with `formatDollars(cents)` in UI
- All internal pages: `export const dynamic = "force-dynamic"`
- Protected API routes: call `createClient()` + `getUser()` → 401 if no session
- <Domain-specific rule, e.g. enum values, thresholds>

## Active Feature Streams
| Status | Stream ID | Feature |
|--------|-----------|---------|
| [ ] In Progress | `feat/<slug>-<hash>` | <Feature — one line> |
| [ ] In Progress | `feat/<slug>-<hash>` | <Feature — one line> |
| [ ] In Progress | `feat/<slug>-<hash>` | <Feature — one line> |

## Implemented Features
| Feature | Priority | Files | Stream ID |
|---------|----------|-------|-----------|

## Backlog
| Feature | Priority | What's Needed |
|---------|----------|---------------|
| **<Feature name>** | High | <Enough for a sub-agent to start cold> |
| **<Feature name>** | Medium | <Specific implementation note> |
| **<Feature name>** | Low | <Specific implementation note> |
````
