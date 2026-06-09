// My chores (server component): chores assigned to the current user with their
// upcoming occurrences and honor-system done state.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getHouseholdContext } from "@/lib/household";
import { getMyChores } from "@/lib/chores";
import { EmptyState } from "@/components/states";
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

export default async function ChoresPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const ctx = await getHouseholdContext(user.id);
  if (!ctx) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <EmptyState
          title="No household yet"
          description="Create or join a household to start seeing your chores."
          action={
            <Link href="/household" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
              Go to household
            </Link>
          }
        />
      </main>
    );
  }

  const myChores = await getMyChores(user.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My chores</h1>
        {ctx.role === "admin" && (
          <Link href="/chores/new" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
            + New chore
          </Link>
        )}
      </div>

      {myChores.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No chores assigned to you"
            description={
              ctx.role === "admin"
                ? "Assign a recurring chore to yourself or a roommate to get started."
                : "When the admin assigns you a chore, it'll show up here."
            }
            action={
              ctx.role === "admin" ? (
                <Link href="/chores/new" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
                  Assign a chore
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {myChores.map((chore) => (
            <li key={chore.id} className="rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold">{chore.title}</h2>
                {ctx.role === "admin" && (
                  <Link href={`/chores/${chore.id}/edit`} className="shrink-0 text-sm text-gray-500 hover:text-gray-900">
                    Edit
                  </Link>
                )}
              </div>
              {chore.description && <p className="mt-1 text-sm text-gray-500">{chore.description}</p>}

              <ul className="mt-3 divide-y divide-gray-100">
                {chore.occurrences.length === 0 ? (
                  <li className="py-2 text-sm text-gray-400">No upcoming occurrences.</li>
                ) : (
                  chore.occurrences.map((occ) => (
                    <li key={occ.date} className="flex items-center justify-between py-2">
                      <span className={`text-sm ${occ.done ? "text-gray-400 line-through" : "text-gray-700"}`}>
                        {formatDate(occ.date)}
                      </span>
                      <MarkDoneButton choreId={chore.id} occurrenceDate={occ.date} done={occ.done} />
                    </li>
                  ))
                )}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
