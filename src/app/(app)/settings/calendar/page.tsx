// Connect Google later + backfill (P1). Shows the user's connection status and
// lets them connect Google Calendar and sync their existing chores onto it.
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, profiles } from "@/db";
import { getUser } from "@/lib/supabase/server";
import ConnectCalendar from "@/components/ConnectCalendar";

export default async function CalendarSettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [profile] = await db
    .select({ tok: profiles.googleRefreshTokenEnc })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  const connected = !!profile?.tok;

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold">Calendar</h1>
      <p className="mt-2 text-sm text-gray-500">
        Hearth writes your chores to your Google Calendar (one-way). Manage the connection here.
      </p>
      <ConnectCalendar connected={connected} />
    </main>
  );
}
