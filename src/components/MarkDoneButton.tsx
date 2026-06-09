"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

export default function MarkDoneButton({
  choreId,
  occurrenceDate,
  done,
}: {
  choreId: string;
  occurrenceDate: string;
  done: boolean;
}) {
  const router = useRouter();
  const [isDone, setIsDone] = useState(done);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function mark() {
    if (isDone || busy) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/chore-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choreId, occurrenceDate }),
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      setIsDone(true);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (isDone) {
    return <span className="text-sm font-medium text-green-600">✓ Done</span>;
  }

  return (
    <Button variant="secondary" size="sm" onClick={mark} disabled={busy}>
      {busy ? "Marking…" : error ? "Retry" : "Mark done"}
    </Button>
  );
}
