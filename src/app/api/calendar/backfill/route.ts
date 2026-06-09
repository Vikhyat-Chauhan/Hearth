// POST /api/calendar/backfill — create/refresh the current user's Google Calendar
// events for every chore already assigned to them. Used after a member connects
// Google later. Best-effort and idempotent (CalendarLink upsert per chore/user).
import { eq, and } from "drizzle-orm";
import { db, chores, choreAssignments, calendarLinks, profiles } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { syncChoreToAssignees } from "@/lib/chore-sync";
import { ok, unauthorized, badRequest, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  // Must have Google connected (a stored refresh token) to write events.
  const [profile] = await db
    .select({ tok: profiles.googleRefreshTokenEnc })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  if (!profile?.tok) {
    return badRequest("Connect Google Calendar first, then try again");
  }

  const assigned = await db
    .select({
      id: chores.id,
      title: chores.title,
      description: chores.description,
      rrule: chores.rrule,
      createdAt: chores.createdAt,
    })
    .from(chores)
    .innerJoin(choreAssignments, eq(choreAssignments.choreId, chores.id))
    .where(and(eq(choreAssignments.userId, user.id), eq(chores.active, true)));

  for (const chore of assigned) {
    await syncChoreToAssignees(chore, [user.id]);
  }

  const linkCount = await db
    .select({ id: calendarLinks.id })
    .from(calendarLinks)
    .where(eq(calendarLinks.userId, user.id));

  return ok({ assigned: assigned.length, synced: linkCount.length });
});
