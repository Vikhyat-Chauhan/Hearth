// Connect Google later + backfill (P1). Shows the user's connection status and
// lets them connect Google Calendar and sync their existing chores onto it.
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, profiles, calendarChannels } from "@/db";
import { getUser } from "@/lib/supabase/server";
import ConnectCalendar from "@/components/ConnectCalendar";
import TwoWaySync from "@/components/TwoWaySync";
import PageHeader from "@/components/ui/PageHeader";

export default async function CalendarSettingsPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const [profile] = await db
    .select({ tok: profiles.googleRefreshTokenEnc })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  const connected = !!profile?.tok;

  const channels = connected
    ? await db
        .select({ id: calendarChannels.id })
        .from(calendarChannels)
        .where(eq(calendarChannels.userId, user.id))
        .limit(1)
    : [];
  const twoWayActive = channels.length > 0;

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <PageHeader
        eyebrow="Stay in sync"
        icon="📅"
        accent="accent"
        title="Calendar"
        subtitle="Hearth writes your chores to your Google Calendar. Manage the connection here."
      />
      <div className="mt-6">
        <ConnectCalendar connected={connected} />
      </div>
      {connected && <TwoWaySync active={twoWayActive} />}
    </main>
  );
}
