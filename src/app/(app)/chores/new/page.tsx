// Create & assign a chore (admin-only). Server-loads the admin's household and
// members, then renders the client form.
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getHouseholdContext, listMembers } from "@/lib/household";
import ChoreForm from "@/components/ChoreForm";
import { EmptyState } from "@/components/states";
import PageHeader from "@/components/ui/PageHeader";
import LinkButton from "@/components/ui/LinkButton";

export default async function NewChorePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const ctx = await getHouseholdContext(user.id);
  if (!ctx) {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <EmptyState
          title="No household yet"
          description="Create or join a household before assigning chores."
          icon="🧹"
          action={<LinkButton href="/household">Go to household</LinkButton>}
        />
      </main>
    );
  }

  if (ctx.role !== "admin") {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <EmptyState
          title="Admins only"
          description="Only the household admin can create and assign chores. Chores assigned to you appear under My Chores."
          action={
            <LinkButton href="/chores" variant="secondary">
              View my chores
            </LinkButton>
          }
        />
      </main>
    );
  }

  const members = await listMembers(ctx.household.id);

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <PageHeader
        eyebrow="Assign a chore"
        icon="✓"
        accent="brand"
        title="New chore"
        subtitle={`Assign a recurring chore to one or more members of ${ctx.household.name}. It will appear on each connected member's Google Calendar.`}
      />
      <ChoreForm
        householdId={ctx.household.id}
        members={members.map((m) => ({ userId: m.userId, name: m.name, email: m.email }))}
      />
    </main>
  );
}
