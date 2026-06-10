"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseDollarsToCents } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import CurrencyInput from "@/components/ui/CurrencyInput";
import FieldError from "@/components/ui/FieldError";
import { useToast } from "@/components/ui/Toast";

export default function BillForm({ householdId }: { householdId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const amountCents = parseDollarsToCents(amount);
    if (amountCents === null || amountCents <= 0) {
      setError("Enter an amount like 42.50");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          title,
          amountCents,
          dueDate: dueDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not add the bill");
        return;
      }
      setTitle("");
      setAmount("");
      setDueDate("");
      toast("Bill added");
      router.refresh();
    } catch {
      setError("Could not add the bill");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" aria-busy={busy}>
      <label htmlFor="bill-title" className="sr-only">
        Bill name
      </label>
      <Input
        id="bill-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What's the bill? (e.g. Internet)"
        maxLength={120}
        required
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor="bill-amount" className="sr-only">
            Amount in dollars
          </label>
          <CurrencyInput
            id="bill-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            aria-describedby={error ? "bill-error" : undefined}
          />
        </div>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-label="Due date (optional)"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
        />
      </div>
      <FieldError id="bill-error">{error}</FieldError>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={busy || title.trim().length === 0}>
          {busy ? "Adding…" : "Add bill"}
        </Button>
      </div>
    </form>
  );
}
