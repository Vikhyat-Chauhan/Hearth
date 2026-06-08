# agentic-scaffold

A Next.js + Supabase template for turning a spec into a **usable, high-quality, commercial-grade app** — fast — by running 2–3 AI coding agents in parallel without them colliding on the same files. Speed comes from parallelism and a shared playbook, not from cutting corners: every feature ships persisted, validated, error-handled, and tested.

Live URL: **(paste after first deploy)**

## Pipeline

Run the phases in order. Each links its playbook; the tag says who drives it and when.

| # | Phase | Playbook | Driver |
|---|-------|----------|--------|
| A | Setup | [docs/1-SETUP.md](docs/1-SETUP.md) | you, once |
| B | Intake | [docs/2-INTAKE.md](docs/2-INTAKE.md) | intake agent |
| C | Sprints | [docs/3-ORCHESTRATION.md](docs/3-ORCHESTRATION.md) | orchestrator agent → Sprint 0 (solo), then Sprint 1+ (parallel) |

## Artifacts

Things you fill in (unnumbered on purpose — they're not steps to run):

- **[docs/SPEC.md](docs/SPEC.md)** — the app spec. Written during Intake.
- **[CLAUDE.md](CLAUDE.md)** — shared memory across every agent terminal: stack, rules, file map, backlog, stories, quality bar, handoff contract. The integration point.

## How to run it

The load-bearing mechanic: **several terminals open in this repo, each running `claude`** — one orchestrator (advisor, edits only `CLAUDE.md`) plus the workers. They stay coordinated through `CLAUDE.md`, never by talking to each other. **Never fan out from a cold start** — stay solo through Sprint 0 so the shared contracts (types, schema, validation, UI primitives) land first; go parallel only after.

| When | Terminals | What you do |
|------|-----------|-------------|
| **Phase A** — Setup | — | One-time: install deps, provision Supabase + run the first migration, deploy green, confirm CI. See [1-SETUP](docs/1-SETUP.md). |
| **Phase B** — Intake | 1, solo | `claude` → "Follow docs/2-INTAKE.md. Spec: \<paste\>". Fills `docs/SPEC.md` + `CLAUDE.md`. Review the scope and acceptance criteria it produced. |
| **Sprint 0** — Foundation & Contracts | 1, solo | "Read CLAUDE.md. Run Sprint 0 per docs/3-ORCHESTRATION.md." Navbar + P0 stub pages + `types.ts` + `schema.ts` + validation schemas (+ auth scaffold if needed). Commit. **The contracts are now frozen.** |
| **Sprint 1+** — parallel | orchestrator + 2–3 workers | See below. |

**Sprint 1+ loop:**
1. **Orchestrator terminal** → "You are the orchestrator. Follow docs/3-ORCHESTRATION.md. Propose this sprint's 2–3 non-overlapping features and emit a prompt for each." Approve its picks; it registers them in `CLAUDE.md` → Active Feature Streams and prints one worker prompt per stream.
2. **Worker terminals** (one feature each) → paste the matching emitted prompt. They run at once — no collisions, because picks share no files and the contracts in `types.ts` / `schema.ts` / validation are frozen.
3. Each worker builds its full vertical slice (real persistence, validation, error/loading/empty states, a test for the core path), runs the **Quality Gate**, then commits and updates `CLAUDE.md` itself (stream → complete, adds Implemented Features row).
4. **Quality Gate** → ask the orchestrator for a gate prompt per stream; paste each back into its worker terminal. It runs typecheck + lint + build + test, hits the route, confirms the acceptance criteria, reports PASS/FAIL.
5. **Repeat** for the next batch until the Core Loop and the rest of the backlog are complete.

**You** are the integration point: read `CLAUDE.md`, approve picks, copy prompts between terminals, make the product calls.

## Start here

Cold start → do [Phase A](docs/1-SETUP.md). Spec in hand → jump to [Phase B](docs/2-INTAKE.md).
