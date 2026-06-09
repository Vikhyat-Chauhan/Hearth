"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConnectCalendar({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function connect() {
    setBusy(true);
    setStatus(null);
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
      setStatus(error.message);
      setBusy(false);
    }
    // On success the browser redirects to Google.
  }

  async function backfill() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/calendar/backfill", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setStatus(body.error ?? "Backfill failed");
        return;
      }
      setStatus(`Synced ${body.data.synced} of ${body.data.assigned} assigned chore(s) to your calendar.`);
      router.refresh();
    } catch {
      setStatus("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {connected ? (
        <>
          <p className="text-sm text-green-700">✓ Google Calendar is connected.</p>
          <button
            onClick={backfill}
            disabled={busy}
            className="rounded-lg bg-gray-900 px-4 py-2.5 font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
          >
            {busy ? "Syncing…" : "Backfill my chores to my calendar"}
          </button>
          <p className="text-xs text-gray-500">
            Re-runs the one-way sync for every chore assigned to you — useful if events are missing.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            Your Google Calendar isn&apos;t connected yet. Connect it to have your chores appear on
            your calendar.
          </p>
          <button
            onClick={connect}
            disabled={busy}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            {busy ? "Redirecting…" : "Connect Google Calendar"}
          </button>
        </>
      )}
      {status && <p role="status" className="text-sm text-gray-600">{status}</p>}
    </div>
  );
}
