"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export default function MarkDoneButton({
  choreId,
  occurrenceDate,
  done,
  upcoming = false,
}: {
  choreId: string;
  occurrenceDate: string;
  done: boolean;
  upcoming?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
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
        toast("Couldn't mark it done", "error");
        return;
      }
      setIsDone(true);
      toast("Nice — marked done");
      router.refresh();
    } catch {
      setError(true);
      toast("Couldn't mark it done", "error");
    } finally {
      setBusy(false);
    }
  }

  if (isDone) {
    return <span className="text-sm font-medium text-green-600">✓ Done</span>;
  }

  // Not yet due — can't be marked done until its date arrives.
  if (upcoming) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
        <span aria-hidden="true">🔒</span> Upcoming
      </span>
    );
  }

  return (
    <Button variant="secondary" size="sm" onClick={mark} disabled={busy}>
      {busy ? "Marking…" : error ? "Retry" : "Mark done"}
    </Button>
  );
}
