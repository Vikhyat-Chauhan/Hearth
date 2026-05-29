# Agentic Scaffold

A reusable scaffold for driving rapid, parallel agentic development sprints with Claude Code — designed for maximum shipping velocity under time constraints.

---

## How It Works

A planning agent reads the project spec, selects parallelizable features, and spawns independent sub-agents to implement them concurrently. Each sub-agent owns one feature branch, implements it, and reports back before branches are merged and deployed.

---

## Repo Structure

```
SPEC.md         — Project spec (populated at sprint start)
PROJECT.md      — Sprint workflow & agent orchestration design
CLAUDE.md       — Session context & agent steering playbook
```

---

## Default Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Frontend | React + Tailwind CSS |
| Database | Supabase (Postgres) + Prisma |
| Auth | Supabase Auth — email/password |
| Deployment | Vercel |

---

## Sprint Workflow

1. Planning agent reads `SPEC.md`, selects 3 parallelizable features
2. Creates a Git branch per feature (`feat/<slug>-<hash>`)
3. Generates a self-contained prompt for each sub-agent
4. Sub-agents implement and update `CLAUDE.md` on completion
5. Integration sub-agents verify UI, data flow, and build health
6. Merge, commit, deploy to Vercel

See `PROJECT.md` for the full repeating sprint pattern and `CLAUDE.md` for agent steering guidance.

---

## Deploy

```bash
git add -A && git commit -m "your message" && vercel --prod
```
