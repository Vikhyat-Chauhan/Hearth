// Chores (server component): two views — "My chores" (the viewer's assigned
// chores with their upcoming occurrences and honor-system done state) and "All
// chores" (every chore in the household). The view switcher lives in <ChoreTabs>.
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getHouseholdContext } from "@/lib/household";
import { getMyChores, getHouseholdChores } from "@/lib/chores";
import { EmptyState } from "@/components/states";
import PageHeader from "@/components/ui/PageHeader";
import LinkButton from "@/components/ui/LinkButton";
import ChoreTabs from "@/components/ChoreTabs";

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

  const isAdmin = ctx.role === "admin";
  const [myChores, allChores] = await Promise.all([
    getMyChores(user.id),
    getHouseholdChores(user.id),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        eyebrow="Your tasks"
        icon="✓"
        accent="brand"
        title="Chores"
        action={
          isAdmin ? (
            <LinkButton href="/chores/new" size="sm">
              <span aria-hidden="true">＋</span> New chore
            </LinkButton>
          ) : undefined
        }
      />

      <ChoreTabs myChores={myChores} allChores={allChores} isAdmin={isAdmin} />
    </main>
  );
}
