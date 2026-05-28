# Project Context
 
This is a time-constrained agentic build session. Bias toward shipping visible, working features fast. Imperfect but deployed beats perfect but unfinished.
 
## Stack (drop-in defaults)
- **Frontend**: Next.js 14+ (App Router), Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes or FastAPI (Python) depending on spec
- **DB**: Supabase (Postgres + auth + storage) unless spec says otherwise
- **Deploy**: Vercel (frontend/full-stack) or Railway (FastAPI)
- **Auth**: Supabase Auth or Clerk
## Commands
```
npm run dev        # local dev
npm run build      # production build
vercel --prod      # deploy
gh pr create       # open PR
```
 
## Parallel agent rules
- Each agent owns one domain: never edit files outside your scope
- Commit format: `type(scope): description` — e.g. `feat(auth): add login page`
- Branch per feature: `git checkout -b feat/<name>`
- Run `npm run build` before committing
## Decision rules
- If blocked > 2 min, make a reasonable assumption and document it in a comment
- Prefer working stub over perfect implementation — we can iterate
- Use `// TODO:` comments for deferred work, never delete a stub silently
- Always deploy to a real URL before considering a feature done
## Reference docs
Read these only when relevant — do not read all at once:
- `agent_docs/parallel_workflow.md` — how to split and coordinate parallel tasks
- `agent_docs/stack_defaults.md` — full stack setup, env vars, boilerplate
- `agent_docs/deploy_checklist.md` — deploy steps for Vercel + Railway
- `agent_docs/supabase_setup.md` — Supabase schema and auth setup patterns
 