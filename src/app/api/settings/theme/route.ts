// PATCH /api/settings/theme — update the current user's UI color-theme preference.
// Session-protected; a user only ever edits their own profile row. Also mirrors the
// choice into the `hearth-theme` cookie so the server renders the right theme on the
// next load with no flash.
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, profiles } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { themePrefSchema, parseBody } from "@/lib/validation";
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE } from "@/lib/theme";
import { ok, badRequest, unauthorized, withErrorHandling } from "@/lib/api";

export const PATCH = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const result = parseBody(themePrefSchema, await req.json());
  if (!result.success) return badRequest(result.error, result.issues);

  const { theme } = result.data;

  const [updated] = await db
    .update(profiles)
    .set({ theme })
    .where(eq(profiles.id, user.id))
    .returning({ theme: profiles.theme });

  // Mirror into the cookie so the server renders the right theme next load.
  // Best-effort: outside a request scope (e.g. unit tests) this is a no-op and
  // must never turn a successful save into an error.
  try {
    (await cookies()).set(THEME_COOKIE, theme, {
      path: "/",
      maxAge: THEME_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  } catch {
    // no cookie scope available — the client also writes the cookie itself
  }

  return ok(updated);
});
