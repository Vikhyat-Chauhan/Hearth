# Hearth

A shared-household app for students and roommates. The main roommate creates a household,
invites the others by code, and assigns recurring chores that show up on everyone's Google
Calendar. Hearth also covers an announcements board, a shared shopping list, utilities &
bills tracking, and Splitwise-style expense splitting.

**Live:** https://hearth-ruby-eight.vercel.app

![Hearth sign-in](./hearth-login.png)

## Features

- **Google sign-in** — one consent grants both login and Google Calendar access.
- **Households** — create one (you become admin), invite roommates by code, join, leave,
  transfer admin, or delete. A user can belong to several households and switch between them.
- **Chores** — the admin assigns single or shared recurring chores (RFC 5545 RRULE).
  Members view their upcoming occurrences and mark them done (honor system; for shared
  chores, any one assignee completing it counts for everyone).
- **Two-way Google Calendar sync** — chores write recurring events to each connected
  assignee's calendar; changes made in Google flow back via a webhook. Members can connect
  Google later and have existing chores backfilled.
- **Announcements board** — post to the household (optionally anonymously).
- **Shared shopping list** — add and check off items.
- **Bills** — track utilities and due dates, mark paid.
- **Expenses** — Splitwise-style splitting with settlements; amounts stored as integer cents.

## Tech stack

| Concern    | Choice                                                            |
|------------|-------------------------------------------------------------------|
| Framework  | Next.js (App Router, TypeScript)                                 |
| Frontend   | React + Tailwind CSS                                             |
| Database   | Supabase (Postgres) + Drizzle ORM                               |
| Auth       | Google OAuth via Supabase Auth (Sign in with Google + Calendar) |
| Calendar   | Google Calendar API — two-way sync                              |
| Deployment | Vercel                                                          |

## Quick start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment** — copy the template and fill in the values (each var is
   documented inline):
   ```bash
   cp .env.example .env.local
   ```
   You'll need a Supabase project (with the Google provider enabled) and a Google Cloud
   OAuth app with the Calendar API enabled. Generate `TOKEN_ENC_KEY` with
   `openssl rand -hex 32`.

3. **Run migrations**
   ```bash
   npm run db:migrate
   ```

4. **Start the dev server**
   ```bash
   npm run dev
   ```

## Project structure

```
src/
  app/
    (app)/        Authenticated pages (chores, household, bills, expenses, …)
    api/          Route handlers — one folder per resource
    auth/         OAuth callback + sign-out
    page.tsx      Marketing landing; doubles as the sign-in surface
  components/     Shared React components (ui/, states/, dashboard/)
  db/             Drizzle client + table exports — the only DB entry point
  lib/            Domain logic, validation, calendar sync, crypto, helpers
  middleware.ts   Route protection (redirects unauthed users to /)
  test/           Vitest suite
drizzle/          Generated SQL migrations + snapshots
docs/             SPEC, ARCHITECTURE, OPERATIONS
```

## Architecture

Pages and API routes run on the Next.js App Router. Protected routes authenticate with
the Supabase server client, validate input with the entity's zod schema
(`src/lib/validation.ts`), persist through the single DB entry point (`src/db/index.ts`),
and return structured JSON via `src/lib/api.ts`. Every query is scoped to the household
the current user belongs to. All Google Calendar access is funneled through one
server-only module (`src/lib/calendar.ts`); sync is best-effort and never blocks a
mutation. See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the directory map,
data model, and request lifecycle.

## Testing

Tests live in `src/test/` and run on [Vitest](https://vitest.dev). Every feature ships a
happy-path test plus at least one failure case. Run the full **quality gate** before any
commit:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Run the Vitest suite |
| `npm run test:watch` | Vitest in watch mode |
| `npm run db:generate` | Generate Drizzle migrations from the schema |
| `npm run db:migrate` | Apply migrations |

## Deployment

Hearth deploys to Vercel. Set every variable from `.env.example` in the Vercel project for
both **Production** and **Preview** — `src/lib/env.ts` fails the production boot if any are
missing. Apply migrations with `npm run db:migrate` against the `DIRECT_URL` connection.
See **[docs/OPERATIONS.md](docs/OPERATIONS.md)** for rate limiting, webhook auth, and the
production hardening checklist.

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — agent steering guide: rules, directory map, backlog, stories.
- **[docs/SPEC.md](docs/SPEC.md)** — product spec, data model, and non-functional requirements.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — how the code fits together.
- **[docs/OPERATIONS.md](docs/OPERATIONS.md)** — production security & operations.
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — dev workflow, conventions, and the quality gate.
- **[SECURITY.md](SECURITY.md)** — vulnerability disclosure policy.

## License

[MIT](LICENSE)
