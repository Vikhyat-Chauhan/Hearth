# Contributing to Hearth

Thanks for helping improve Hearth. This guide covers local setup, conventions, and the
checks every change must pass.

## Getting started

Follow the **Quick start** in the [README](README.md) to install dependencies, copy
`.env.example` to `.env.local`, run migrations, and start the dev server. For how the code
is organized, read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Branching & commits

- Branch off `main`; open a pull request back into `main`.
- Write imperative, scoped commit subjects matching the existing history, e.g.
  `Auth: launch Google sign-in from CTAs`, `Household: leave / delete / transfer`.
- Keep each PR focused on one feature or fix.

## Quality gate

Run the full gate before every commit and PR — CI runs the same checks:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

A change is not ready to merge until all four pass.

## Tests

- Tests live in `src/test/` and run on [Vitest](https://vitest.dev) (`npm run test`, or
  `npm run test:watch` while iterating).
- Every feature ships a test for its core path **plus at least one failure case** (e.g.
  invalid input rejected, unauthorized access blocked).

## Pull request checklist

Mirror the project's Definition of Done before requesting review:

- [ ] In-scope data persists to the real DB through `src/db/index.ts` (survives a reload).
- [ ] Every mutation validates input with the entity's zod schema; invalid input is
      rejected with a clear error.
- [ ] Async UI renders loading, empty, and error states; API failures return a structured
      error, not a raw 500.
- [ ] User-owned entities are auth-protected and query-scoped to the current user's
      household; roles are enforced in the API, not just the UI.
- [ ] A test covers the happy path and at least one failure case.
- [ ] The quality gate passes.

## Dependencies

Avoid adding new npm dependencies — exhaust the existing packages first. If one is truly
necessary, call it out explicitly in the PR description and get sign-off.

## Reporting security issues

Do **not** open a public issue for a vulnerability. Follow the
[Security Policy](SECURITY.md).
