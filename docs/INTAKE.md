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

---

Once `docs/SPEC.md` is written, **launch two agents in parallel**:

- **Agent 1** → `docs/DB_FORK.md` (fast: one decision, ~60 seconds; writes result to `CLAUDE.md`)
- **Agent 2** → `docs/LOAD.md` (starts non-DB portions immediately; picks up DB decision from `CLAUDE.md` once Agent 1 writes it)
