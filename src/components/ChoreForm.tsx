"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseRRule, buildRRule, nextOccurrences } from "@/lib/recurrence";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Label from "@/components/ui/Label";
import FieldError from "@/components/ui/FieldError";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { cn, formatOccurrenceDate } from "@/lib/utils";

interface Member {
  userId: string;
  name: string | null;
  email: string;
}

export interface ChoreInitial {
  id: string;
  title: string;
  description: string | null;
  rrule: string;
  assigneeUserIds: string[];
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
// Index 0=SU..6=SA, matching ByDay.day from parseRRule.
const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const WEEKDAY_NAMES: Record<string, string> = {
  MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat", SU: "Sun",
};

type Mode = "DAILY" | "WEEKLY" | "MONTHLY";
const MODES: { value: Mode; label: string; unit: string }[] = [
  { value: "DAILY", label: "Every day", unit: "day" },
  { value: "WEEKLY", label: "Every week", unit: "week" },
  { value: "MONTHLY", label: "Every month", unit: "month" },
];

const ORDINALS: { value: string; label: string }[] = [
  { value: "1", label: "1st" },
  { value: "2", label: "2nd" },
  { value: "3", label: "3rd" },
  { value: "4", label: "4th" },
  { value: "-1", label: "last" },
];

/** Local calendar date as YYYY-MM-DD (chores anchor to the day they're created). */
function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

/** Weekday codes the user picked, returned in Mon→Sun display order. */
function orderedDays(days: Set<string>): string[] {
  return WEEKDAYS.filter((d) => days.has(d.code)).map((d) => d.code);
}

export default function ChoreForm({
  householdId,
  members,
  initial,
}: {
  householdId: string;
  members: Member[];
  initial?: ChoreInitial;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const isEdit = !!initial;
  const today = useMemo(() => todayISO(), []);
  const seed = useMemo(() => (initial ? parseRRule(initial.rrule) : null), [initial]);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [mode, setMode] = useState<Mode>(
    seed && (seed.freq === "DAILY" || seed.freq === "WEEKLY" || seed.freq === "MONTHLY")
      ? seed.freq
      : "WEEKLY",
  );
  const [interval, setIntervalN] = useState(seed?.interval ?? 1);
  const [weekdays, setWeekdays] = useState<Set<string>>(
    new Set(seed?.byday.length ? seed.byday.map((b) => WEEKDAY_CODES[b.day]) : ["MO"]),
  );
  const [ordinal, setOrdinal] = useState<string>(() => {
    const withOrd = seed?.byday.find((b) => b.ordinal !== null);
    // Legacy ordinal-less monthly rules open as "1st <weekday>" (a valid option).
    return withOrd ? String(withOrd.ordinal) : "1";
  });
  // Recurrence start anchor — picked on create; on edit it's managed server-side.
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(seed?.until ?? "");
  const [assignees, setAssignees] = useState<Set<string>>(new Set(initial?.assigneeUserIds ?? []));
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => orderedDays(weekdays), [weekdays]);

  const rrule = useMemo(() => {
    const until = endDate || undefined;
    if (mode === "DAILY") return buildRRule({ freq: "DAILY", interval, until });
    if (mode === "WEEKLY") return buildRRule({ freq: "WEEKLY", interval, byday: days, until });
    return buildRRule({
      freq: "MONTHLY",
      interval,
      byday: days.map((c) => `${ordinal}${c}`),
      until,
    });
  }, [mode, interval, days, ordinal, endDate]);

  // Human-readable cadence, e.g. "Every 2nd Mon, Wed, until Sun, Aug 30".
  const summary = useMemo(() => {
    const every = interval > 1 ? `Every ${interval} ` : "Every ";
    const dayList = days.map((c) => WEEKDAY_NAMES[c]).join(", ");
    let base: string;
    if (mode === "DAILY") base = interval > 1 ? `${every}days` : "Every day";
    else if (mode === "WEEKLY")
      base = `${every}${interval > 1 ? "weeks" : "week"}${dayList ? ` on ${dayList}` : ""}`;
    else {
      const ord = ORDINALS.find((o) => o.value === ordinal)!.label;
      const phrase = dayList ? ` on the ${ord} ${dayList}` : "";
      base = `${every}${interval > 1 ? "months" : "month"}${phrase}`;
    }
    return endDate ? `${base}, until ${formatOccurrenceDate(endDate)}` : base;
  }, [mode, interval, days, ordinal, endDate]);

  // On create the schedule counts from the chosen start date; on edit it's anchored server-side.
  const anchor = isEdit ? today : startDate || today;
  const preview = useMemo(() => {
    if (!endDate) return [];
    return nextOccurrences(rrule, anchor, { from: anchor, count: 4 });
  }, [rrule, anchor, endDate]);

  function toggle(set: Set<string>, value: string): Set<string> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  const needsDays = mode === "WEEKLY" || mode === "MONTHLY";
  const missingDays = needsDays && weekdays.size === 0;
  // On create the start date is the floor for the end date; on edit it's today.
  const endFloor = isEdit ? today : startDate || today;
  const missingStart = !isEdit && (!startDate || startDate < today);
  const missingEnd = !endDate || endDate < endFloor;
  const canSubmit =
    title.trim().length > 0 &&
    assignees.size > 0 &&
    !missingDays &&
    !missingStart &&
    !missingEnd &&
    !submitting &&
    !deleting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(isEdit ? `/api/chores/${initial!.id}` : "/api/chores", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? {} : { householdId, startDate }),
          title: title.trim(),
          description: description.trim() || null,
          rrule,
          assigneeUserIds: Array.from(assignees),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not save the chore");
        return;
      }
      toast(isEdit ? "Chore updated" : "Chore created");
      router.push("/chores");
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!initial) return;
    const confirmed = await confirm({
      title: "Delete chore?",
      message: "This deletes the chore for everyone and removes its calendar events.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/chores/${initial.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Could not delete the chore");
        return;
      }
      toast("Chore deleted");
      router.push("/chores");
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-6" aria-busy={submitting || deleting}>
      {/* 1 — How often? Pick the cadence first. */}
      <fieldset className="rounded-2xl border border-line bg-surface p-4 shadow-card">
        <legend className="px-1 text-sm font-medium text-muted">How often?</legend>

        <p className="text-xs text-faint">
          {isEdit ? (
            "Lands on each connected housemate's Google Calendar."
          ) : (
            "Pick when it starts · lands on each connected housemate's Google Calendar."
          )}
        </p>

        {/* Repetition mode */}
        <div className="mt-3 flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              aria-pressed={mode === m.value}
              onClick={() => setMode(m.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                mode === m.value
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-line text-muted hover:bg-surface-2",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Interval */}
        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          <span>Repeat every</span>
          <Input
            type="number"
            min={1}
            max={52}
            value={interval}
            onChange={(e) => setIntervalN(Math.max(1, Math.min(52, Number(e.target.value) || 1)))}
            className="w-20 px-2 py-1.5"
            aria-label="Interval"
          />
          <span>
            {MODES.find((m) => m.value === mode)!.unit}
            {interval > 1 ? "s" : ""}
          </span>
        </div>

        {/* Monthly ordinal */}
        {mode === "MONTHLY" && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted">
            <span>Which week of the month?</span>
            <Select
              value={ordinal}
              onChange={(e) => setOrdinal(e.target.value)}
              className="w-auto py-1.5"
              aria-label="Which week of the month"
            >
              {ORDINALS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Weekday chips (weekly + monthly) */}
        {needsDays && (
          <div className="mt-3">
            <span className="text-sm text-muted">{mode === "MONTHLY" ? "Weekday" : "On"}</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => (
                <button
                  key={d.code}
                  type="button"
                  aria-pressed={weekdays.has(d.code)}
                  onClick={() => setWeekdays((s) => toggle(s, d.code))}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition",
                    weekdays.has(d.code)
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-line text-muted hover:bg-surface-2",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {missingDays && (
              <p className="mt-1.5 text-xs text-amber-600">Pick at least one day.</p>
            )}
          </div>
        )}

        {/* Start date (create only — edits are re-anchored server-side) */}
        {!isEdit && (
          <div className="mt-4">
            <Label htmlFor="start">Starts on</Label>
            <Input
              id="start"
              type="date"
              min={today}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1"
            />
            {startDate && startDate < today && (
              <p className="mt-1.5 text-xs text-amber-600">Start date can&apos;t be before today.</p>
            )}
          </div>
        )}

        {/* End date (required) */}
        <div className="mt-4">
          <Label htmlFor="end">Ends on</Label>
          <Input
            id="end"
            type="date"
            min={endFloor}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1"
          />
          {endDate && endDate < endFloor && (
            <p className="mt-1.5 text-xs text-amber-600">
              {isEdit ? "End date can't be before today." : "End date can't be before the start date."}
            </p>
          )}
        </div>

        {/* Summary + preview */}
        <div className="mt-4 rounded-xl bg-canvas p-3">
          <p className="text-sm font-medium text-muted">{summary}</p>
          {preview.length > 0 && (
            <p className="mt-1 text-xs text-muted">
              Next: {preview.map((d) => formatOccurrenceDate(d)).join(" · ")}
            </p>
          )}
          <p className="mt-2 font-mono text-[11px] text-faint">{rrule}</p>
        </div>
      </fieldset>

      {/* 2 — What is the chore? */}
      <fieldset>
        <legend className="text-sm font-medium text-muted">What&apos;s the chore?</legend>
        <div className="mt-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g. Take out the trash"
            className="mt-1"
          />
        </div>
        <div className="mt-4">
          <Label htmlFor="desc" optional>
            Description
          </Label>
          <Textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={2}
            className="mt-1"
          />
        </div>
      </fieldset>

      {/* 3 — Who's on it? One by default; add others to share. */}
      <fieldset>
        <legend className="text-sm font-medium text-muted">Who&apos;s on it?</legend>
        <p className="mt-0.5 text-xs text-faint">
          Assign it to one housemate — add others to share the load. Anyone assigned can complete it
          for everyone.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {members.map((m) => {
            const on = assignees.has(m.userId);
            return (
              <label
                key={m.userId}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",
                  on
                    ? "border-brand-500 bg-brand-50 shadow-glow"
                    : "border-line hover:border-line hover:bg-surface-2",
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => setAssignees((s) => toggle(s, m.userId))}
                  className="h-5 w-5 rounded border-line text-brand-600 focus:ring-brand-500"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {m.name ?? m.email}
                  </span>
                  <span className="block truncate text-xs text-faint">{m.email}</span>
                </span>
              </label>
            );
          })}
        </div>
        {assignees.size > 1 && (
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-medium text-accent-700">
            <span aria-hidden="true">👥</span>
            Shared — anyone assigned can clear it, on everyone&apos;s calendar.
          </p>
        )}
      </fieldset>

      <FieldError>{error}</FieldError>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!canSubmit} className="flex-1">
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create chore"}
        </Button>
        {isEdit && (
          <Button
            type="button"
            variant="danger"
            onClick={onDelete}
            disabled={deleting || submitting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        )}
      </div>
    </form>
  );
}
