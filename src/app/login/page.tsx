"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// "Sign in with Google" — login doubles as Google Calendar authorization.
// access_type=offline + prompt=consent are required to receive a refresh token,
// which the /auth/callback route captures and stores encrypted.
export default function LoginPage() {
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
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-card">
        <div
          aria-hidden="true"
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-3xl"
        >
          🔥
        </div>
        <h1 className="font-display text-2xl font-bold text-brand-700">Welcome to Hearth</h1>
        <p className="mt-2 text-sm text-gray-500">
          Sign in with Google to manage your household chores. This also lets Hearth add
          chores to your Google Calendar.
        </p>
        <button
          onClick={signIn}
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
        >
          {loading ? "Redirecting…" : "Sign in with Google"}
        </button>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
