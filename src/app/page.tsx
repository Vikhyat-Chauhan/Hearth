import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { getHouseholdContext } from "@/lib/household";
import { getMyChores } from "@/lib/chores";
import { listAnnouncements } from "@/lib/announcements";
import { listShoppingItems } from "@/lib/shopping";
import { listBills } from "@/lib/bills";
import { computeBalances } from "@/lib/expenses";
import { formatCents, formatOccurrenceDate, formatRelativeTime } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LinkButton from "@/components/ui/LinkButton";
import DashboardWidget from "@/components/dashboard/DashboardWidget";
import LandingPage from "@/components/LandingPage";

export default async function Home() {
  const user = process.env.NEXT_PUBLIC_SUPABASE_URL ? await getUser() : null;
  const ctx = user ? await getHouseholdContext(user.id) : null;

  // Logged-out visitor → marketing landing page.
  if (!user) {
    return <LandingPage />;
  }

  // Signed in but no household yet → onboarding.
  if (!ctx) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-4xl font-bold text-brand-700">Welcome to Hearth</h1>
        <p className="mt-3 max-w-xl text-gray-600">
          Create a household, invite your roommates, and assign recurring chores that land on
          everyone&apos;s Google Calendar.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/households/new" className="group">
            <Card className="transition hover:-translate-y-0.5 hover:shadow-card-hover">
              <div className="text-2xl" aria-hidden="true">🏡</div>
              <h2 className="mt-2 font-semibold text-gray-900">Create a household</h2>
              <p className="mt-1 text-sm text-gray-500">Become the admin and get an invite code.</p>
              <span className="mt-3 inline-block text-sm font-medium text-brand-600">Get started →</span>
            </Card>
          </Link>
          <Link href="/join" className="group">
            <Card className="transition hover:-translate-y-0.5 hover:shadow-card-hover">
              <div className="text-2xl" aria-hidden="true">🔑</div>
              <h2 className="mt-2 font-semibold text-gray-900">Join a household</h2>
              <p className="mt-1 text-sm text-gray-500">Enter an invite code from your main roommate.</p>
              <span className="mt-3 inline-block text-sm font-medium text-brand-600">Enter code →</span>
            </Card>
          </Link>
        </div>
      </main>
    );
  }

  // Has a household → live dashboard. All accessors are already scoped to the
  // active household, so no extra ownership checks are needed here.
  const [chores, announcements, shopping, bills, balances] = await Promise.all([
    getMyChores(user!.id, 6),
    listAnnouncements(ctx.household.id),
    listShoppingItems(ctx.household.id),
    listBills(ctx.household.id),
    computeBalances(ctx.household.id),
  ]);

  // Upcoming, not-yet-done chore occurrences across all of my chores, soonest first.
  const upcomingChores = chores
    .flatMap((c) => c.occurrences.filter((o) => !o.done).map((o) => ({ title: c.title, date: o.date })))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const latestAnnouncements = announcements.slice(0, 3);
  const unchecked = shopping.filter((i) => !i.checked);
  const unpaidBills = bills.filter((b) => !b.paid);

  // My net balance + a couple of other members who are non-zero.
  const myBalance = balances.find((b) => b.userId === user!.id);
  const others = balances.filter((b) => b.userId !== user!.id && b.netCents !== 0).slice(0, 2);
  const hasExpenses = balances.some((b) => b.netCents !== 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="relative isolate">
        {/* Soft ember glow behind the greeting — warmth without a heavy hero band. */}
        <div
          aria-hidden="true"
          className="animate-ember pointer-events-none absolute -left-10 -top-12 -z-10 h-44 w-44 rounded-full bg-brand-200/40 blur-3xl"
        />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              {greeting} · Welcome home to
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-brand-700 sm:text-4xl">
              {ctx.household.name}
            </h1>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium capitalize text-brand-700 ring-1 ring-inset ring-brand-100">
            {ctx.role}
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        {ctx.role === "admin" && (
          <LinkButton href="/chores/new">
            <span aria-hidden="true">＋</span> Assign a chore
          </LinkButton>
        )}
        <LinkButton href="/shopping" variant="secondary">
          <span aria-hidden="true">🛒</span> Add shopping item
        </LinkButton>
        <LinkButton href="/announcements" variant="secondary">
          <span aria-hidden="true">📣</span> Post to board
        </LinkButton>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* My chores */}
        <DashboardWidget
          title="My chores"
          href="/chores"
          icon="✓"
          accent="brand"
          count={upcomingChores.length}
          empty={upcomingChores.length === 0}
          emptyText="Nothing assigned — you're all caught up."
        >
          <ul className="space-y-2">
            {upcomingChores.map((c, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-gray-700">{c.title}</span>
                <span className="shrink-0 text-gray-500">{formatOccurrenceDate(c.date)}</span>
              </li>
            ))}
          </ul>
        </DashboardWidget>

        {/* Board */}
        <DashboardWidget
          title="Board"
          href="/announcements"
          icon="📣"
          accent="accent"
          empty={latestAnnouncements.length === 0}
          emptyText="No announcements yet."
        >
          <ul className="space-y-3">
            {latestAnnouncements.map((a) => (
              <li key={a.id} className="text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-gray-700">
                    {a.isAnonymous ? "Anonymous" : a.authorName || a.authorEmail}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">{formatRelativeTime(a.createdAt)}</span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-gray-500">{a.body}</p>
              </li>
            ))}
          </ul>
        </DashboardWidget>

        {/* Shopping */}
        <DashboardWidget
          title="Shopping list"
          href="/shopping"
          icon="🛒"
          accent="brand"
          count={unchecked.length}
          empty={unchecked.length === 0}
          emptyText="List is empty — nothing to buy."
        >
          <ul className="space-y-2">
            {unchecked.slice(0, 5).map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm text-gray-700">
                <span aria-hidden="true" className="text-gray-400">•</span>
                <span className="truncate">{item.name}</span>
              </li>
            ))}
          </ul>
        </DashboardWidget>

        {/* Unpaid bills */}
        <DashboardWidget
          title="Unpaid bills"
          href="/bills"
          icon="🧾"
          accent="amber"
          count={unpaidBills.length}
          empty={unpaidBills.length === 0}
          emptyText="No unpaid bills. Nice."
        >
          <ul className="space-y-2">
            {unpaidBills.slice(0, 3).map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <Badge variant="unpaid">Unpaid</Badge>
                  <span className="truncate text-gray-700">{b.title}</span>
                </span>
                <span className="shrink-0 font-medium text-gray-900">{formatCents(b.amountCents)}</span>
              </li>
            ))}
          </ul>
        </DashboardWidget>

        {/* Balances */}
        <DashboardWidget
          title="Balances"
          href="/expenses"
          icon="💸"
          accent="green"
          empty={!hasExpenses}
          emptyText="No shared expenses yet."
        >
          <div className="text-sm">
            <p className="text-gray-700">
              {!myBalance || myBalance.netCents === 0 ? (
                "You're all settled up."
              ) : myBalance.netCents > 0 ? (
                <>
                  You&apos;re owed{" "}
                  <span className="font-semibold text-green-700">
                    <span aria-hidden="true">▲ </span>
                    {formatCents(myBalance.netCents)}
                  </span>
                </>
              ) : (
                <>
                  You owe{" "}
                  <span className="font-semibold text-red-700">
                    <span aria-hidden="true">▼ </span>
                    {formatCents(-myBalance.netCents)}
                  </span>
                </>
              )}
            </p>
            {others.length > 0 && (
              <ul className="mt-2 space-y-1 text-gray-500">
                {others.map((o) => (
                  <li key={o.userId} className="flex items-center justify-between gap-3">
                    <span className="truncate">{o.name || o.email}</span>
                    <span className="shrink-0">
                      {o.netCents > 0
                        ? `is owed ${formatCents(o.netCents)}`
                        : `owes ${formatCents(-o.netCents)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DashboardWidget>
      </div>
    </main>
  );
}
