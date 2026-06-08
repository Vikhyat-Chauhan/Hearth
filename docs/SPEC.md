# Spec: [App Name]

> [One-sentence description of the problem this app solves and who it's for.]

**Core Loop:** [The primary user journey the product must do well, end-to-end — e.g. "a user creates an invoice, sends it, and gets paid." Write this FIRST. Everything in the backlog should be part of this loop or directly support it.]

---

## Features

### P0 — Must Have
- [Feature]

### P1 — Should Have
- [Feature]

### P2 — Nice to Have
- [Feature]

---

## Data Model

| Entity | Key Fields |
|--------|------------|
| [Entity] | id, [field], [field] |

---

## Non-Functional Requirements

> Drives the frozen validation schemas and auth scaffold in Sprint 0.

- **Auth & ownership:** [Does it need accounts? Which entities are user-owned? Any roles? Write "none" if no auth.]
- **Validation rules:** [Per entity: required fields, formats, ranges, uniqueness. Money stored as cents (integers).]
- **Data integrity:** [Relationships and cascades that matter — e.g. "deleting a project deletes its tasks."]

---

## Stories

> One block per P0/P1 feature. P2 features are out of sprint scope — omit them.

### [Feature Name]
ENTRY: [URL or UI event that starts this flow — e.g. "user navigates to /items"]
FLOW:
  1. [First user action, ≤8 words]
  2. [Second user action, ≤8 words]
  3. [Third user action — omit if not needed]
EXIT:  [The exact visible UI or data state that confirms success — one sentence]
ACCEPTANCE CRITERIA:
  - [Happy path: the row is persisted and survives a reload]
  - [Failure path: invalid input is rejected with a clear error and persists nothing]
  - [Ownership, if applicable: a user sees only their own rows]

---

## Tech Stack

*(Leave blank to use the scaffold defaults in CLAUDE.md.)*

| Concern    | Choice |
|------------|--------|
| Framework  |        |
| Database   |        |
| Auth       |        |

---

## Success Criteria

- [ ] [What the user can do or see when this ships]
- [ ] The Core Loop works end-to-end with real persistence.
- [ ] Every P0/P1 feature passes its Quality Gate (typecheck + lint + test + build + smoke).
