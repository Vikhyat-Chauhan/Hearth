"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseDollarsToCents } from "@/lib/utils";

type Member = { userId: string; name: string | null; email: string };

export default function SettlementForm({
  householdId,
  members,
  currentUserId,
}: {
  householdId: string;
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const others = members.filter((m) => m.userId !== currentUserId);
  const [fromUserId, setFromUserId] = useState(currentUserId);
  const [toUserId, setToUserId] = useState(others[0]?.userId ?? "");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function label(m: Member) {
    return m.name ?? m.email;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    if (fromUserId === toUserId) {
      setError("Pick two different members");
      return;
    }
    const amountCents = parseDollarsToCents(amount);
    if (amountCents === null || amountCents <= 0) {
      setError("Enter an amount like 10.00");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, fromUserId, toUserId, amountCents }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not record the payment");
        return;
      }
      setAmount("");
      router.refresh();
    } catch {
      setError("Could not record the payment");
    } finally {
      setBusy(false);
    }
  }

  if (members.length < 2) {
    return <p className="text-sm text-gray-500">Settlements need at least two members.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2 text-sm">
      <select
        value={fromUserId}
        onChange={(e) => setFromUserId(e.target.value)}
        aria-label="Payer"
        className="rounded-lg border border-gray-300 px-2 py-2 text-gray-700 focus:border-gray-500 focus:outline-none"
      >
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>{label(m)}</option>
        ))}
      </select>
      <span className="text-gray-400">paid</span>
      <select
        value={toUserId}
        onChange={(e) => setToUserId(e.target.value)}
        aria-label="Recipient"
        className="rounded-lg border border-gray-300 px-2 py-2 text-gray-700 focus:border-gray-500 focus:outline-none"
      >
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>{label(m)}</option>
        ))}
      </select>
      <div className="relative">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="0.00"
          className="w-24 rounded-lg border border-gray-300 py-2 pl-6 pr-2 focus:border-gray-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-gray-900 px-3 py-2 font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Record"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
