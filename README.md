# Agentic Scaffold

A reusable scaffold for driving rapid, parallel agentic development sprints with Claude Code — designed for maximum shipping velocity under time constraints.

---

## How It Works

A planning agent reads the project spec, selects parallelizable features, and spawns independent sub-agents to implement them concurrently. Each sub-agent owns one feature, implements it, and reports back before the next sprint begins.

---

## Repo Structure

```
CLAUDE.md         — Agent steering guide (stack, principles, directory map, backlog)
docs/SETUP.md     — Pre-sprint setup checklist (repo, Vercel link, green deploy)
docs/ORC.md       — Orchestrator playbook (Sprint 0 foundation + parallel sprint pattern)
docs/SPEC.md      — Spec template (populated at intake)
```

---

## Default Tech Stack

| Concern    | Choice                                   |
|------------|------------------------------------------|
| Framework  | Next.js (App Router, TypeScript)         |
| Frontend   | React + Tailwind CSS                     |
| Database   | Supabase + Drizzle ORM *(if needed)*     |
| Auth       | Supabase Auth — email/password *(if needed)* |
| Deployment | Vercel                                   |

---

## Sprint Workflow

1. **Setup** — clone, link Vercel, deploy green (`docs/SETUP.md`)
2. **Intake** — fill `docs/SPEC.md` and update `CLAUDE.md` with app name, backlog, DB decision
3. **Sprint 0** — one agent lays shared types, layout, and a thin working slice
4. **Sprint 1+** — 2–3 parallel agents, each owning one non-overlapping feature
5. **Deploy** — merge, `vercel --prod`, confirm live URL in `CLAUDE.md`

See `docs/ORC.md` for the full orchestrator playbook and sub-agent prompt template.

---

## Deploy

```bash
git add -A && git commit -m "your message" && vercel --prod
```
