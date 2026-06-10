"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

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
  const { toast } = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function remove() {
    if (busy) return;
    const confirmed = await confirm({
      title: `Remove ${name}?`,
      message: "Their chore assignments and calendar events will be removed.",
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!confirmed) return;
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
        toast(`Couldn't remove ${name}`, "error");
        return;
      }
      toast(`${name} removed`);
      router.refresh();
    } catch {
      setError(true);
      toast(`Couldn't remove ${name}`, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      aria-label={`Remove ${name}`}
      className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      {busy ? "Removing…" : error ? "Retry" : "Remove"}
    </button>
  );
}
