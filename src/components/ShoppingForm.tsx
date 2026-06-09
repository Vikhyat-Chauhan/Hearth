"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FieldError from "@/components/ui/FieldError";

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
    <form onSubmit={onSubmit} className="space-y-2" aria-busy={busy}>
      <div className="flex gap-2">
        <label htmlFor="shopping-item" className="sr-only">
          Item name
        </label>
        <Input
          id="shopping-item"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add an item…"
          maxLength={120}
          required
          aria-describedby={error ? "shopping-error" : undefined}
          className="flex-1"
        />
        <Button type="submit" disabled={busy || name.trim().length === 0}>
          {busy ? "Adding…" : "Add"}
        </Button>
      </div>
      <FieldError id="shopping-error">{error}</FieldError>
    </form>
  );
}
