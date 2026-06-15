// GET /api/calendar/refresh-channels — re-arm Google Calendar watch channels that
// are about to expire so two-way sync doesn't silently stop. Google channels live
// ~7 days; this runs on a cron (see vercel.json) and renews any expiring within 48h.
//
// Invoked by Vercel Cron, NOT a user session — guarded by `CRON_SECRET`. Unlike the
// user-facing /api/calendar/watch route there's no request origin to derive the
// webhook address from, so we build it from APP_BASE_URL (fallback: VERCEL_URL, then
// the known prod URL). Best-effort: per-user failures are counted, never thrown.

import { refreshExpiringWatches } from "@/lib/calendar-twoway";
import { ok, unauthorized, withErrorHandling } from "@/lib/api";

function baseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://hearth-ruby-eight.vercel.app";
}

export const GET = withErrorHandling(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return unauthorized();
  }

  const webhookAddress = `${baseUrl()}/api/calendar/webhook`;
  const result = await refreshExpiringWatches(webhookAddress);
  return ok(result);
});
