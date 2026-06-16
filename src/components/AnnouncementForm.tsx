"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import FieldError from "@/components/ui/FieldError";
import { useToast } from "@/components/ui/Toast";

export default function AnnouncementForm({
  householdId,
  posterLabel,
}: {
  householdId: string;
  posterLabel: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
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
        body: JSON.stringify({ householdId, body, isAnonymous: anonymous }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not post your message");
        return;
      }
      setBody("");
      setAnonymous(false);
      toast("Posted to the board");
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="h-5 w-5 rounded border-line text-brand-600 focus:ring-brand-500"
            />
            Post anonymously
          </label>
          <p className="text-xs text-faint">
            {anonymous ? "Hidden from your roommates" : `Posting as ${posterLabel}`}
          </p>
        </div>
        <Button type="submit" disabled={busy || body.trim().length === 0}>
          {busy ? "Posting…" : "Post"}
        </Button>
      </div>
    </form>
  );
}
