> **Phase B · Intake** — agent at the start. Prev ← [Bootstrap](1-BOOTSTRAP.md) · Next → [Provision](3-PROVISION.md)

# Phase B — Spec Intake

Determine the spec source, in priority order:

1. **File path provided?** → Read it.
2. **Inline text provided?** → Treat it as the spec.
3. **Nothing provided?** → Ask one question at a time:
   - Q1. App name?
   - Q2. Problem it solves, in one sentence? Who is it for?
   - Q3. Features by priority — P0 / P1 / P2?
   - Q4. Main entities and key fields?
   - Q5. What can the user do or see when it ships?
   - Q6. Does it need user accounts / auth? Any roles or per-user data ownership?

Extract and hold: `APP_NAME`, `DESCRIPTION`, `BACKLOG` (P0→P1→P2), `TECH_STACK` (optional override), `AUTH_NEEDED` (yes/no + roles).

Write them into `docs/SPEC.md`. **Fill the Core Loop line first** — the one primary user journey the product must do well end-to-end (e.g. "a user creates an invoice, sends it, and gets paid"). Everything in the backlog should either *be* part of the Core Loop or directly support it.

**Scope rule:** Each backlog item must be a complete, real vertical slice — not a façade. For every P0/P1 item ask: "When a user does this, is the result *persisted*, *validated*, *error-handled*, and *covered by a test on the happy path*?" If a feature is too big to deliver that way in one stream, **split it** into smaller features that each clear the bar — don't fake it with mock data or a dead button. A smaller feature that genuinely works beats a larger one that's hollow.

**Non-functional requirements — capture explicitly:**
For the spec as a whole, write down:
- **Auth & ownership:** Does it need accounts? Which entities are user-owned (a user only sees their own rows)? Any roles?
- **Validation rules:** Per entity, the constraints that must hold (required fields, formats, ranges, uniqueness, money-as-cents).
- **Data integrity:** Relationships and cascades that matter (e.g. deleting X should/should not delete Y).

These go in the **Non-Functional Requirements** section of `docs/SPEC.md` and drive the frozen validation schemas in Sprint 0.

**Story extraction — no new user questions; infer from the spec:**
For every P0 and P1 feature, fill the `## Stories` section in `docs/SPEC.md` using this reasoning:

- **ENTRY:** What URL does a user navigate to? (Create features → `/[plural-noun]/new` or a modal on the list page. View features → `/[plural-noun]`.)
- **FLOW:** What are the 2–4 physical actions the user takes (navigate, fill, click, observe)?
- **EXIT:** What does the user see — or what data row exists — the instant the feature succeeds?
- **ACCEPTANCE CRITERIA:** The testable conditions that must hold for the feature to be done — including the unhappy paths (e.g. "submitting an empty title shows a validation error and persists nothing"; "the row is saved to the DB and survives a reload"). These become the feature's test.

If the spec already contains flow details, copy them verbatim. If not, infer the obvious happy path and the obvious validation/error cases. Do NOT ask the user clarifying questions about flows. Fill with best inference and move on — the sub-agent refines, it doesn't invent.

**DB:** Always Supabase (Postgres) via Drizzle. The project is provisioned in [Phase C: Provision](3-PROVISION.md) — right after this Intake — under `APP_NAME`, so `.env.local` will hold the keys before any feature work. In-scope features persist for real — never mock data that's in scope.

---

**Write to CLAUDE.md (same pass — no second agent):**
After writing `docs/SPEC.md`, populate `CLAUDE.md` in the same turn:
1. Set `APP_NAME` in `package.json`.
2. Fill CLAUDE.md: description, Backlog (P0→P1→P2), Tech Stack, domain rules, and whether auth is needed (so Sprint 0 lays down the auth scaffold).
3. Copy `## Stories` (including Acceptance Criteria) from `docs/SPEC.md` into `CLAUDE.md` verbatim, immediately after `## Backlog`. P2 items have no story block — leave as one-liners.

Then hand off to the user to run [Phase C: Provision](3-PROVISION.md) — which creates the GitHub repo, Supabase project, and Vercel project under `APP_NAME` — before Sprint 0.
