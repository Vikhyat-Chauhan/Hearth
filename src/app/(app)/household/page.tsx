// Household overview (server component): name, invite code to share, and members.
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getHouseholdContext, listMembers } from "@/lib/household";
import { EmptyState } from "@/components/states";
import PageHeader from "@/components/ui/PageHeader";
import LinkButton from "@/components/ui/LinkButton";
import RemoveMemberButton from "@/components/RemoveMemberButton";
import CopyInviteButton from "@/components/CopyInviteButton";

export default async function HouseholdPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const ctx = await getHouseholdContext(user.id);
  if (!ctx) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          title="You're not in a household yet"
          description="Create one to become the admin, or join an existing household with an invite code."
          icon="🏠"
          action={
            <div className="flex gap-3">
              <LinkButton href="/households/new">Create a household</LinkButton>
              <LinkButton href="/join" variant="secondary">
                Join with a code
              </LinkButton>
            </div>
          }
        />
      </main>
    );
  }

  const { household, role } = ctx;
  const members = await listMembers(household.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        eyebrow="Your household"
        icon="🏠"
        accent="accent"
        title={household.name}
        action={
          <span className="rounded-full bg-accent-50 px-3 py-1 text-xs font-medium capitalize text-accent-700 ring-1 ring-inset ring-accent-100">
            You are {role}
          </span>
        }
      />

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-card">
        <h2 className="font-display text-base font-semibold text-gray-900">Invite code</h2>
        <p className="mt-1 text-sm text-gray-500">Share this so roommates can join.</p>
        <div className="mt-3 flex items-center gap-3">
          <p className="font-mono text-2xl tracking-widest">{household.inviteCode}</p>
          <CopyInviteButton code={household.inviteCode} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-base font-semibold text-gray-900">
          Members ({members.length})
        </h2>
        <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-card">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between px-4 py-3 transition hover:bg-stone-50">
              <div>
                <p className="font-medium">{m.name ?? m.email}</p>
                <p className="text-sm text-gray-500">{m.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-500">{m.role}</span>
                {role === "admin" && m.userId !== user.id && (
                  <RemoveMemberButton householdId={household.id} userId={m.userId} name={m.name ?? m.email} />
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {role === "admin" && (
        <div className="mt-6">
          <LinkButton href="/chores/new">
            <span aria-hidden="true">＋</span> Assign a chore
          </LinkButton>
        </div>
      )}
    </main>
  );
}
