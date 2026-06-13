"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export default function RenameHouseholdControl({
  householdId,
  currentName,
}: {
  householdId: string;
  currentName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);

  const trimmed = name.trim();
  const canSave = !busy && trimmed.length > 0 && trimmed !== currentName;

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/households/${householdId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        toast("Couldn't rename the household", "error");
        return;
      }
      toast("Household renamed");
      router.refresh();
    } catch {
      toast("Couldn't rename the household", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={rename} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        aria-label="Household name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        disabled={busy}
        className="sm:w-72"
      />
      <Button type="submit" variant="secondary" size="sm" disabled={!canSave}>
        {busy ? "Saving…" : "Save name"}
      </Button>
    </form>
  );
}
