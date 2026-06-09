// Shopping list (server component): the shared household list. Any member can
// add, check/uncheck, or remove items.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getHouseholdContext } from "@/lib/household";
import { listShoppingItems } from "@/lib/shopping";
import { EmptyState } from "@/components/states";
import ShoppingForm from "@/components/ShoppingForm";
import ShoppingToggle from "@/components/ShoppingToggle";
import DeleteButton from "@/components/DeleteButton";

export default async function ShoppingPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const ctx = await getHouseholdContext(user.id);
  if (!ctx) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <EmptyState
          title="No household yet"
          description="Create or join a household to use the shopping list."
          action={
            <Link href="/household" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
              Go to household
            </Link>
          }
        />
      </main>
    );
  }

  const items = await listShoppingItems(ctx.household.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold">Shopping list</h1>
      <p className="mt-1 text-sm text-gray-500">Shared with everyone in {ctx.household.name}.</p>

      <div className="mt-6 rounded-xl border border-gray-200 p-4">
        <ShoppingForm householdId={ctx.household.id} />
      </div>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="The list is empty" description="Add the first item above." />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-200">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <ShoppingToggle itemId={item.id} checked={item.checked} />
              <div className="min-w-0 flex-1">
                <span className={`text-sm ${item.checked ? "text-gray-400 line-through" : "text-gray-800"}`}>
                  {item.name}
                </span>
                <span className="ml-2 text-xs text-gray-400">· {item.addedByName ?? item.addedByEmail}</span>
              </div>
              <DeleteButton endpoint={`/api/shopping/${item.id}`} label="Remove" />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
