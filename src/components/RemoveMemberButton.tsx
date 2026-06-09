"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RemoveMemberButton({
  householdId,
  userId,
  name,
}: {
  householdId: string;
  userId: string;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function remove() {
    if (busy || !confirm(`Remove ${name}? Their chore assignments and calendar events will be removed.`)) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/households/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, userId }),
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      {busy ? "Removing…" : error ? "Retry" : "Remove"}
    </button>
  );
}
