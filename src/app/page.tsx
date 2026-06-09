import Link from "next/link";

// Dashboard stub. Sprint 1 turns this into the household home (your chores at a
// glance). For now it just routes to the P0 flows.
export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold">Welcome to Hearth</h1>
      <p className="mt-2 text-gray-500">
        Create a household, invite your roommates, and assign recurring chores that land on
        everyone&apos;s Google Calendar.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/households/new"
          className="rounded-xl border border-gray-200 p-5 transition hover:border-gray-300 hover:shadow-sm"
        >
          <h2 className="font-semibold">Create a household →</h2>
          <p className="mt-1 text-sm text-gray-500">Become the admin and get an invite code.</p>
        </Link>
        <Link
          href="/join"
          className="rounded-xl border border-gray-200 p-5 transition hover:border-gray-300 hover:shadow-sm"
        >
          <h2 className="font-semibold">Join a household →</h2>
          <p className="mt-1 text-sm text-gray-500">Enter an invite code from your main roommate.</p>
        </Link>
        <Link
          href="/chores"
          className="rounded-xl border border-gray-200 p-5 transition hover:border-gray-300 hover:shadow-sm"
        >
          <h2 className="font-semibold">My chores →</h2>
          <p className="mt-1 text-sm text-gray-500">See what&apos;s assigned to you and mark it done.</p>
        </Link>
        <Link
          href="/chores/new"
          className="rounded-xl border border-gray-200 p-5 transition hover:border-gray-300 hover:shadow-sm"
        >
          <h2 className="font-semibold">New chore →</h2>
          <p className="mt-1 text-sm text-gray-500">Admins assign a recurring chore to members.</p>
        </Link>
      </div>
    </main>
  );
}
