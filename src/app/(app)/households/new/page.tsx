"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import FieldError from "@/components/ui/FieldError";
import PageHeader from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";

export default function NewHouseholdPage() {
  const router = useRouter();
  const { toast } = useToast();
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
      toast("Household created");
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
      <PageHeader
        title="Create a household"
        subtitle="You'll become the admin and get an invite code to share with your roommates."
      />

      <form onSubmit={onSubmit} className="mt-6 space-y-4" aria-busy={submitting}>
        <div>
          <Label htmlFor="name">Household name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="e.g. Apt 4B"
            className="mt-1"
            aria-describedby={error ? "household-error" : undefined}
            autoFocus
          />
        </div>

        <FieldError id="household-error">{error}</FieldError>

        <Button
          type="submit"
          disabled={submitting || name.trim().length === 0}
          className="w-full"
        >
          {submitting ? "Creating…" : "Create household"}
        </Button>
      </form>
    </main>
  );
}
