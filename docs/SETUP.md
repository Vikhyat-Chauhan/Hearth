# Sprint Workflow

The job: turn an ambiguous spec into a **live, demoable product** as fast as possible.
Optimize for "what can I point at on screen," not completeness.

---

## Phase A — Before the Clock (one-time, idempotent)

Do ALL of this **before** the interview — done live it only burns minutes and shows no judgment.

1. Push this scaffold to a fresh repo:
   ```bash
   gh repo create <name> --public --source=. --remote=origin --push
   ```
2. Link Vercel and deploy the empty scaffold:
   ```bash
   vercel link && vercel --prod
   ```
3. Confirm the live URL builds **green**. Paste it into `CLAUDE.md`.
4. *(Optional)* Pre-provision a Supabase project and pull env vars — **only** if you expect
   hosted persistence. You can skip this and add it later.
   ```bash
   vercel env pull .env.local
   ```

Walk in with: a cloned template, dependencies installed, and a green deploy already live.

---

## Phase B — Spec Intake (T=0)

Determine the spec source, in priority order:

1. **File path provided?** → Read it.
2. **Inline text provided?** → Treat it as the spec.
3. **Nothing provided?** → Ask one question at a time:
   - Q1. App name?
   - Q2. Problem it solves, in one sentence?
   - Q3. Features by priority — P0 / P1 / P2?
   - Q4. Main entities and key fields?
   - Q5. What can the user do or see when it ships?

Extract and hold: `APP_NAME`, `DESCRIPTION`, `BACKLOG` (P0→P1→P2), `TECH_STACK` (optional override).

Write them into `docs/SPEC.md`. **Fill the Demo Target line first** — the one sentence you'll
point at on screen at minute 30. Anything that doesn't serve it is a candidate to cut.

---

## Phase C — The DB Fork (decide in 60 seconds, out loud)

| Situation | Call |
|-----------|------|
| Single-user or ephemeral demo | **No database.** React state / in-memory. Delete the Supabase/Drizzle/auth principles from `CLAUDE.md`. |
| Persistence is the point AND must survive on the live URL | **Supabase** (pre-provisioned in Phase A). Apply the DB principles. |
| Unsure | **Default to no database.** A clean in-memory demo beats a half-wired Postgres one. |

Record the decision in `CLAUDE.md` so every agent inherits it.

---

## Phase D — Load the Spec into the Template

1. Set `APP_NAME` in `package.json`.
2. Populate `CLAUDE.md`: description, Backlog (P0→P1→P2), Tech Stack (or keep defaults),
   the DB decision, and any domain rules.
3. Commit and push:
   ```bash
   git add -A && git commit -m "chore: load <APP_NAME> spec" && git push
   ```

Then hand off to `docs/ORC.md` to run sprints — **Sprint 0 (foundation) first**, parallel after.
