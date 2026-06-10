"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseDollarsToCents, splitEqually } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import CurrencyInput from "@/components/ui/CurrencyInput";
import FieldError from "@/components/ui/FieldError";
import { useToast } from "@/components/ui/Toast";

type Member = { userId: string; name: string | null; email: string };

export default function ExpenseForm({
  householdId,
  members,
  currentUserId,
}: {
  householdId: string;
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(currentUserId);
  // Who shares the cost — default everyone.
  const [sharers, setSharers] = useState<Set<string>>(new Set(members.map((m) => m.userId)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSharer(userId: string) {
    setSharers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function label(m: Member) {
    return m.name ?? m.email;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const amountCents = parseDollarsToCents(amount);
    if (amountCents === null || amountCents <= 0) {
      setError("Enter an amount like 24.00");
      return;
    }
    const sharerIds = members.map((m) => m.userId).filter((id) => sharers.has(id));
    if (sharerIds.length === 0) {
      setError("Pick at least one person to split between");
      return;
    }

    const shares = splitEqually(amountCents, sharerIds.length);
    const splits = sharerIds.map((userId, i) => ({ userId, shareCents: shares[i] }));

    setBusy(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, description, amountCents, paidBy, splits }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not add the expense");
        return;
      }
      setDescription("");
      setAmount("");
      toast("Expense added");
      router.refresh();
    } catch {
      setError("Could not add the expense");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" aria-busy={busy}>
      <label htmlFor="expense-description" className="sr-only">
        Expense description
      </label>
      <Input
        id="expense-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What was it for? (e.g. Groceries)"
        maxLength={200}
        required
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor="expense-amount" className="sr-only">
            Amount in dollars
          </label>
          <CurrencyInput
            id="expense-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            aria-describedby={error ? "expense-error" : undefined}
          />
        </div>
        <Select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          aria-label="Paid by"
          className="w-auto"
        >
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.userId === currentUserId ? "I paid" : `${label(m)} paid`}
            </option>
          ))}
        </Select>
      </div>

      <fieldset className="rounded-lg border border-gray-200 p-3">
        <legend className="px-1 text-xs font-medium text-gray-500">Split equally between</legend>
        <div className="flex flex-wrap gap-1">
          {members.map((m) => (
            <label
              key={m.userId}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={sharers.has(m.userId)}
                onChange={() => toggleSharer(m.userId)}
                className="h-5 w-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              {label(m)}
            </label>
          ))}
        </div>
      </fieldset>

      <FieldError id="expense-error">{error}</FieldError>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={busy || description.trim().length === 0}>
          {busy ? "Adding…" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
