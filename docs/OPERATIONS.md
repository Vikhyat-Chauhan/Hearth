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

## Calendar watch channel expiration (known follow-up)

Google watch channels expire (~7 days/1 week). There is no auto-refresh job yet, so two-way
sync silently stops for a user when their channel lapses. **TODO:** add a Vercel Cron
(`/api/calendar/refresh-channels`) to re-`registerWatch` channels nearing `expiration`.

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
