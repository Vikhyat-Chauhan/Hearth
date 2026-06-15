# Hearth — Production Security & Operations

Operational hardening for the public deployment. Code-level protections live in the
repo; the items below are platform configuration you set on Vercel/Supabase.

> Looking to **report a vulnerability**? See the root [`SECURITY.md`](../SECURITY.md)
> for the disclosure policy. This document is the operator's hardening checklist.

## Required environment variables

See `.env.example`. `src/lib/env.ts` (`assertServerEnv`, called from the root layout)
fails the boot in production if any required var is missing or `TOKEN_ENC_KEY` is not a
valid 32-byte key. Set all of them in the Vercel project for **Production** and **Preview**.

## Rate limiting (Vercel Firewall WAF)

The app ships a small in-memory per-user throttle on `POST /api/households/join`
(`src/lib/ratelimit.ts`), but that is per-instance and best-effort only. The **global**
control is a Vercel Firewall rate-limit rule. WAF rate-limiting requires a Pro/Enterprise
plan. Configure in the Vercel dashboard (Project → Firewall) or via `vercel firewall`:

| Path                       | Limit            | Action            | Why                                    |
|----------------------------|------------------|-------------------|----------------------------------------|
| `POST /api/households/join`| 10 / min per IP  | Deny / 429        | Stop invite-code brute-force           |
| `POST /api/calendar/webhook`| 60 / min per IP | Deny / 429        | Blunt forged-notification floods       |
| `/api/*` (catch-all)       | 300 / min per IP | Challenge / 429   | General API abuse backstop             |

Vercel's automatic DDoS mitigation is always on. Consider enabling **BotID** (needs the
`@vercel/botid` package — get approval before adding) and **Attack Challenge Mode** for
incident response.

## Calendar webhook authentication

`/api/calendar/webhook` is unauthenticated by design (Google calls it, no session). It is
protected by a per-channel secret: `registerWatch` stores a random `token` on the
`calendar_channels` row and Google echoes it back as `X-Goog-Channel-Token`. The webhook
(`verifiedChannelOwner`) only acts when the token matches. Legacy channels created before
the token column get a token on their next watch refresh.

## Scheduled maintenance (crons)

All cron routes are guarded by `CRON_SECRET` (Vercel sends it as `Authorization: Bearer …`
on scheduled runs) and are best-effort — a per-item failure is logged and skipped, never a 500.
Registered in `vercel.json`:

| Path | Schedule (UTC) | Does |
|------|----------------|------|
| `/api/cron/retention` | `0 3 * * *` | Prunes old data — see "Data retention" below. |
| `/api/cron/calendar-cleanup` | `0 4 * * *` | Deletes expired `calendar_channels` rows and reconciles stale `calendar_links`. |
| `/api/calendar/refresh-channels` | `0 5 * * *` | Re-arms Google watch channels nearing expiration. |
| `/api/cron/due-chores` | `0 13 * * *` | Daily due-chore email digest (no deletion). |

> **Hobby plans allow 100 cron jobs but only once-per-day schedules** — a more-frequent
> expression (`*/n`, hourly, multi-value minute/hour) fails at deploy with
> *"Hobby accounts are limited to daily cron jobs"*, and each job triggers within its
> scheduled hour (±59 min), so the jobs are staggered by hour rather than minute. All four
> crons here are daily, so they deploy on any plan. For sub-daily or precise timing
> (e.g. faster channel refresh), upgrade to Pro.

### Calendar watch channel expiration (resolved)

Google watch channels expire (~7 days). `/api/calendar/refresh-channels` runs daily and
calls `refreshExpiringWatches` (`src/lib/calendar-twoway.ts`) to re-`registerWatch` any channel
expiring within 72h, so two-way sync no longer silently lapses (the 72h window leaves margin
for a late or missed daily run). The webhook address is built from `APP_BASE_URL` (a cron has
no request origin); set it on the Vercel project.

### Data retention

`/api/cron/retention` calls `pruneOldData` (`src/lib/retention.ts`) daily to keep tables bounded:

| Data | Cutoff column | Env var (days) | Default |
|------|---------------|----------------|---------|
| `chore_logs` | `occurrence_date` | `RETENTION_CHORELOG_DAYS` | 90 |
| `announcements` | `created_at` | `RETENTION_ANNOUNCEMENT_DAYS` | 90 |
| `shopping_items` (checked only) | `created_at` | `RETENTION_SHOPPING_DAYS` | 30 |

Open (unchecked) shopping items are never pruned by age. Deletion is permanent — widen the
windows before lowering them if history matters.

## Error monitoring

Today: rely on Vercel Observability + runtime logs. `withErrorHandling` (`src/lib/api.ts`)
logs structured `[api] unhandled error:` lines; the calendar webhook/twoway log
`[calendar/...]` lines. **TODO (needs dep approval):** add `@sentry/nextjs` for alerting and
release tracking — wire `Sentry.captureException` in `withErrorHandling` and the error
boundary once approved.

## Supabase Row-Level Security (defense-in-depth)

Migration `drizzle/0005_*` enables RLS + household-scoped policies on the user/household
tables. **Caveat:** the app connects to Postgres via `DATABASE_URL` (the privileged pooler
role), which **bypasses RLS** — so it adds no protection for current code paths. It is
belt-and-suspenders that only pays off if a future path queries via the Supabase anon key
(e.g. client-side Supabase data access). Authorization today is enforced in the API layer
(`isAdmin`/`isMember`, query scoping).

## Secrets

`.env.local` is gitignored and is **not** in git history (verified). Never commit it.
Rotate `TOKEN_ENC_KEY`, Google OAuth secret, and the database password on any suspected
exposure. Note: rotating `TOKEN_ENC_KEY` invalidates all stored refresh tokens — users must
re-connect Google.
