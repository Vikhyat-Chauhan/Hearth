// OAuth callback: exchange the Google auth code for a Supabase session, then
// capture the Google refresh token (encrypted) and upsert the user's profile.
//
// access_type=offline + prompt=consent (set on the GoogleSignIn button) make
// Google return a provider_refresh_token here. We only overwrite the stored
// token when a fresh one is present, so re-logins without consent don't wipe it.
//
// On failure we bounce back to the landing ("/") with an ?error= code, which the
// landing surfaces as a banner (there's no separate /login page anymore).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, profiles } from "@/db";
import { encryptToken } from "@/lib/crypto";
import { ensureWatch } from "@/lib/calendar-twoway";
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, DEFAULT_THEME, type Theme } from "@/lib/theme";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session?.user) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  const user = data.session.user;
  const refreshToken = data.session.provider_refresh_token;

  let theme: Theme = DEFAULT_THEME;
  try {
    const tokenEnc = refreshToken ? encryptToken(refreshToken) : null;
    const [row] = await db
      .insert(profiles)
      .values({
        id: user.id,
        email: user.email ?? "",
        name: (user.user_metadata?.full_name as string | undefined) ?? null,
        googleRefreshTokenEnc: tokenEnc,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          email: user.email ?? "",
          name: (user.user_metadata?.full_name as string | undefined) ?? null,
          // Only refresh the stored token when Google handed us a new one.
          ...(tokenEnc ? { googleRefreshTokenEnc: tokenEnc } : {}),
        },
      })
      .returning({ theme: profiles.theme });
    if (row?.theme) theme = row.theme;
  } catch (err) {
    console.error("[auth/callback] profile upsert failed:", err);
    return NextResponse.redirect(`${origin}/?error=profile_failed`);
  }

  // Two-way sync is on by default: once Google is connected, arm a watch channel
  // so calendar edits flow back to Hearth. Best-effort and idempotent — a failure
  // (or no Google token yet) never blocks the login redirect.
  try {
    await ensureWatch(user.id, `${origin}/api/calendar/webhook`);
  } catch (err) {
    console.error("[auth/callback] auto-enable two-way sync failed:", err);
  }

  // Mirror the saved theme into the cookie so the user's preference applies with
  // no flash on this device too — including the first load after signing in.
  const response = NextResponse.redirect(`${origin}/`);
  response.cookies.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: THEME_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  return response;
}
