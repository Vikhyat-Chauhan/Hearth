"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ShoppingForm({ householdId }: { householdId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || name.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, name }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not add the item");
        return;
      }
      setName("");
      router.refresh();
    } catch {
      setError("Could not add the item");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex gap-2">
        <label htmlFor="shopping-item" className="sr-only">
          Item name
        </label>
        <input
          id="shopping-item"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add an item…"
          maxLength={120}
          required
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || name.trim().length === 0}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
