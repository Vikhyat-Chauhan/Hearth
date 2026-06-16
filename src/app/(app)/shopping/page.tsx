// Shopping list (server component): the shared household list. Any member can
// add, check/uncheck, or remove items.
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getHouseholdContext, getProfileName } from "@/lib/household";
import { listShoppingItems } from "@/lib/shopping";
import { EmptyState } from "@/components/states";
import PageHeader from "@/components/ui/PageHeader";
import LinkButton from "@/components/ui/LinkButton";
import ShoppingForm from "@/components/ShoppingForm";
import ShoppingToggle from "@/components/ShoppingToggle";
import DeleteButton from "@/components/DeleteButton";

export default async function ShoppingPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const ctx = await getHouseholdContext(user.id);
  if (!ctx) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          title="No household yet"
          description="Create or join a household to use the shopping list."
          icon="🛒"
          action={<LinkButton href="/household">Go to household</LinkButton>}
        />
      </main>
    );
  }

  const [items, posterLabel] = await Promise.all([
    listShoppingItems(ctx.household.id),
    getProfileName(user.id),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        eyebrow="The house list"
        icon="🛒"
        accent="brand"
        title="Shopping list"
        subtitle={`Shared with everyone in ${ctx.household.name}.`}
      />

      <div className="mt-6 rounded-xl border border-line bg-surface p-4 shadow-card">
        <ShoppingForm householdId={ctx.household.id} posterLabel={posterLabel} />
      </div>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="The list is empty" description="Add the first item above." />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-surface shadow-card">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-canvas">
              <ShoppingToggle itemId={item.id} checked={item.checked} />
              <div className="min-w-0 flex-1">
                <span className={`text-sm ${item.checked ? "text-faint line-through" : "text-ink"}`}>
                  {item.name}
                </span>
                <span className="ml-2 text-xs text-faint">· {item.addedByName ?? item.addedByEmail}</span>
              </div>
              <DeleteButton endpoint={`/api/shopping/${item.id}`} label="Remove" />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
