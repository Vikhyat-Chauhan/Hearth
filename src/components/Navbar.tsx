// Server component: reads the session and renders household navigation.
// Renders a Sign in link when logged out; user email + Logout when logged in.

import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { listUserHouseholds, getHouseholdContext } from "@/lib/household";
import HouseholdSwitcher from "@/components/HouseholdSwitcher";
import MobileNav from "@/components/MobileNav";
import SettingsMenu from "@/components/SettingsMenu";
import GoogleSignIn from "@/components/GoogleSignIn";

// Primary nav = day-to-day feature pages only. Household / Calendar / Logout
// are account concerns and live in the Settings menu instead.
const LINKS = [
  { href: "/chores", label: "Chores", icon: "✓" },
  { href: "/announcements", label: "Board", icon: "📣" },
  { href: "/shopping", label: "Shopping", icon: "🛒" },
  { href: "/bills", label: "Bills", icon: "🧾" },
  { href: "/expenses", label: "Expenses", icon: "💸" },
];

export default async function Navbar() {
  // getUser hits Supabase; before provisioning there's no env, so guard it.
  const user = process.env.NEXT_PUBLIC_SUPABASE_URL ? await getUser() : null;

  // Multi-household: offer a switcher when the user belongs to more than one.
  let myHouseholds: { id: string; name: string; role: string }[] = [];
  let activeHouseholdId = "";
  let householdName: string | null = null;
  let role: string | null = null;
  if (user) {
    const [list, ctx] = await Promise.all([
      listUserHouseholds(user.id),
      getHouseholdContext(user.id),
    ]);
    myHouseholds = list;
    activeHouseholdId = ctx?.household.id ?? "";
    householdName = ctx?.household.name ?? null;
    role = ctx?.role ?? null;
  }

  return (
    <header className="border-b border-line bg-surface">
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
            <SettingsMenu userEmail={user.email ?? ""} householdName={householdName} role={role} />
          ) : (
            <GoogleSignIn
              showError={false}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-2"
            >
              Sign in
            </GoogleSignIn>
          )}
        </div>
      </nav>
    </header>
  );
}
