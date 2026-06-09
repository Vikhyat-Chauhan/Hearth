# Hearth

A shared-household app for students and roommates: the main roommate creates a household, invites the others, and assigns recurring chores that show up on everyone's Google Calendar. Hearth also covers an announcements board, a shared shopping list, utilities & bills tracking, and Splitwise-style expense splitting.

**Live:** https://hearth-ruby-eight.vercel.app

## Tech Stack

| Concern    | Choice                                                            |
|------------|------------------------------------------------------------------|
| Framework  | Next.js (App Router, TypeScript)                                 |
| Frontend   | React + Tailwind CSS                                             |
| Database   | Supabase + Drizzle ORM                                           |
| Auth       | Google OAuth via Supabase Auth (Sign in with Google + Calendar) |
| Calendar   | Google Calendar API — two-way sync                              |
| Deployment | Vercel                                                           |

## Local development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment** — create `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   DATABASE_URL=          # Supabase pooler (port 6543) — app runtime
   DIRECT_URL=            # Supabase direct (port 5432) — migrations
   TOKEN_ENC_KEY=         # key for encrypting Google refresh tokens at rest
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   ```

3. **Run migrations**
   ```bash
   npm run db:migrate
   ```

4. **Start the dev server**
   ```bash
   npm run dev
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

**Quality gate** (run before every commit): `npm run typecheck && npm run lint && npm run test && npm run build`.

## Project docs

- **[CLAUDE.md](CLAUDE.md)** — developer guide: architecture rules, directory map, backlog, stories, and the definition of done.
- **[docs/SPEC.md](docs/SPEC.md)** — the product specification, data model, and non-functional requirements.

## License

[MIT](LICENSE)
