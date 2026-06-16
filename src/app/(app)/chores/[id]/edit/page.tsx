// Edit/delete a chore (admin-only). Server-loads the chore, its assignees, and
// the household members, then renders the shared ChoreForm in edit mode.
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, chores, choreAssignments } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { isAdmin, listMembers } from "@/lib/household";
import { stripScheduleSuffix } from "@/lib/recurrence";
import ChoreForm from "@/components/ChoreForm";
import { EmptyState } from "@/components/states";
import PageHeader from "@/components/ui/PageHeader";
import LinkButton from "@/components/ui/LinkButton";

export default async function EditChorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/");

  const [chore] = await db.select().from(chores).where(eq(chores.id, id)).limit(1);
  if (!chore) notFound();

  if (!(await isAdmin(user.id, chore.householdId))) {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <EmptyState
          title="Admins only"
          description="Only the household admin can edit chores."
          action={
            <LinkButton href="/chores" variant="secondary">
              Back to chores
            </LinkButton>
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
      <Link href="/chores" className="text-sm text-muted transition hover:text-ink">
        <span aria-hidden="true">←</span> Back to chores
      </Link>
      <div className="mt-2">
        <PageHeader
          eyebrow="Edit"
          icon="✓"
          accent="brand"
          title="Edit chore"
          subtitle="Update the details, reassign, or delete the chore."
        />
      </div>
      <ChoreForm
        householdId={chore.householdId}
        members={members.map((m) => ({ userId: m.userId, name: m.name, email: m.email }))}
        initial={{
          id: chore.id,
          // Show just the base name; the schedule suffix is re-derived on save.
          title: stripScheduleSuffix(chore.title),
          description: chore.description,
          rrule: chore.rrule,
          assigneeUserIds: assignmentRows.map((a) => a.userId),
        }}
      />
    </main>
  );
}
