// Read-only, reverse-chronological list of recently completed chore occurrences
// (the History tab). The natural unit here is a completed event, not a chore, so
// this does not reuse the chore-grouped <ChoreList>.
import type { ChoreHistoryEntry } from "@/lib/chores";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function ChoreHistoryList({ entries }: { entries: ChoreHistoryEntry[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {entries.map((entry) => (
        <li
          key={`${entry.choreId}-${entry.date}`}
          className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-card"
        >
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-green-400" />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate font-display text-base font-semibold text-gray-900">
                {entry.title}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {formatDate(entry.date)} · by {entry.isSelf ? "you" : entry.completedByName ?? entry.completedByEmail}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
              <span aria-hidden="true">✓</span> Done
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
