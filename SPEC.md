# Spec: **GigLog** — Job Tracker for Freelance Musicians

## The Problem

Freelance musicians (gigging pianists, session guitarists, wedding bands, jazz trios) have no purpose-built tool for managing their work. They juggle gigs across iMessage threads, spreadsheet invoices, and mental notes. They forget to follow up on leads, lose track of what they're owed, and have no visibility into which clients or venues bring repeat business. Bandmate apps are social. Calendly is generic. Nothing speaks their language.

---

## What You're Building

A web app where a freelance musician can:

- **Log gigs** — venue, date, set length, genre, pay rate, notes
- **Track payment status** — invoiced / partial / paid / overdue
- **Manage contacts** — clients (wedding planners, venue bookers), co-musicians
- **See a dashboard** — upcoming gigs, outstanding income, monthly earnings trend
- **Get smart nudges** — "You haven't heard from The Rusty Nail in 90 days. Follow up?"
- **Log expenses** — instrument rental, travel, practice space
- **Generate a simple invoice PDF** — send to client directly from the app
- **Rate gigs** — enjoyment, professionalism of client, likelihood to rebook
- **Share availability** — a public `/available` page with open dates and booking inquiry form
- **Export to CSV** — for taxes

---

## User Stories

1. As a gigging musician, I want to add a new gig in under 30 seconds so I don't lose the booking details while I'm on the phone
2. As a freelancer, I want to see at a glance how much money I'm owed so I can follow up before month-end
3. As someone who plays 4–6 gigs/month, I want to see which venues and clients book me most so I can prioritize relationships
4. As a musician who works with a regular trio, I want to tag my co-musicians on a gig so I know who played what
5. As a self-employed musician, I want a simple PDF invoice I can send without switching to another tool
6. As a musician tired of explaining my availability, I want a shareable link showing when I'm free to book

---

## Data Model (suggested)

- `Gig`: id, date, venue_name, venue_city, client_id, set_length_min, pay_cents, pay_status, genre_tags[], notes, enjoyment_rating, musician_ids[]
- `Client`: id, name, email, phone, type (venue | individual | agency), notes
- `Musician`: id, name, instrument, email, phone
- `Expense`: id, gig_id?, category, amount_cents, date, notes
- `Invoice`: id, gig_ids[], client_id, sent_at, paid_at, pdf_url

---

## Tech Preferences

- React + Tailwind frontend
- Supabase (Postgres + Auth + Storage) or SQLite/Drizzle if moving faster
- PDF generation: React-PDF or Puppeteer
- Deployed on Vercel

---

## Nice-to-Haves (Stretch)

- Recurring gig templates (e.g. "every Friday at Blue Note Jazz Club")
- Tax summary page (income - expenses by quarter)
- Email invoice directly from app (Resend or Postmark)
- Mobile-responsive (gigging musicians are always on their phone)
- Setlist builder per gig
- Referral tracking (who referred this client?)

---

## Success Criteria

At the end of the session, Nate should be able to:
1. Open a URL and log a fake gig
2. See that gig appear on a dashboard with income stats
3. Mark the gig as paid and see the dashboard update
4. Generate or preview an invoice for that gig
