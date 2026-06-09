# agentic-scaffold

A Next.js + Supabase template for turning a spec into a **usable, high-quality, commercial-grade app** — fast — by running 2–3 AI coding agents in parallel without them colliding on the same files. Speed comes from parallelism and a shared playbook, not from cutting corners: every feature ships persisted, validated, error-handled, and tested.

Live URL: **(paste after first deploy)**

## Pipeline

Run the phases in order. Each links its playbook; the tag says who drives it and when.

| # | Phase | Playbook | Driver |
|---|-------|----------|--------|
| A | Bootstrap | [docs/1-BOOTSTRAP.md](docs/1-BOOTSTRAP.md) | you, once — name-free |
| B | Intake | [docs/2-INTAKE.md](docs/2-INTAKE.md) | intake agent — produces `APP_NAME` |
| C | Provision | [docs/3-PROVISION.md](docs/3-PROVISION.md) | you, once — repo + Supabase + Vercel under `APP_NAME` |
| D | Sprints | [docs/4-ORCHESTRATION.md](docs/4-ORCHESTRATION.md) | orchestrator agent → Sprint 0 (solo), then Sprint 1+ (parallel) |

Cloud resources (Git remote, Supabase, Vercel) are created in **Phase C**, *after* Intake names the app — never in Bootstrap. That keeps the template's identity off your app's repo and cloud projects.

## Artifacts

Things you fill in (unnumbered on purpose — they're not steps to run):

- **[docs/SPEC.md](docs/SPEC.md)** — the app spec. Written during Intake.
- **[CLAUDE.md](CLAUDE.md)** — shared memory across every agent terminal: stack, rules, file map, backlog, stories, quality bar, handoff contract. The integration point.

## How to run it

The load-bearing mechanic: **several terminals open in this repo, each running `claude`** — one orchestrator (advisor, edits only `CLAUDE.md`) plus the workers. They stay coordinated through `CLAUDE.md`, never by talking to each other. **Never fan out from a cold start** — stay solo through Sprint 0 so the shared contracts (types, schema, validation, UI primitives) land first; go parallel only after.

| When | Terminals | What you do |
|------|-----------|-------------|
| **Phase A** — Bootstrap | — | One-time, name-free: `degit` the template into a fresh repo, install deps, confirm the local quality gate is green. No cloud resources yet. See [1-BOOTSTRAP](docs/1-BOOTSTRAP.md). |
| **Phase B** — Intake | 1, solo | `claude` → "Follow docs/2-INTAKE.md. Spec: \<paste\>". Fills `docs/SPEC.md` + `CLAUDE.md`, sets `APP_NAME`. Review the scope and acceptance criteria it produced. |
| **Phase C** — Provision | — | One-time, under `APP_NAME`: create the GitHub repo, the Supabase project (one command — `npm run provision:supabase` generates `.env.local`, never committed), and the Vercel project (one command — `npm run provision:vercel` links it, pushes env, deploys, and writes the Live URL into `CLAUDE.md`), then confirm CI. See [3-PROVISION](docs/3-PROVISION.md). |
| **Sprint 0** — Foundation & Contracts | 1, solo | "Read CLAUDE.md. Run Sprint 0 per docs/4-ORCHESTRATION.md." Navbar + P0 stub pages + `types.ts` + `schema.ts` + validation schemas (+ auth scaffold if needed). Commit. **The contracts are now frozen.** |
| **Sprint 1+** — parallel | orchestrator + 2–3 workers | See below. |

**Sprint 1+ loop:**
1. **Orchestrator terminal** → "You are the orchestrator. Follow docs/4-ORCHESTRATION.md. Propose this sprint's 2–3 non-overlapping features and emit a prompt for each." Approve its picks; it registers them in `CLAUDE.md` → Active Feature Streams and prints one worker prompt per stream.
2. **Worker terminals** (one feature each) → paste the matching emitted prompt. They run at once — no collisions, because picks share no files and the contracts in `types.ts` / `schema.ts` / validation are frozen.
3. Each worker builds its full vertical slice (real persistence, validation, error/loading/empty states, a test for the core path), runs the **Quality Gate**, then commits and updates `CLAUDE.md` itself (stream → complete, adds Implemented Features row).
4. **Quality Gate** → ask the orchestrator for a gate prompt per stream; paste each back into its worker terminal. It runs typecheck + lint + test + build, hits the route, confirms the acceptance criteria, reports PASS/FAIL.
5. **Repeat** for the next batch until the Core Loop and the rest of the backlog are complete.

**You** are the integration point: read `CLAUDE.md`, approve picks, copy prompts between terminals, make the product calls.

## Start here

Cold start → do [Phase A: Bootstrap](docs/1-BOOTSTRAP.md). Spec in hand → jump to [Phase B: Intake](docs/2-INTAKE.md), then [Phase C: Provision](docs/3-PROVISION.md).
