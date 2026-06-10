"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

/** Generic DELETE-an-entity button. Reused by announcements, shopping, bills. */
export default function DeleteButton({
  endpoint,
  label = "Delete",
  confirm: confirmMessage,
  className,
}: {
  endpoint: string;
  label?: string;
  confirm?: string;
  className?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function onClick() {
    if (busy) return;
    if (
      confirmMessage &&
      !(await confirm({ message: confirmMessage, confirmLabel: label, destructive: true }))
    ) {
      return;
    }
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        setError(true);
        toast("Couldn't delete that", "error");
        return;
      }
      router.refresh();
    } catch {
      setError(true);
      toast("Couldn't delete that", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      className={
        className ??
        "shrink-0 text-sm text-gray-400 transition hover:text-red-600 disabled:opacity-50"
      }
    >
      {busy ? "…" : error ? "Retry" : label}
    </button>
  );
}
