> **Phase B · Intake** — agent at T=0. Prev ← [Setup](1-SETUP.md) · Next → [Sprints](3-ORCHESTRATION.md)

# Phase B — Spec Intake (T=0)

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

**Scope rule:** Each backlog item must be end-to-end completable in isolation.
For every P0/P1 item ask: "Can a user navigate to this, see real (mock) data, and interact
with it without a crash?" If not, cut scope *within* the feature — remove a column, drop a
tab, stub a button — until the answer is yes. A smaller feature that works beats a larger
one that doesn't.

**Story extraction — no new user questions; infer from the spec:**
For every P0 and P1 feature, fill the `## Stories` section in `docs/SPEC.md` using this reasoning:

- **ENTRY:** What URL does a user navigate to? (Create features → `/[plural-noun]/new` or a modal on the list page. View features → `/[plural-noun]`.)
- **FLOW:** What are the 2–4 physical actions the user takes (navigate, fill, click, observe)?
- **EXIT:** What does the user see — or what data row exists — the instant the feature succeeds?

If the spec already contains flow details, copy them verbatim. If not, infer the obvious happy path. Do NOT ask the user clarifying questions. Fill with best inference and move on — the sub-agent refines, it doesn't invent.

**DB:** Always Supabase (Postgres). Assume already provisioned; `.env.local` has the keys.

---

**Write to CLAUDE.md (same pass — no second agent):**
After writing `docs/SPEC.md`, populate `CLAUDE.md` in the same turn:
1. Set `APP_NAME` in `package.json`.
2. Fill CLAUDE.md: description, Backlog (P0→P1→P2), Tech Stack, domain rules.
3. Copy `## Stories` from `docs/SPEC.md` into `CLAUDE.md` verbatim, immediately after `## Backlog`. P2 items have no story block — leave as one-liners.

Then hand off to the user to start Sprint 0.
