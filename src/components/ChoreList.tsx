// Flat, date-sorted list of upcoming chore occurrences (shared by the "My chores"
// and "All chores" tabs). Occurrences from every chore are flattened, sorted by
// date, and grouped under a date header — so the view reads as "what's coming up
// next" rather than a per-chore breakdown. A pinned "Today" section always sits
// on top (showing today's occurrences, or an explicit empty state when none) so
// the viewer is always oriented on what's due today. When `interactive`, each row
// renders a Mark-done button; otherwise the done state is shown read-only.
import Link from "next/link";
import type { MyChore, ChoreAssignee } from "@/lib/chores";
import { isFutureOccurrence } from "@/lib/recurrence";
import MarkDoneButton from "@/components/MarkDoneButton";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Join names naturally: ["A"]→"A", ["A","B"]→"A and B", ["A","B","C"]→"A, B and C". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

type Row = {
  date: string;
  done: boolean;
  choreId: string;
  title: string;
  assignees: ChoreAssignee[];
};

export default function ChoreList({
  chores,
  isAdmin,
  today,
  interactive = false,
}: {
  chores: MyChore[];
  isAdmin: boolean;
  /** Viewer's local today (YYYY-MM-DD) — an occurrence after it is upcoming/locked. */
  today: string;
  interactive?: boolean;
}) {
  // Flatten every chore's occurrences into a single row list, then sort by date
  // (YYYY-MM-DD string compare is chronological), tie-breaking on title.
  const rows: Row[] = chores
    .flatMap((chore) =>
      chore.occurrences.map((occ) => ({
        date: occ.date,
        done: occ.done,
        choreId: chore.id,
        title: chore.title,
        assignees: chore.assignees,
      })),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));

  // Today's occurrences are pinned to a dedicated section that always renders;
  // everything else is grouped under per-date headers below it.
  const todayRows = rows.filter((row) => row.date === today);
  const sections: { date: string; rows: Row[] }[] = [];
  for (const row of rows) {
    if (row.date === today) continue;
    const last = sections[sections.length - 1];
    if (last && last.date === row.date) last.rows.push(row);
    else sections.push({ date: row.date, rows: [row] });
  }

  const renderRow = (row: Row) => {
    const others = row.assignees.filter((a) => !a.isSelf);
    const sharedNames = interactive
      ? others.map((a) => a.name ?? a.email)
      : row.assignees.map((a) => a.name ?? a.email);
    return (
      <li
        key={`${row.choreId}-${row.date}`}
        className="relative flex items-center justify-between gap-3 border-b border-line px-4 py-3 transition last:border-b-0 hover:bg-canvas"
      >
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-brand-400" />
        <div className="min-w-0">
          <span
            className={`font-display text-sm font-semibold ${
              row.done ? "text-faint line-through" : "text-ink"
            }`}
          >
            {row.title}
          </span>
          {sharedNames.length > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-700 dark:bg-accent-900/40 dark:text-accent-200">
              <span aria-hidden="true">👥</span>
              {interactive ? `Shared with ${joinNames(sharedNames)}` : joinNames(sharedNames)}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {interactive ? (
            <MarkDoneButton
              choreId={row.choreId}
              occurrenceDate={row.date}
              done={row.done}
              upcoming={isFutureOccurrence(row.date, today)}
            />
          ) : row.done ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
              <span aria-hidden="true">✓</span> Done
            </span>
          ) : null}
          {isAdmin && (
            <Link
              href={`/chores/${row.choreId}/edit`}
              className="text-sm text-muted hover:text-ink"
            >
              Edit
            </Link>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="mt-6 space-y-6">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Today</h2>
        {todayRows.length > 0 ? (
          <ul className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            {todayRows.map(renderRow)}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-3 text-sm text-faint">
            Nothing due today 🎉
          </p>
        )}
      </section>

      {sections.map((section) => (
        <section key={section.date}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {formatDate(section.date)}
          </h2>
          <ul className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            {section.rows.map(renderRow)}
          </ul>
        </section>
      ))}
    </div>
  );
}
