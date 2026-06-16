"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export default function ShoppingToggle({
  itemId,
  checked,
}: {
  itemId: string;
  checked: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isChecked, setIsChecked] = useState(checked);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const next = !isChecked;
    setBusy(true);
    setIsChecked(next); // optimistic
    try {
      const res = await fetch(`/api/shopping/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: next }),
      });
      if (!res.ok) {
        setIsChecked(!next); // revert
        toast("Couldn't update the item", "error");
        return;
      }
      router.refresh();
    } catch {
      setIsChecked(!next);
      toast("Couldn't update the item", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <input
      type="checkbox"
      checked={isChecked}
      onChange={toggle}
      disabled={busy}
      aria-label={isChecked ? "Mark as not bought" : "Mark as bought"}
      className="h-5 w-5 shrink-0 cursor-pointer rounded border-line text-brand-600 focus:ring-brand-500 disabled:opacity-50"
    />
  );
}
