// Edit/delete a chore (admin-only). Server-loads the chore, its assignees, and
// the household members, then renders the shared ChoreForm in edit mode.
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, chores, choreAssignments } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { isAdmin, listMembers } from "@/lib/household";
import ChoreForm from "@/components/ChoreForm";
import { EmptyState } from "@/components/states";

export default async function EditChorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/login");

  const [chore] = await db.select().from(chores).where(eq(chores.id, id)).limit(1);
  if (!chore) notFound();

  if (!(await isAdmin(user.id, chore.householdId))) {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <EmptyState
          title="Admins only"
          description="Only the household admin can edit chores."
          action={
            <Link href="/chores" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Back to chores
            </Link>
          }
        />
      </main>
    );
  }

  const [assignmentRows, members] = await Promise.all([
    db.select({ userId: choreAssignments.userId }).from(choreAssignments).where(eq(choreAssignments.choreId, id)),
    listMembers(chore.householdId),
  ]);

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold">Edit chore</h1>
      <p className="mt-2 text-sm text-gray-500">Update the details, reassign, or delete the chore.</p>
      <ChoreForm
        householdId={chore.householdId}
        members={members.map((m) => ({ userId: m.userId, name: m.name, email: m.email }))}
        initial={{
          id: chore.id,
          title: chore.title,
          description: chore.description,
          rrule: chore.rrule,
          assigneeUserIds: assignmentRows.map((a) => a.userId),
        }}
      />
    </main>
  );
}
