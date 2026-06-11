// Card list for chores (shared by the "My chores" and "All chores" tabs).
// When `interactive`, each occurrence renders a Mark-done button; otherwise the
// done state is shown read-only.
import Link from "next/link";
import type { MyChore } from "@/lib/chores";
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

export default function ChoreList({
  chores,
  isAdmin,
  interactive = false,
}: {
  chores: MyChore[];
  isAdmin: boolean;
  interactive?: boolean;
}) {
  return (
    <ul className="mt-6 space-y-4">
      {chores.map((chore) => {
        const others = chore.assignees.filter((a) => !a.isSelf);
        const sharedNames = interactive
          ? others.map((a) => a.name ?? a.email)
          : chore.assignees.map((a) => a.name ?? a.email);
        return (
          <li
            key={chore.id}
            className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-glow"
          >
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-brand-400" />
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-gray-900">{chore.title}</h2>
              {isAdmin && (
                <Link
                  href={`/chores/${chore.id}/edit`}
                  className="shrink-0 text-sm text-gray-500 hover:text-gray-900"
                >
                  Edit
                </Link>
              )}
            </div>
            {chore.description && <p className="mt-1 text-sm text-gray-500">{chore.description}</p>}

            {sharedNames.length > 0 && (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-medium text-accent-700">
                <span aria-hidden="true">👥</span>
                {interactive ? `Shared with ${joinNames(sharedNames)}` : joinNames(sharedNames)}
              </p>
            )}

            <ul className="mt-3 divide-y divide-gray-100">
              {chore.occurrences.length === 0 ? (
                <li className="py-2 text-sm text-gray-400">No upcoming occurrences.</li>
              ) : (
                chore.occurrences.map((occ) => (
                  <li
                    key={occ.date}
                    className="-mx-2 flex items-center justify-between rounded-lg px-2 py-2 transition hover:bg-stone-50"
                  >
                    <span className={`text-sm ${occ.done ? "text-gray-400 line-through" : "text-gray-700"}`}>
                      {formatDate(occ.date)}
                    </span>
                    {interactive ? (
                      <MarkDoneButton choreId={chore.id} occurrenceDate={occ.date} done={occ.done} />
                    ) : occ.done ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        <span aria-hidden="true">✓</span> Done
                      </span>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
