// Route protection: redirect unauthenticated requests to the landing ("/"), and
// refresh the Supabase session cookie on every request.
//
// Public paths: the marketing landing (exactly "/") and the OAuth callback. The
// landing doubles as the sign-in surface (its CTAs launch Google directly), so
// there's no separate /login page. Everything else requires a session.
// Dev convenience: before provisioning writes .env.local, NEXT_PUBLIC_SUPABASE_URL
// is unset — we let requests through so the app still boots locally.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/auth/callback", "/privacy", "/terms"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Root "/" is public (the landing decides what to show by session); match it
  // exactly so we don't accidentally treat every path as public.
  const isPublic = pathname === "/" || PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  // API routes enforce auth themselves and return JSON 401 — never redirect them
  // (a redirect would hand a fetch() HTML instead of a parseable error).
  const isApi = pathname.startsWith("/api");

  if (!user && !isPublic && !isApi) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
