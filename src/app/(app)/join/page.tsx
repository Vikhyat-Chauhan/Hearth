"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/households/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not join the household");
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
      <h1 className="text-2xl font-bold">Join a household</h1>
      <p className="mt-2 text-sm text-gray-500">
        Enter the invite code your main roommate shared with you.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Invite code
          </label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. K7QMP2RX"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono tracking-widest focus:border-gray-500 focus:outline-none"
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
          disabled={submitting || code.trim().length === 0}
          className="w-full rounded-lg bg-gray-900 px-4 py-2.5 font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
        >
          {submitting ? "Joining…" : "Join household"}
        </button>
      </form>
    </main>
  );
}
