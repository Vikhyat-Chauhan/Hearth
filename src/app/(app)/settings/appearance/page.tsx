// Appearance preferences — choose the UI color theme (light / dark / system).
// The active value comes from the app-wide ThemeProvider (seeded from the
// hearth-theme cookie in the root layout), so this page just renders the control.
// Mirrors settings/notifications/page.tsx.
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import ThemePrefs from "@/components/ThemePrefs";
import PageHeader from "@/components/ui/PageHeader";

export default async function AppearanceSettingsPage() {
  const user = await getUser();
  if (!user) redirect("/");

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <PageHeader
        eyebrow="Make it yours"
        icon="🎨"
        accent="accent"
        title="Appearance"
        subtitle="Choose how Hearth looks on this account."
      />
      <ThemePrefs />
    </main>
  );
}
