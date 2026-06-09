"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Generic DELETE-an-entity button. Reused by announcements, shopping, bills. */
export default function DeleteButton({
  endpoint,
  label = "Delete",
  confirm: confirmMessage,
  className,
}: {
  endpoint: string;
  label?: string;
  confirm?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function onClick() {
    if (busy) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
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
      onClick={onClick}
      disabled={busy}
      className={
        className ??
        "shrink-0 text-sm text-gray-400 transition hover:text-red-600 disabled:opacity-50"
      }
    >
      {busy ? "…" : error ? "Retry" : label}
    </button>
  );
}
