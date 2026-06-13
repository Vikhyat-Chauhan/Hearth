"use client";

// Email-notification toggles. Each switch PATCHes /api/settings/notifications and
// rolls back on failure so the UI never drifts from the persisted state.

import { useState } from "react";

type Prefs = { notifyAnnouncements: boolean; notifyChores: boolean };

const TOGGLES: { key: keyof Prefs; label: string; hint: string }[] = [
  {
    key: "notifyAnnouncements",
    label: "Announcement emails",
    hint: "Email me when a roommate posts to the board.",
  },
  {
    key: "notifyChores",
    label: "Due-chore reminders",
    hint: "Email me a morning digest of chores due today.",
  },
];

export default function NotificationPrefs({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [busy, setBusy] = useState<keyof Prefs | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: keyof Prefs) {
    const next = !prefs[key];
    setBusy(key);
    setError(null);
    setPrefs((p) => ({ ...p, [key]: next })); // optimistic
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't save your preference");
      }
    } catch (err) {
      setPrefs((p) => ({ ...p, [key]: !next })); // roll back
      setError(err instanceof Error ? err.message : "Couldn't save your preference");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      {TOGGLES.map((t) => (
        <div
          key={t.key}
          className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800">{t.label}</p>
            <p className="text-xs text-gray-500">{t.hint}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs[t.key]}
            aria-label={t.label}
            disabled={busy === t.key}
            onClick={() => toggle(t.key)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition disabled:opacity-50 ${
              prefs[t.key] ? "bg-brand-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                prefs[t.key] ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      ))}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
