"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

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
          <Button onClick={backfill} disabled={busy}>
            {busy ? "Syncing…" : "Backfill my chores to my calendar"}
          </Button>
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
          <Button variant="secondary" onClick={connect} disabled={busy}>
            {busy ? "Redirecting…" : "Connect Google Calendar"}
          </Button>
        </>
      )}
      {status && <p role="status" className="text-sm text-gray-600">{status}</p>}
    </div>
  );
}
