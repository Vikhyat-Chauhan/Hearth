> **Phase A · Setup** — you, once. Next → [Phase B: Intake](2-INTAKE.md)

# Phase A — Setup (one-time, idempotent)

One-time project setup. Safe to re-run — every step is idempotent. Do this before Intake so the toolchain, database, deploy, and CI are all green before any feature work begins.

1. Install dependencies: `npm install`. Confirm the toolchain runs: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` all pass on the empty scaffold.

2. Provision a Supabase project, pull env vars into `.env.local` (see `.env.example`), and confirm the keys are set. Generate and run the first Drizzle migration once a schema exists: `npm run db:generate && npm run db:migrate`.

3. Link Vercel and do a Production deployment using the Vercel Skill. Confirm the live URL builds **green** and paste it into `CLAUDE.md`.

4. Confirm CI runs: the workflow in `.github/workflows/ci.yml` should run typecheck + lint + build + test on every pull request. Push a branch and confirm the checks go green.

Walk away from setup with: a cloned template, dependencies installed, a provisioned database, a green deploy live, and CI passing.
