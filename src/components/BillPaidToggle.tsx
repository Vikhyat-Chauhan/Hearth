"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export default function BillPaidToggle({
  billId,
  paid,
}: {
  billId: string;
  paid: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPaid, setIsPaid] = useState(paid);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const next = !isPaid;
    setBusy(true);
    setIsPaid(next); // optimistic
    try {
      const res = await fetch(`/api/bills/${billId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: next }),
      });
      if (!res.ok) {
        setIsPaid(!next);
        toast("Couldn't update the bill", "error");
        return;
      }
      router.refresh();
    } catch {
      setIsPaid(!next);
      toast("Couldn't update the bill", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`shrink-0 rounded-lg border px-3 py-1 text-sm font-medium transition disabled:opacity-50 ${
        isPaid
          ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
          : "border-gray-300 text-gray-700 hover:bg-gray-50"
      }`}
    >
      {isPaid ? "✓ Paid" : "Mark paid"}
    </button>
  );
}
