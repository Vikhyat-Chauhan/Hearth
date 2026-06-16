// Household overview (server component): name, invite code to share, and members.
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getHouseholdContext, listMembers } from "@/lib/household";
import { EmptyState } from "@/components/states";
import PageHeader from "@/components/ui/PageHeader";
import LinkButton from "@/components/ui/LinkButton";
import RemoveMemberButton from "@/components/RemoveMemberButton";
import CopyInviteButton from "@/components/CopyInviteButton";
import LeaveHouseholdButton from "@/components/LeaveHouseholdButton";
import DeleteHouseholdButton from "@/components/DeleteHouseholdButton";
import TransferAdminControl from "@/components/TransferAdminControl";
import RenameHouseholdControl from "@/components/RenameHouseholdControl";

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
  const otherMembers = members
    .filter((m) => m.userId !== user.id)
    .map((m) => ({ userId: m.userId, label: m.name ?? m.email }));

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

      {role === "admin" && (
        <section className="mt-6 rounded-xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display text-base font-semibold text-ink">Household name</h2>
          <p className="mt-1 text-sm text-muted">Rename the household for everyone.</p>
          <div className="mt-3">
            <RenameHouseholdControl householdId={household.id} currentName={household.name} />
          </div>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-line bg-surface p-5 shadow-card">
        <h2 className="font-display text-base font-semibold text-ink">Invite code</h2>
        <p className="mt-1 text-sm text-muted">Share this so roommates can join.</p>
        <div className="mt-3 flex items-center gap-3">
          <p className="font-mono text-2xl tracking-widest">{household.inviteCode}</p>
          <CopyInviteButton code={household.inviteCode} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-base font-semibold text-ink">
          Members ({members.length})
        </h2>
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface shadow-card">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between px-4 py-3 transition hover:bg-canvas">
              <div>
                <p className="font-medium">{m.name ?? m.email}</p>
                <p className="text-sm text-muted">{m.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted">{m.role}</span>
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

      {/* Danger zone — leaving (members) / transferring + deleting (admin). */}
      <section className="mt-10 rounded-xl border border-red-200 bg-surface p-5 shadow-card">
        <h2 className="font-display text-base font-semibold text-red-700">Danger zone</h2>

        {role === "member" ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Leave this household. Your chore assignments and calendar events will be removed.
            </p>
            <LeaveHouseholdButton householdId={household.id} householdName={household.name} />
          </div>
        ) : (
          <div className="mt-3 space-y-5">
            {otherMembers.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted">Hand off the household</p>
                <p className="mt-1 text-sm text-muted">
                  Make another member the admin and leave. The household and its data stay.
                </p>
                <div className="mt-3">
                  <TransferAdminControl householdId={household.id} members={otherMembers} />
                </div>
              </div>
            )}

            <div className="border-t border-line pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  Delete this household for everyone. This removes all chores, shopping, bills,
                  expenses, and board posts. This can&apos;t be undone.
                </p>
                <DeleteHouseholdButton
                  householdId={household.id}
                  householdName={household.name}
                  memberCount={members.length}
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
