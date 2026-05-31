# Phase A — Before the Clock (one-time, idempotent)

Do ALL of this **before** the interview — done live it only burns minutes and shows no judgment.

1. Link Vercel and deploy the empty scaffold:

   ```bash
   vercel link && vercel --prod
   ```

2. Confirm the live URL builds **green**. Paste it into `CLAUDE.md`.
3. *(Optional)* Pre-provision a Supabase project and pull env vars — **only** if you expect
   hosted persistence. You can skip this and add it later.

   ```bash
   vercel env pull .env.local
   ```

Walk in with: a cloned template, dependencies installed, and a green deploy already live.