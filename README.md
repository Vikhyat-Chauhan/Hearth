# GigLog — Job Tracker for Freelance Musicians

A web app where freelance musicians can log gigs, track payments, manage contacts, and see earnings at a glance — built for the Kiloforge founding engineer interview sprint.

---

## What It Does

- **Log gigs** — venue, date, set length, genre, pay rate, notes
- **Track payment status** — invoiced / partial / paid / overdue
- **Manage contacts** — clients (wedding planners, venue bookers), co-musicians
- **Dashboard** — upcoming gigs, outstanding income, monthly earnings trend
- **Smart nudges** — "You haven't heard from The Rusty Nail in 90 days. Follow up?"
- **Log expenses** — instrument rental, travel, practice space
- **Generate invoice PDFs** — send to client directly from the app
- **Rate gigs** — enjoyment, client professionalism, likelihood to rebook
- **Share availability** — public `/available` page with booking inquiry form
- **Export to CSV** — for taxes

---

## Tech Stack

| Concern | Choice |
|---|---|
| Frontend | React + Tailwind CSS |
| Framework | Next.js 14 (App Router, TypeScript) |
| Database | Supabase (Postgres) + Prisma |
| Auth | Supabase Auth — email/password |
| PDF generation | React-PDF |
| Deployment | Vercel |

---

## Getting Started

```bash
# Install dependencies
npm install

# Copy env vars
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# Run dev server
npm run dev
```

---

## Project Structure

```
SPEC.md         — Full product spec (GigLog)
PROJECT.md      — Sprint workflow & agent orchestration design
CLAUDE.md       — Interview context & agent steering playbook
```

---

## Data Model

```
Gig:      id, date, venue_name, venue_city, client_id, set_length_min,
          pay_cents, pay_status, genre_tags[], notes, enjoyment_rating, musician_ids[]
Client:   id, name, email, phone, type (venue | individual | agency), notes
Musician: id, name, instrument, email, phone
Expense:  id, gig_id?, category, amount_cents, date, notes
Invoice:  id, gig_ids[], client_id, sent_at, paid_at, pdf_url
```

All monetary amounts stored as **cents** (integers).

---

## Deploy

```bash
git add -A && git commit -m "your message" && vercel --prod
```

---

## Sprint Workflow

This repo uses a parallel sub-agent sprint model defined in `PROJECT.md`:

1. Planning agent reads `SPEC.md`, selects 3 parallelizable features
2. Creates a Git branch per feature (`feat/<slug>-<hash>`)
3. Generates a self-contained prompt for each sub-agent
4. Sub-agents implement and update `CLAUDE.md` on completion
5. Integration sub-agents verify UI, data flow, and build health
6. Merge, commit, deploy to Vercel

See `PROJECT.md` for the full repeating sprint pattern and `CLAUDE.md` for agent steering guidance.
