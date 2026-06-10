// POST /api/households/join — join a household by invite code as a member.
import { eq, and } from "drizzle-orm";
import { db, households, memberships } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { householdJoinSchema, parseBody } from "@/lib/validation";
import { ACTIVE_HOUSEHOLD_COOKIE } from "@/lib/household";
import { ok, badRequest, unauthorized, notFound, tooManyRequests, withErrorHandling } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";

export const POST = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  // Throttle invite-code attempts to blunt brute-force enumeration. Keyed per
  // user so one account can't grind codes; the Vercel WAF rule covers per-IP.
  const limited = rateLimit(`join:${user.id}`, 10, 60_000);
  if (!limited.success) return tooManyRequests(limited.retryAfter);

  const result = parseBody(householdJoinSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);

  const code = result.data.inviteCode.trim().toUpperCase();
  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.inviteCode, code))
    .limit(1);
  if (!household) return notFound("No household found for that invite code");

  const existing = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.householdId, household.id), eq(memberships.userId, user.id)))
    .limit(1);
  if (existing.length > 0) {
    return badRequest("You're already a member of this household");
  }

  await db.insert(memberships).values({
    householdId: household.id,
    userId: user.id,
    role: "member",
  });

  // Make the just-joined household the active one.
  const res = ok(household, 201);
  res.cookies.set(ACTIVE_HOUSEHOLD_COOKIE, household.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
});
