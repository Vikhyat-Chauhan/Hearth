"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; name: string; role: string };

/** Dropdown to switch the active household. Only rendered when a user belongs
 * to more than one household. */
export default function HouseholdSwitcher({
  households,
  activeId,
}: {
  households: Option[];
  activeId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const householdId = e.target.value;
    if (householdId === activeId || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/households/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={activeId}
      onChange={onChange}
      disabled={busy}
      aria-label="Active household"
      className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none disabled:opacity-50"
    >
      {households.map((h) => (
        <option key={h.id} value={h.id}>
          {h.name}
        </option>
      ))}
    </select>
  );
}
