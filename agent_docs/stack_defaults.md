# Stack Defaults — Fast Project Setup

## Read this when: spinning up a new project from scratch

## 1-minute Next.js + Supabase + Vercel scaffold

```bash
# Bootstrap
npx create-next-app@latest my-app --typescript --tailwind --app --src-dir --import-alias "@/*"
cd my-app

# UI components
npx shadcn@latest init -d
npx shadcn@latest add button card input label toast

# Supabase client
npm install @supabase/supabase-js @supabase/ssr

# Git + deploy
git init && git add . && git commit -m "chore: init"
gh repo create my-app --public --source=. --push
vercel --prod
```

## Supabase env vars (paste into .env.local)
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## FastAPI alternative (if spec calls for Python backend)
```bash
pip install fastapi uvicorn supabase python-dotenv
# Entry: main.py
# Deploy: Railway (connect GitHub repo, auto-detect)
```

## Supabase client singleton (src/lib/supabase.ts)
```ts
import { createBrowserClient } from '@supabase/ssr'
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

## Auth pattern (server-side, App Router)
```ts
// src/app/api/auth/route.ts — Supabase handles OAuth redirects
// Protect routes: check session in layout.tsx using supabase.auth.getSession()
```

## Folder structure to tell agents about
```
src/
  app/           ← Next.js pages (Agent B owns this)
  components/    ← Shared UI components (Agent B owns this)
  lib/           ← Supabase client, utils (Agent C sets up, others read-only)
  api/           ← API routes (Agent A owns this)
supabase/
  migrations/    ← SQL schema (Agent A owns this)
```

## Common shadcn components to reach for
- `Button`, `Card`, `Input`, `Label` — always available after init
- `DataTable` — for list views
- `Dialog` — for modals
- `Toast` — for success/error feedback
