"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseDollarsToCents } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import CurrencyInput from "@/components/ui/CurrencyInput";
import FieldError from "@/components/ui/FieldError";

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
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-center gap-2 text-sm"
      aria-busy={busy}
    >
      <Select
        value={fromUserId}
        onChange={(e) => setFromUserId(e.target.value)}
        aria-label="Payer"
        className="w-auto"
      >
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>{label(m)}</option>
        ))}
      </Select>
      <span className="text-gray-400">paid</span>
      <Select
        value={toUserId}
        onChange={(e) => setToUserId(e.target.value)}
        aria-label="Recipient"
        className="w-auto"
      >
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>{label(m)}</option>
        ))}
      </Select>
      <CurrencyInput
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        aria-label="Amount in dollars"
        aria-describedby={error ? "settlement-error" : undefined}
        className="w-24"
      />
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? "Saving…" : "Record"}
      </Button>
      {error && (
        <div className="w-full">
          <FieldError id="settlement-error">{error}</FieldError>
        </div>
      )}
    </form>
  );
}
