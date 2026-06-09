// Create & assign a chore (admin-only). Server-loads the admin's household and
// members, then renders the client form.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getHouseholdContext, listMembers } from "@/lib/household";
import ChoreForm from "@/components/ChoreForm";
import { EmptyState } from "@/components/states";

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
          action={
            <Link href="/household" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
              Go to household
            </Link>
          }
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
            <Link href="/chores" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              View my chores
            </Link>
          }
        />
      </main>
    );
  }

  const members = await listMembers(ctx.household.id);

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold">New chore</h1>
      <p className="mt-2 text-sm text-gray-500">
        Assign a recurring chore to one or more members of {ctx.household.name}. It will appear on
        each connected member&apos;s Google Calendar.
      </p>
      <ChoreForm
        householdId={ctx.household.id}
        members={members.map((m) => ({ userId: m.userId, name: m.name, email: m.email }))}
      />
    </main>
  );
}
