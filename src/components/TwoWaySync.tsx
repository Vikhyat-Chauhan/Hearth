"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Enables two-way sync by registering a Google watch channel for the user. */
export default function TwoWaySync({ active }: { active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function enable() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/calendar/watch", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setStatus("Couldn't enable two-way sync — please try again.");
        return;
      }
      if (body.data?.enabled) {
        setStatus("Two-way sync is on. Deleting a chore event on your calendar now updates Hearth.");
        router.refresh();
      } else if (body.data?.reason === "google_not_connected") {
        setStatus("Connect Google Calendar first, then enable two-way sync.");
      } else {
        setStatus("Google couldn't register the watch right now — you can retry shortly.");
      }
    } catch {
      setStatus("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 border-t border-gray-100 pt-6">
      <h2 className="text-sm font-semibold text-gray-700">Two-way sync</h2>
      <p className="mt-1 text-xs text-gray-500">
        Let changes you make on Google Calendar flow back to Hearth. If you delete a chore&apos;s
        event on your calendar, Hearth drops that calendar link.
      </p>
      {active ? (
        <p className="mt-3 text-sm text-green-700">✓ Two-way sync is active.</p>
      ) : (
        <button
          onClick={enable}
          disabled={busy}
          className="mt-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
        >
          {busy ? "Enabling…" : "Enable two-way sync"}
        </button>
      )}
      {status && <p role="status" className="mt-3 text-sm text-gray-600">{status}</p>}
    </div>
  );
}
