# Interview Day — Prompt Templates

## Read this when: the spec just landed and you have 30 minutes on the clock

---

## Step 1: Plan mode prompt (first thing, ~2 min)

Paste this into Claude Code in Plan mode immediately after reading the spec:

```
I have 30 minutes to make as much progress as possible on this spec.
I need you to:
1. Break this into 3 parallel workstreams (backend/data, frontend/UI, auth+deploy)
2. List concrete deliverables for each stream that can be done in 30 min
3. Identify any hard dependencies (what must be done before what)
4. Flag the 2-3 things that would be most impressive to show at the end

Spec:
[PASTE SPEC HERE]
```

---

## Step 2: Agent A prompt — Backend (paste into Tab 1)

```
You are Agent A. Your scope: data model, API routes, and backend logic.
Do NOT touch files in src/app/ or src/components/ — those belong to Agent B.

Your tasks:
1. Create Supabase schema (see agent_docs/supabase_setup.md for templates)
2. Build API routes in src/api/ or src/app/api/
3. Commit each completed piece: git add . && git commit -m "feat(backend): ..."

Start now. If blocked, document assumption in a comment and continue.
```

---

## Step 3: Agent B prompt — Frontend (paste into Tab 2)

```
You are Agent B. Your scope: Next.js pages, components, and UI.
Do NOT touch files in src/api/, supabase/, or .env — those belong to other agents.

Your tasks:
1. Build the main pages (dashboard, landing, key feature views)
2. Use shadcn/ui components — Button, Card, Input, Toast are already available
3. Use placeholder/mock data if APIs aren't ready yet — we'll wire up later
4. Commit each page: git add . && git commit -m "feat(frontend): ..."

Prioritize visual progress — a working UI with mock data is better than waiting for real APIs.
```

---

## Step 4: Agent C prompt — Auth + Deploy (paste into Tab 3)

```
You are Agent C. Your scope: auth, env wiring, and deployment.

Your tasks:
1. Set up Supabase Auth (magic link is fastest — see agent_docs/supabase_setup.md)
2. Create .env.local with all required vars (see agent_docs/stack_defaults.md)
3. Wire env vars into Vercel: vercel env add ...
4. Get a live deploy URL with: vercel --prod
5. Commit: git add . && git commit -m "feat(auth+deploy): ..."

Goal: have a public URL live within the first 15 minutes, even if it's just the landing page.
```

---

## Mid-session check (15 min mark)

```
Quick status check:
- Agent A: what's done, what's next?
- Agent B: what's live in UI, what's blocked?
- Agent C: is there a deployed URL yet?

Identify any integration gaps and assign fixing them.
```

---

## Final 5 min — Polish prompt

```
We have 5 minutes left. Focus on:
1. Make sure npm run build passes
2. Push all commits and ensure Vercel has the latest deploy
3. Wire up the most important frontend→backend connection if not done
4. Add a README.md with: what this does, the live URL, and what you'd build next
```

---

## If the spec is totally unknown — cold start prompt

```
I just received this spec and have 30 minutes. Without writing any code yet,
help me answer:
1. What is the MVP core loop? (the one thing that makes this useful)
2. What's the fastest stack to build this? (default to Next.js + Supabase + Vercel)
3. What can I cut entirely and still have a demo-able product?
4. What should I build first to have something deployed in 10 minutes?
```
