// Server component: reads the session and renders household navigation.
// Renders a Sign in link when logged out; user email + Logout when logged in.

import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { listUserHouseholds, getHouseholdContext } from "@/lib/household";
import HouseholdSwitcher from "@/components/HouseholdSwitcher";
import MobileNav from "@/components/MobileNav";

const LINKS = [
  { href: "/chores", label: "My Chores", icon: "✓" },
  { href: "/announcements", label: "Board", icon: "📣" },
  { href: "/shopping", label: "Shopping", icon: "🛒" },
  { href: "/bills", label: "Bills", icon: "🧾" },
  { href: "/expenses", label: "Expenses", icon: "💸" },
  { href: "/household", label: "Household", icon: "🏠" },
  { href: "/settings/calendar", label: "Calendar", icon: "📅" },
];

export default async function Navbar() {
  // getUser hits Supabase; before provisioning there's no env, so guard it.
  const user = process.env.NEXT_PUBLIC_SUPABASE_URL ? await getUser() : null;

  // Multi-household: offer a switcher when the user belongs to more than one.
  let myHouseholds: { id: string; name: string; role: string }[] = [];
  let activeHouseholdId = "";
  if (user) {
    const [list, ctx] = await Promise.all([
      listUserHouseholds(user.id),
      getHouseholdContext(user.id),
    ]);
    myHouseholds = list;
    activeHouseholdId = ctx?.household.id ?? "";
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-display text-xl font-bold text-brand-700">
          <span aria-hidden="true">🔥</span> Hearth
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {user && <MobileNav links={LINKS} />}

          {user && myHouseholds.length > 1 && (
            <HouseholdSwitcher households={myHouseholds} activeId={activeHouseholdId} />
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-gray-500 sm:inline">{user.email}</span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Logout
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
