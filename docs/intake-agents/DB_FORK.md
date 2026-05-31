# Phase C — DB Decision (fast, ~60 seconds)

Read `docs/SPEC.md`. Make **one** database decision and write it to `CLAUDE.md`. This runs in parallel with `docs/LOAD.md` — finish fast.

---

## Decision Tree

**Does any P0 or P1 feature require persisted data across sessions or users?**

- **No** → `in-memory, no DB`
- **Yes, but simple key-value or small JSON** → `in-memory, no DB` (stub with mock data)
- **Yes, relational data with real users** → `Supabase (Postgres)`

When in doubt, default to **in-memory**. A working mock beats a broken integration.

---

## What to Write

Open `CLAUDE.md` and fill the `DB decision:` line:

```
DB decision: in-memory, no DB
```

or

```
DB decision: Supabase (Postgres) — provisioned, env vars in .env.local
```

That is the only line you touch in `CLAUDE.md`. Do not edit anything else.

---

## Rules

- One decision, no discussion. Pick and write it.
- If Supabase: assume the project is already provisioned and `.env.local` has `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Do not provision it yourself.
- Do not write any code. This phase is documentation only.
