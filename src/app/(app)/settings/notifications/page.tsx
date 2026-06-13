// Email-notification preferences (opt-out). Reads the user's current flags and
// renders the toggle controls. Mirrors settings/calendar/page.tsx.
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, profiles } from "@/db";
import { getUser } from "@/lib/supabase/server";
import NotificationPrefs from "@/components/NotificationPrefs";
import PageHeader from "@/components/ui/PageHeader";

export default async function NotificationsSettingsPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const [profile] = await db
    .select({
      notifyAnnouncements: profiles.notifyAnnouncements,
      notifyChores: profiles.notifyChores,
    })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  // Default to opted-in if the profile row is somehow missing the flags.
  const initial = {
    notifyAnnouncements: profile?.notifyAnnouncements ?? true,
    notifyChores: profile?.notifyChores ?? true,
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <PageHeader
        eyebrow="Stay in the loop"
        icon="✉️"
        accent="accent"
        title="Notifications"
        subtitle="Choose which Hearth emails land in your inbox."
      />
      <NotificationPrefs initial={initial} />
    </main>
  );
}
