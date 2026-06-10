"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export default function DeleteHouseholdButton({
  householdId,
  householdName,
  memberCount,
}: {
  householdId: string;
  householdName: string;
  memberCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy) return;
    const others = memberCount - 1;
    const confirmed = await confirm({
      title: `Delete ${householdName}?`,
      message:
        `This permanently removes the household and ALL of its data — chores, shopping list, bills, expenses, and the message board — for ${
          others > 0 ? `all ${memberCount} members` : "you"
        }. This cannot be undone.`,
      confirmLabel: "Delete household",
      destructive: true,
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const res = await fetch("/api/households", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId }),
      });
      if (!res.ok) {
        toast("Couldn't delete the household", "error");
        return;
      }
      toast(`${householdName} deleted`);
      router.push("/");
      router.refresh();
    } catch {
      toast("Couldn't delete the household", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="danger" size="sm" onClick={remove} disabled={busy}>
      {busy ? "Deleting…" : "Delete household"}
    </Button>
  );
}
