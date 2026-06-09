> **Phase C · Provision** — you, once, right after Intake. Prev ← [Intake](2-INTAKE.md) · Next → [Sprints](4-ORCHESTRATION.md)

# Phase C — Provision (one-time, named)

Now that Intake has set `APP_NAME` (in `package.json` and `CLAUDE.md`), stand up the cloud resources **under that name**. This is everything that was wrong to do before a name existed — the GitHub repo, the Supabase project, and the Vercel project all inherit `APP_NAME`, not "agentic-scaffold". Run these in order; each is idempotent.

1. **GitHub repo — create it under `APP_NAME` and push.** The local project is still on its fresh, remote-less history from Bootstrap. Create the repo and set it as origin:
   ```bash
   gh repo create "$APP_NAME" --private --source=. --remote=origin --push
   ```
   Confirm `git remote -v` points at `…/APP_NAME.git` — **not** agentic-scaffold. From here, all commits land on the app's own repo.

2. **Supabase project — provision under `APP_NAME` and pull env.** Create a new Supabase project named `APP_NAME`, then pull its keys into `.env.local` (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `DIRECT_URL`. Confirm the keys are set. *(The first migration runs after Sprint 0 generates `src/db/schema.ts` — `npm run db:generate && npm run db:migrate`. There is no schema to migrate yet.)*

3. **Vercel project — link under `APP_NAME` and deploy.** Using the Vercel Skill, link a **new** Vercel project named `APP_NAME` (do not reuse an agentic-scaffold project), set the same env vars there, and run a Production deployment. Confirm the live URL builds **green** and paste it into `CLAUDE.md` (the `Live URL:` line).

4. **CI — confirm it runs.** `.github/workflows/ci.yml` runs typecheck + lint + build + test on every pull request. Open a throwaway branch, push it, and confirm the checks go green on the new repo.

Walk away from Provision with: a GitHub repo named `APP_NAME` holding your commits, a Supabase project named `APP_NAME` with keys in `.env.local`, a green Vercel Production deploy whose URL is in `CLAUDE.md`, and CI passing — all carrying the app's identity, none carrying the template's. Now start Sprint 0.
