"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Member {
  userId: string;
  name: string | null;
  email: string;
}

const WEEKDAYS: { code: string; label: string }[] = [
  { code: "MO", label: "Mon" },
  { code: "TU", label: "Tue" },
  { code: "WE", label: "Wed" },
  { code: "TH", label: "Thu" },
  { code: "FR", label: "Fri" },
  { code: "SA", label: "Sat" },
  { code: "SU", label: "Sun" },
];

type Freq = "DAILY" | "WEEKLY" | "MONTHLY";

export default function ChoreForm({
  householdId,
  members,
}: {
  householdId: string;
  members: Member[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [freq, setFreq] = useState<Freq>("WEEKLY");
  const [interval, setIntervalN] = useState(1);
  const [byday, setByday] = useState<Set<string>>(new Set(["MO"]));
  const [monthday, setMonthday] = useState(1);
  const [assignees, setAssignees] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rrule = useMemo(() => {
    const parts = [`FREQ=${freq}`];
    if (interval > 1) parts.push(`INTERVAL=${interval}`);
    if (freq === "WEEKLY" && byday.size > 0) {
      parts.push(`BYDAY=${WEEKDAYS.filter((d) => byday.has(d.code)).map((d) => d.code).join(",")}`);
    }
    if (freq === "MONTHLY") parts.push(`BYMONTHDAY=${monthday}`);
    return parts.join(";");
  }, [freq, interval, byday, monthday]);

  function toggle(set: Set<string>, value: string): Set<string> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  const weeklyNeedsDay = freq === "WEEKLY" && byday.size === 0;
  const canSubmit =
    title.trim().length > 0 && assignees.size > 0 && !weeklyNeedsDay && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/chores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          title: title.trim(),
          description: description.trim() || null,
          rrule,
          assigneeUserIds: Array.from(assignees),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not create the chore");
        return;
      }
      router.push("/chores");
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="e.g. Take out the trash"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none"
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="desc" className="block text-sm font-medium text-gray-700">
          Description <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          rows={2}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-gray-700">Recurrence</legend>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-gray-500">Every</span>
          <input
            type="number"
            min={1}
            max={52}
            value={interval}
            onChange={(e) => setIntervalN(Math.max(1, Number(e.target.value)))}
            className="w-16 rounded-lg border border-gray-300 px-2 py-1.5"
          />
          <select
            value={freq}
            onChange={(e) => setFreq(e.target.value as Freq)}
            className="rounded-lg border border-gray-300 px-2 py-1.5"
          >
            <option value="DAILY">day(s)</option>
            <option value="WEEKLY">week(s)</option>
            <option value="MONTHLY">month(s)</option>
          </select>
        </div>

        {freq === "WEEKLY" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => (
              <button
                key={d.code}
                type="button"
                onClick={() => setByday((s) => toggle(s, d.code))}
                className={`rounded-full border px-3 py-1 text-sm ${
                  byday.has(d.code)
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}

        {freq === "MONTHLY" && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <span>on day</span>
            <input
              type="number"
              min={1}
              max={31}
              value={monthday}
              onChange={(e) => setMonthday(Math.min(31, Math.max(1, Number(e.target.value))))}
              className="w-16 rounded-lg border border-gray-300 px-2 py-1.5"
            />
            <span>of the month</span>
          </div>
        )}

        <p className="mt-2 font-mono text-xs text-gray-400">{rrule}</p>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-gray-700">Assign to</legend>
        <div className="mt-2 space-y-1">
          {members.map((m) => (
            <label key={m.userId} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={assignees.has(m.userId)}
                onChange={() => setAssignees((s) => toggle(s, m.userId))}
              />
              <span className="text-sm">{m.name ?? m.email}</span>
              <span className="text-xs text-gray-400">{m.email}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-lg bg-gray-900 px-4 py-2.5 font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create chore"}
      </button>
    </form>
  );
}
