import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { getHouseholdContext } from "@/lib/household";
import Card from "@/components/ui/Card";

// Household home hub. Greets the user, surfaces their household, and routes to
// every feature with a consistent, icon-led card grid.
const FEATURES = [
  { href: "/chores", icon: "✓", title: "My chores", desc: "See what's assigned to you and mark it done." },
  { href: "/announcements", icon: "📣", title: "Board", desc: "Share notes and updates with the house." },
  { href: "/shopping", icon: "🛒", title: "Shopping list", desc: "Add what you need; check off what's bought." },
  { href: "/bills", icon: "🧾", title: "Bills", desc: "Track utilities and who's paid what." },
  { href: "/expenses", icon: "💸", title: "Expenses", desc: "Split costs and settle up, Splitwise-style." },
  { href: "/household", icon: "🏠", title: "Household", desc: "Members, invite code, and chore assignments." },
];

export default async function Home() {
  const user = process.env.NEXT_PUBLIC_SUPABASE_URL ? await getUser() : null;
  const ctx = user ? await getHouseholdContext(user.id) : null;

  // No household yet → onboarding.
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">Welcome home to</p>
          <h1 className="font-display text-3xl font-bold text-brand-700">{ctx.household.name}</h1>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium capitalize text-brand-700">
          {ctx.role}
        </span>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <Link key={f.href} href={f.href} className="group">
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-card-hover">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-xl" aria-hidden="true">
                {f.icon}
              </div>
              <h2 className="mt-3 font-semibold text-gray-900">
                {f.title} <span className="text-brand-600 transition group-hover:translate-x-0.5">→</span>
              </h2>
              <p className="mt-1 text-sm text-gray-500">{f.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      {ctx.role === "admin" && (
        <div className="mt-6">
          <Link
            href="/chores/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-card transition hover:bg-brand-700"
          >
            <span aria-hidden="true">＋</span> Assign a new chore
          </Link>
        </div>
      )}
    </main>
  );
}
