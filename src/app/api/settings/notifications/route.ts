// PATCH /api/settings/notifications — update the current user's email-notification
// preferences. Session-protected; a user only ever edits their own profile row.
import { eq } from "drizzle-orm";
import { db, profiles } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { notificationPrefsSchema, parseBody } from "@/lib/validation";
import { ok, badRequest, unauthorized, withErrorHandling } from "@/lib/api";

export const PATCH = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const result = parseBody(notificationPrefsSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);

  const { notifyAnnouncements, notifyChores } = result.data;
  const patch: Partial<{ notifyAnnouncements: boolean; notifyChores: boolean }> = {};
  if (notifyAnnouncements !== undefined) patch.notifyAnnouncements = notifyAnnouncements;
  if (notifyChores !== undefined) patch.notifyChores = notifyChores;

  const [updated] = await db
    .update(profiles)
    .set(patch)
    .where(eq(profiles.id, user.id))
    .returning({
      notifyAnnouncements: profiles.notifyAnnouncements,
      notifyChores: profiles.notifyChores,
    });

  return ok(updated);
});
