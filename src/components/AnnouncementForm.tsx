"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import FieldError from "@/components/ui/FieldError";

export default function AnnouncementForm({ householdId }: { householdId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, body }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not post your message");
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setError("Could not post your message");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2" aria-busy={busy}>
      <label htmlFor="announcement-body" className="sr-only">
        Announcement
      </label>
      <Textarea
        id="announcement-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share something with the household…"
        rows={3}
        maxLength={2000}
        required
        aria-describedby={error ? "announcement-error" : undefined}
      />
      <FieldError id="announcement-error">{error}</FieldError>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy || body.trim().length === 0}>
          {busy ? "Posting…" : "Post"}
        </Button>
      </div>
    </form>
  );
}
