// My chores (server component): chores assigned to the current user with their
// upcoming occurrences and honor-system done state.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getHouseholdContext } from "@/lib/household";
import { getMyChores } from "@/lib/chores";
import { EmptyState } from "@/components/states";
import PageHeader from "@/components/ui/PageHeader";
import LinkButton from "@/components/ui/LinkButton";
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
  if (!user) redirect("/");

  const ctx = await getHouseholdContext(user.id);
  if (!ctx) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          title="No household yet"
          description="Create or join a household to start seeing your chores."
          icon="✓"
          action={<LinkButton href="/household">Go to household</LinkButton>}
        />
      </main>
    );
  }

  const myChores = await getMyChores(user.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        eyebrow="Your tasks"
        icon="✓"
        accent="brand"
        title="My chores"
        action={
          ctx.role === "admin" ? (
            <LinkButton href="/chores/new" size="sm">
              <span aria-hidden="true">＋</span> New chore
            </LinkButton>
          ) : undefined
        }
      />


      {myChores.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No chores assigned to you"
            description={
              ctx.role === "admin"
                ? "Assign a recurring chore to yourself or a roommate to get started."
                : "When the admin assigns you a chore, it'll show up here."
            }
            icon="🧹"
            action={
              ctx.role === "admin" ? (
                <LinkButton href="/chores/new">Assign a chore</LinkButton>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {myChores.map((chore) => (
            <li
              key={chore.id}
              className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-glow"
            >
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-brand-400" />
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-gray-900">{chore.title}</h2>
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
                    <li
                      key={occ.date}
                      className="-mx-2 flex items-center justify-between rounded-lg px-2 py-2 transition hover:bg-stone-50"
                    >
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
