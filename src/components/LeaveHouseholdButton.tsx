"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export default function LeaveHouseholdButton({
  householdId,
  householdName,
}: {
  householdId: string;
  householdName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  async function leave() {
    if (busy) return;
    const confirmed = await confirm({
      title: `Leave ${householdName}?`,
      message:
        "You'll be removed from this household and your chore assignments and calendar events will be cleared. You can rejoin later with an invite code.",
      confirmLabel: "Leave",
      destructive: true,
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const res = await fetch("/api/households/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId }),
      });
      if (!res.ok) {
        toast("Couldn't leave the household", "error");
        return;
      }
      toast(`You left ${householdName}`);
      router.push("/");
      router.refresh();
    } catch {
      toast("Couldn't leave the household", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="danger" size="sm" onClick={leave} disabled={busy}>
      {busy ? "Leaving…" : "Leave household"}
    </Button>
  );
}
