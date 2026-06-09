// DELETE /api/announcements/[id] — remove a message. The author or the
// household admin may delete it.
import { eq } from "drizzle-orm";
import { db, announcements } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/household";
import { ok, unauthorized, forbidden, notFound, withErrorHandling } from "@/lib/api";

export const DELETE = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const id = req.url.split("/").pop()!.split("?")[0];

  const [row] = await db
    .select({ authorId: announcements.authorId, householdId: announcements.householdId })
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);
  if (!row) return notFound("Announcement not found");

  const allowed = row.authorId === user.id || (await isAdmin(user.id, row.householdId));
  if (!allowed) return forbidden("Only the author or the household admin can delete this");

  await db.delete(announcements).where(eq(announcements.id, id));
  return ok({ id, deleted: true });
});
