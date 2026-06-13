// POST /api/announcements — post a message to the household board.
// Any member of the household may post.
import { eq } from "drizzle-orm";
import { db, announcements, households } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { announcementCreateSchema, parseBody } from "@/lib/validation";
import { isMember, getProfileName } from "@/lib/household";
import { recipientsForAnnouncement } from "@/lib/notifications";
import { sendEmail, announcementEmail } from "@/lib/email";
import { ok, badRequest, unauthorized, forbidden, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const result = parseBody(announcementCreateSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);
  const { householdId, body, isAnonymous } = result.data;

  if (!(await isMember(user.id, householdId))) {
    return forbidden("Only household members can post announcements");
  }

  const [created] = await db
    .insert(announcements)
    .values({ householdId, authorId: user.id, body, isAnonymous })
    .returning();

  // Best-effort email to the other members. Never let a mail failure (or an
  // unconfigured mailer) affect the 201 — email is a notification, not a gate.
  try {
    const recipients = await recipientsForAnnouncement(householdId, user.id);
    if (recipients.length > 0) {
      const [hh] = await db
        .select({ name: households.name })
        .from(households)
        .where(eq(households.id, householdId))
        .limit(1);
      const authorLabel = isAnonymous ? "A roommate" : await getProfileName(user.id);
      const { subject, html } = announcementEmail(hh?.name ?? "your household", authorLabel, body);
      await Promise.allSettled(
        recipients.map((r) => sendEmail({ to: r.email, subject, html })),
      );
    }
  } catch (err) {
    console.error("[announcements] notify failed:", err);
  }

  return ok(created, 201);
});
