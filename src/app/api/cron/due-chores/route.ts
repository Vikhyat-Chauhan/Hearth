// GET /api/cron/due-chores — daily digest of chores due today.
//
// Invoked by Vercel Cron (see vercel.json), NOT by a user session. Vercel sends
// `Authorization: Bearer ${CRON_SECRET}` on scheduled runs when CRON_SECRET is
// set on the project; we require it so the route can't be triggered anonymously.
// Best-effort: a mail failure for one member never fails the whole run.

import { dueChoreDigests } from "@/lib/notifications";
import { sendEmail, dueChoresEmail } from "@/lib/email";
import { ok, unauthorized, withErrorHandling } from "@/lib/api";

export const GET = withErrorHandling(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  // No secret configured → refuse rather than run wide open.
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return unauthorized();
  }

  const digests = await dueChoreDigests();
  await Promise.allSettled(
    digests.map((d) => {
      const { subject, html } = dueChoresEmail(d.name, d.householdName, d.titles, d.overdue);
      return sendEmail({ to: d.email, subject, html });
    }),
  );

  return ok({ sent: digests.length });
});
