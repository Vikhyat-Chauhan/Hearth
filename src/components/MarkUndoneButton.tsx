"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export default function MarkUndoneButton({
  choreId,
  occurrenceDate,
}: {
  choreId: string;
  occurrenceDate: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function unmark() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/chore-logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choreId, occurrenceDate }),
      });
      if (!res.ok) {
        setError(true);
        toast("Couldn't mark it undone", "error");
        return;
      }
      toast("Marked undone");
      router.refresh();
    } catch {
      setError(true);
      toast("Couldn't mark it undone", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={unmark} disabled={busy}>
      {busy ? "Undoing…" : error ? "Retry" : "Mark undone"}
    </Button>
  );
}
