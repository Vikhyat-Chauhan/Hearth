// POST /api/announcements — post a message to the household board.
// Any member of the household may post.
import { db, announcements } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { announcementCreateSchema, parseBody } from "@/lib/validation";
import { isMember } from "@/lib/household";
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

  return ok(created, 201);
});
