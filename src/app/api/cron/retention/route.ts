// GET /api/cron/retention — prune data past its retention window (chore logs,
// announcements, checked-off shopping items). Windows are env-configurable; see
// src/lib/retention.ts and the RETENTION_* vars in .env.example.
//
// Invoked by Vercel Cron (see vercel.json), NOT by a user session. Vercel sends
// `Authorization: Bearer ${CRON_SECRET}` on scheduled runs; we require it so the
// route can't be triggered anonymously. Best-effort: per-class delete failures are
// swallowed inside pruneOldData and never fail the whole run.

import { pruneOldData } from "@/lib/retention";
import { ok, unauthorized, withErrorHandling } from "@/lib/api";

export const GET = withErrorHandling(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  // No secret configured → refuse rather than run wide open.
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return unauthorized();
  }

  const removed = await pruneOldData();
  return ok(removed);
});
