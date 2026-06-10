// Bills (server component): shared utilities/bills tracking. Any member can add,
// mark paid/unpaid, or remove. Amounts are stored and summed as integer cents.
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getHouseholdContext } from "@/lib/household";
import { listBills } from "@/lib/bills";
import { formatCents } from "@/lib/utils";
import { EmptyState } from "@/components/states";
import PageHeader from "@/components/ui/PageHeader";
import LinkButton from "@/components/ui/LinkButton";
import Badge from "@/components/ui/Badge";
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
      <main className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          title="No household yet"
          description="Create or join a household to track bills."
          icon="🧾"
          action={<LinkButton href="/household">Go to household</LinkButton>}
        />
      </main>
    );
  }

  const items = await listBills(ctx.household.id);
  const outstandingCents = items.filter((b) => !b.paid).reduce((sum, b) => sum + b.amountCents, 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        title="Bills"
        subtitle={`Shared utilities and bills for ${ctx.household.name}.`}
        action={
          <span className="text-sm text-gray-500">
            Outstanding:{" "}
            <span className="font-semibold text-gray-800">{formatCents(outstandingCents)}</span>
          </span>
        }
      />

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
            <li key={bill.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-card">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${bill.paid ? "text-gray-400 line-through" : "text-gray-800"}`}>
                    {bill.title}
                  </span>
                  <span className="text-sm text-gray-500">{formatCents(bill.amountCents)}</span>
                  <Badge variant={bill.paid ? "paid" : "unpaid"}>{bill.paid ? "Paid" : "Unpaid"}</Badge>
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
