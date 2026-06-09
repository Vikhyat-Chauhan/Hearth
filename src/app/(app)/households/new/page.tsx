"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewHouseholdPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not create the household");
        return;
      }
      router.push("/household");
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold">Create a household</h1>
      <p className="mt-2 text-sm text-gray-500">
        You&apos;ll become the admin and get an invite code to share with your roommates.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Household name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="e.g. Apt 4B"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none"
            autoFocus
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || name.trim().length === 0}
          className="w-full rounded-lg bg-gray-900 px-4 py-2.5 font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create household"}
        </button>
      </form>
    </main>
  );
}
