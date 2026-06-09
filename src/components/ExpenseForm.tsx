"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseDollarsToCents, splitEqually } from "@/lib/utils";

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
      router.refresh();
    } catch {
      setError("Could not add the expense");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label htmlFor="expense-description" className="sr-only">
        Expense description
      </label>
      <input
        id="expense-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What was it for? (e.g. Groceries)"
        maxLength={200}
        required
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
      />
      <div className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor="expense-amount" className="sr-only">
            Amount in dollars
          </label>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
          <input
            id="expense-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            required
            className="w-full rounded-lg border border-gray-300 py-2 pl-7 pr-3 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
        <select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          aria-label="Paid by"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-gray-500 focus:outline-none"
        >
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.userId === currentUserId ? "I paid" : `${label(m)} paid`}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="rounded-lg border border-gray-200 p-3">
        <legend className="px-1 text-xs font-medium text-gray-500">Split equally between</legend>
        <div className="flex flex-wrap gap-3">
          {members.map((m) => (
            <label key={m.userId} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={sharers.has(m.userId)}
                onChange={() => toggleSharer(m.userId)}
                className="h-4 w-4 rounded border-gray-300"
              />
              {label(m)}
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy || description.trim().length === 0}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add expense"}
        </button>
      </div>
    </form>
  );
}
