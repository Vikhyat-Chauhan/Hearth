"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Single source of truth for starting the Google sign-in + Calendar flow. Used
// directly by every CTA (landing hero/closing/footer, navbar) so there's no
// intermediate /login page — clicking a "Get started"/"Sign in" button launches
// Google's consent screen straight away.
//
// access_type=offline + prompt=consent are required to receive a refresh token,
// which the /auth/callback route captures and stores encrypted. The caller owns
// the visual styling via `className`/`children`; this component only owns the
// click behavior, the disabled-while-redirecting state, and an optional error.
export default function GoogleSignIn({
  children,
  className = "",
  showError = true,
}: {
  children: React.ReactNode;
  className?: string;
  showError?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/calendar",
        queryParams: { access_type: "offline", prompt: "consent" },
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success the browser is redirected to Google; no further work here.
  }

  return (
    <>
      <button
        type="button"
        onClick={signIn}
        disabled={loading}
        aria-busy={loading}
        className={`${className} disabled:cursor-default disabled:opacity-70`}
      >
        {children}
      </button>
      {showError && error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </>
  );
}
