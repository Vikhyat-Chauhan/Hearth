// Expenses (server component): Splitwise-style shared expenses with per-member
// balances. Any member can add an expense, record a settlement, or delete an
// expense. Money is integer cents; balances are zero-sum.
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getHouseholdContext, listMembers } from "@/lib/household";
import { listExpenses, computeBalances } from "@/lib/expenses";
import { formatCents } from "@/lib/utils";
import { EmptyState } from "@/components/states";
import PageHeader from "@/components/ui/PageHeader";
import LinkButton from "@/components/ui/LinkButton";
import ExpenseForm from "@/components/ExpenseForm";
import SettlementForm from "@/components/SettlementForm";
import DeleteButton from "@/components/DeleteButton";

export default async function ExpensesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const ctx = await getHouseholdContext(user.id);
  if (!ctx) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          title="No household yet"
          description="Create or join a household to split expenses."
          icon="💸"
          action={<LinkButton href="/household">Go to household</LinkButton>}
        />
      </main>
    );
  }

  const householdId = ctx.household.id;
  const [members, expenseList, balances] = await Promise.all([
    listMembers(householdId),
    listExpenses(householdId),
    computeBalances(householdId),
  ]);
  const nameOf = (id: string) => {
    const m = members.find((x) => x.userId === id);
    return m ? (m.name ?? m.email) : "Someone";
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        eyebrow="Square it up"
        icon="💸"
        accent="green"
        title="Expenses"
        subtitle={`Shared spending and balances for ${ctx.household.name}.`}
      />

      {/* Balances */}
      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-card">
        <h2 className="font-display text-base font-semibold text-gray-900">Balances</h2>
        <ul className="mt-3 space-y-1">
          {balances.map((b) => (
            <li key={b.userId} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">
                {b.userId === user.id ? "You" : (b.name ?? b.email)}
              </span>
              <span
                className={
                  b.netCents > 0 ? "font-medium text-green-600" : b.netCents < 0 ? "font-medium text-red-600" : "text-gray-400"
                }
              >
                {b.netCents > 0 && (
                  <>
                    <span aria-hidden="true">▲ </span>is owed {formatCents(b.netCents)}
                  </>
                )}
                {b.netCents < 0 && (
                  <>
                    <span aria-hidden="true">▼ </span>owes {formatCents(-b.netCents)}
                  </>
                )}
                {b.netCents === 0 && "settled up"}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-gray-100 pt-3">
          <p className="mb-2 text-xs font-medium text-gray-500">Record a payment</p>
          <SettlementForm householdId={householdId} members={members} currentUserId={user.id} />
        </div>
      </section>

      {/* Add expense */}
      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-card">
        <h2 className="mb-3 font-display text-base font-semibold text-gray-900">Add an expense</h2>
        <ExpenseForm householdId={householdId} members={members} currentUserId={user.id} />
      </section>

      {/* Expense list */}
      {expenseList.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No expenses yet" description="Add the first shared expense above." />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {expenseList.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-glow"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{e.description}</span>
                  <span className="text-sm text-gray-500">{formatCents(e.amountCents)}</span>
                </div>
                <p className="text-xs text-gray-400">
                  {e.paidBy === user.id ? "You" : nameOf(e.paidBy)} paid · split {e.splits.length}{" "}
                  {e.splits.length === 1 ? "way" : "ways"}
                </p>
              </div>
              <DeleteButton endpoint={`/api/expenses/${e.id}`} confirm="Delete this expense?" />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
