"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export default function TransferAdminControl({
  householdId,
  members,
}: {
  householdId: string;
  // Other members (admin excluded) eligible to take over.
  members: { userId: string; label: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(members[0]?.userId ?? "");

  async function transfer() {
    if (busy || !selected) return;
    const target = members.find((m) => m.userId === selected);
    const confirmed = await confirm({
      title: `Make ${target?.label ?? "this member"} the admin?`,
      message:
        "They'll take over as the household admin and you'll leave the household. Your chore assignments and calendar events will be cleared.",
      confirmLabel: "Make admin & leave",
      destructive: true,
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const res = await fetch("/api/households/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, newAdminUserId: selected }),
      });
      if (!res.ok) {
        toast("Couldn't transfer the household", "error");
        return;
      }
      toast(`${target?.label ?? "Member"} is now the admin`);
      router.push("/");
      router.refresh();
    } catch {
      toast("Couldn't transfer the household", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select
        aria-label="New admin"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={busy}
        className="sm:w-56"
      >
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.label}
          </option>
        ))}
      </Select>
      <Button variant="secondary" size="sm" onClick={transfer} disabled={busy || !selected}>
        {busy ? "Transferring…" : "Make admin & leave"}
      </Button>
    </div>
  );
}
