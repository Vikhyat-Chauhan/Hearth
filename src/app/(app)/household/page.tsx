// Household overview (server component): name, invite code to share, and members.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getHouseholdContext, listMembers } from "@/lib/household";
import { EmptyState } from "@/components/states";

export default async function HouseholdPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const ctx = await getHouseholdContext(user.id);
  if (!ctx) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <EmptyState
          title="You're not in a household yet"
          description="Create one to become the admin, or join an existing household with an invite code."
          action={
            <div className="flex gap-3">
              <Link href="/households/new" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
                Create a household
              </Link>
              <Link href="/join" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Join with a code
              </Link>
            </div>
          }
        />
      </main>
    );
  }

  const { household, role } = ctx;
  const members = await listMembers(household.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{household.name}</h1>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          You are {role}
        </span>
      </div>

      <section className="mt-6 rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700">Invite code</h2>
        <p className="mt-1 text-sm text-gray-500">Share this so roommates can join.</p>
        <p className="mt-3 font-mono text-2xl tracking-widest">{household.inviteCode}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-gray-700">
          Members ({members.length})
        </h2>
        <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{m.name ?? m.email}</p>
                <p className="text-sm text-gray-500">{m.email}</p>
              </div>
              <span className="text-xs font-medium text-gray-500">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      {role === "admin" && (
        <div className="mt-6">
          <Link href="/chores/new" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
            + Assign a chore
          </Link>
        </div>
      )}
    </main>
  );
}
