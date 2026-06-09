> **Phase C · Provision** — you, once, right after Intake. Prev ← [Intake](2-INTAKE.md) · Next → [Sprints](4-ORCHESTRATION.md)

# Phase C — Provision (one-time, named)

Now that Intake has set `APP_NAME` (in `package.json` and `CLAUDE.md`), stand up the cloud resources **under that name**. This is everything that was wrong to do before a name existed — the GitHub repo, the Supabase project, and the Vercel project all inherit `APP_NAME`, not "agentic-scaffold". Run these in order; each is idempotent.

1. **GitHub repo — create it under `APP_NAME` and push.** The local project is still on its fresh, remote-less history from Bootstrap. Create the repo and set it as origin:
   ```bash
   gh repo create "$APP_NAME" --private --source=. --remote=origin --push
   ```
   Confirm `git remote -v` points at `…/APP_NAME.git` — **not** agentic-scaffold. From here, all commits land on the app's own repo.

2. **Supabase project — provision under `APP_NAME` and write env (fully unattended).** One-time prerequisite — drop in a Personal Access Token:
   ```bash
   cp .env.provision.example .env.provision
   # paste a PAT from https://supabase.com/dashboard/account/tokens into SUPABASE_ACCESS_TOKEN
   ```
   Then run:
   ```bash
   npm run provision:supabase
   ```
   This script (`scripts/provision-supabase.mjs`) drives the **Supabase Management API** end-to-end with zero prompts and no new dependencies: it resolves your org (auto-picked if you have one), creates a project named `APP_NAME` (generating + saving a DB password back into `.env.provision`), polls until it is `ACTIVE_HEALTHY`, fetches the API keys and pooler connection strings, and writes this scaffold's canonical keys into `.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ACCESS_TOKEN` (service_role), `DATABASE_URL` (transaction pooler, 6543), `DIRECT_URL` (session pooler, 5432) — without touching local-only keys. It is idempotent: a re-run reuses the existing project. `.env.provision` is gitignored; never commit it. *(The first migration runs after Sprint 0 generates `src/db/schema.ts` — `npm run db:generate && npm run db:migrate`. There is no schema to migrate yet.)*

3. **Vercel project — link under `APP_NAME` and deploy.** Using the Vercel Skill, link a **new** Vercel project named `APP_NAME` (do not reuse an agentic-scaffold project), copy the five canonical keys the provision script wrote to `.env.local` into the Vercel project's environment — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ACCESS_TOKEN` (service_role), `DATABASE_URL`, `DIRECT_URL` — and run a Production deployment. Confirm the live URL builds **green** and paste it into `CLAUDE.md` (the `Live URL:` line).

4. **CI — confirm it runs.** `.github/workflows/ci.yml` runs typecheck + lint + test + build on every pull request and on push to `main`. Open a throwaway branch, push it, and confirm the checks go green on the new repo.

Walk away from Provision with: a GitHub repo named `APP_NAME` holding your commits, a Supabase project named `APP_NAME` with keys in `.env.local`, a green Vercel Production deploy whose URL is in `CLAUDE.md`, and CI passing — all carrying the app's identity, none carrying the template's. Now start Sprint 0.
