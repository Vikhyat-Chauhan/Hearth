// Bills (server component): shared utilities/bills tracking. Any member can add,
// mark paid/unpaid, or remove. Amounts are stored and summed as integer cents.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getHouseholdContext } from "@/lib/household";
import { listBills } from "@/lib/bills";
import { formatCents } from "@/lib/utils";
import { EmptyState } from "@/components/states";
import BillForm from "@/components/BillForm";
import BillPaidToggle from "@/components/BillPaidToggle";
import DeleteButton from "@/components/DeleteButton";

function formatDue(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function BillsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const ctx = await getHouseholdContext(user.id);
  if (!ctx) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <EmptyState
          title="No household yet"
          description="Create or join a household to track bills."
          action={
            <Link href="/household" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
              Go to household
            </Link>
          }
        />
      </main>
    );
  }

  const items = await listBills(ctx.household.id);
  const outstandingCents = items.filter((b) => !b.paid).reduce((sum, b) => sum + b.amountCents, 0);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Bills</h1>
        <span className="text-sm text-gray-500">
          Outstanding: <span className="font-semibold text-gray-800">{formatCents(outstandingCents)}</span>
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500">Shared utilities and bills for {ctx.household.name}.</p>

      <div className="mt-6 rounded-xl border border-gray-200 p-4">
        <BillForm householdId={ctx.household.id} />
      </div>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No bills tracked" description="Add the first bill above." />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((bill) => (
            <li key={bill.id} className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${bill.paid ? "text-gray-400 line-through" : "text-gray-800"}`}>
                    {bill.title}
                  </span>
                  <span className="text-sm text-gray-500">{formatCents(bill.amountCents)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      bill.paid
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {bill.paid ? "✓ Paid" : "Unpaid"}
                  </span>
                </div>
                {bill.dueDate && (
                  <p className="text-xs text-gray-400">Due {formatDue(bill.dueDate)}</p>
                )}
              </div>
              <BillPaidToggle billId={bill.id} paid={bill.paid} />
              <DeleteButton endpoint={`/api/bills/${bill.id}`} confirm="Delete this bill?" />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
