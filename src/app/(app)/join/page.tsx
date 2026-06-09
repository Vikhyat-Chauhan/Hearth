"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import FieldError from "@/components/ui/FieldError";

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

      <form onSubmit={onSubmit} className="mt-6 space-y-4" aria-busy={submitting}>
        <div>
          <Label htmlFor="code">Invite code</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. K7QMP2RX"
            className="mt-1 font-mono tracking-widest"
            aria-describedby={error ? "join-error" : undefined}
            autoFocus
          />
        </div>

        <FieldError id="join-error">{error}</FieldError>

        <Button
          type="submit"
          disabled={submitting || code.trim().length === 0}
          className="w-full"
        >
          {submitting ? "Joining…" : "Join household"}
        </Button>
      </form>
    </main>
  );
}
