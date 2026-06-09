// Server component: reads the session and renders household navigation.
// Renders a Sign in link when logged out; user email + Logout when logged in.

import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { listUserHouseholds, getHouseholdContext } from "@/lib/household";
import HouseholdSwitcher from "@/components/HouseholdSwitcher";

const LINKS = [
  { href: "/chores", label: "My Chores" },
  { href: "/announcements", label: "Board" },
  { href: "/shopping", label: "Shopping" },
  { href: "/bills", label: "Bills" },
  { href: "/expenses", label: "Expenses" },
  { href: "/household", label: "Household" },
  { href: "/settings/calendar", label: "Calendar" },
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
    <header className="border-b border-gray-200">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          🔥 Hearth
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {user &&
            LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-gray-600 hover:text-gray-900">
                {l.label}
              </Link>
            ))}

          {user && myHouseholds.length > 1 && (
            <HouseholdSwitcher households={myHouseholds} activeId={activeHouseholdId} />
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-gray-500 sm:inline">{user.email}</span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
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
