> **Phase A · Bootstrap** — you, once. Next → [Phase B: Intake](2-INTAKE.md)

# Phase A — Bootstrap (one-time, name-free)

Get a working local copy of the template — **nothing here bakes in an app identity**, because the app has no name yet. Provisioning anything named (Git remote, Supabase project, Vercel project) waits until *after* Intake produces `APP_NAME`; doing it now would stamp the template's name ("agentic-scaffold") onto your app's cloud resources and commit your app onto the template's own repo. See [Phase C: Provision](3-PROVISION.md).

1. **Scaffold a fresh project from the template** into its own directory with its own clean git history — do **not** `git clone` (that carries the template's remote and history):
   ```bash
   npx degit Vikhyat-Chauhan/agentic-scaffold my-app   # dir name is temporary; the real name is set at Intake
   cd my-app
   git init && git add -A && git commit -m "Initial commit from agentic-scaffold template"
   ```
   No remote yet — the GitHub repo is created under `APP_NAME` in Phase C.

2. **Install dependencies and verify the toolchain is green** on the empty scaffold:
   ```bash
   npm install
   npm run typecheck && npm run lint && npm run test && npm run build
   ```
   All four must pass before you invest in Intake.

Walk away from Bootstrap with: a fresh local project on its own git history (no remote), dependencies installed, and a green local quality gate. **No Supabase, no Vercel, no GitHub repo yet** — those are named after the app, in Phase C.
