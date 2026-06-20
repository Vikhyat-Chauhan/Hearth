import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Hearth",
  description:
    "How Hearth collects, uses, and protects your data, including Google account and Google Calendar information.",
};

// Public privacy policy. Must be reachable while logged out (it's linked from the
// sign-in surface and required for Google OAuth verification of the Calendar
// scope) — see the PUBLIC_PATHS allowlist in src/middleware.ts.
const UPDATED = "June 20, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-700 dark:text-brand-300">
        Hearth
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">
        Privacy Policy
      </h1>
      <p className="mt-3 text-sm text-faint">Last updated: {UPDATED}</p>

      <p className="mt-8 text-muted">
        Hearth is a shared-household app that helps students and roommates manage chores, shopping,
        bills, and shared expenses, and syncs recurring chores to each member&apos;s Google Calendar.
        This policy explains what we collect, how we use it, and the choices you have.
      </p>

      <Section title="Information we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-ink">Account information.</strong> When you sign in with Google,
            we receive your name, email address, and profile picture from your Google account to
            create and identify your Hearth profile.
          </li>
          <li>
            <strong className="text-ink">Google Calendar access.</strong> With your consent, we
            request the Google Calendar scope so Hearth can create, update, and delete the recurring
            chore events it manages on your calendar.
          </li>
          <li>
            <strong className="text-ink">Household content.</strong> The households, chores, shopping
            items, announcements, bills, and expenses you and your housemates create in the app.
          </li>
        </ul>
      </Section>

      <Section title="How we use your information">
        <ul className="list-disc space-y-2 pl-5">
          <li>To operate Hearth&apos;s features — chores, shopping, bills, expenses, and the board.</li>
          <li>
            To write recurring chore events to the Google Calendar of each assignee who has
            connected their account, and to keep those events in sync as chores change.
          </li>
          <li>To send the email notifications you have opted into (announcements and chore digests).</li>
          <li>To secure your account and keep household data scoped to the people who belong to it.</li>
        </ul>
        <p>
          We do <strong className="text-ink">not</strong> sell your personal information or use your
          Google data for advertising.
        </p>
      </Section>

      <Section title="Google API data & Limited Use">
        <p>
          Hearth&apos;s use and transfer of information received from Google APIs adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-700 underline hover:text-brand-800 dark:text-brand-300"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. We only access your Google Calendar to provide
          the chore-sync features described above, and we do not transfer that data to others except
          as needed to provide the service, comply with the law, or as part of a merger or
          acquisition.
        </p>
      </Section>

      <Section title="Data storage & security">
        <p>
          Your data is stored in our managed Supabase (PostgreSQL) database. Your Google refresh
          token is encrypted at rest with a server-only key and is never exposed to your browser or
          to other users.
        </p>
      </Section>

      <Section title="Data sharing">
        <p>
          Household content is visible to the members of that household. We share data with the
          service providers that run Hearth — Supabase (database), Vercel (hosting), Google
          (authentication and Calendar), and Resend (email delivery) — only to operate the app.
        </p>
      </Section>

      <Section title="Your choices">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            You can disconnect Google Calendar at any time from your{" "}
            <Link
              href="/settings/calendar"
              className="font-medium text-brand-700 underline hover:text-brand-800 dark:text-brand-300"
            >
              calendar settings
            </Link>{" "}
            or by revoking access in your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-700 underline hover:text-brand-800 dark:text-brand-300"
            >
              Google Account permissions
            </a>
            .
          </li>
          <li>You can manage email notifications in your notification settings.</li>
          <li>
            You can leave a household or delete your account; deleting removes your profile and the
            chore events Hearth created on your calendar.
          </li>
        </ul>
      </Section>

      <Section title="Data retention">
        <p>
          We keep your data while your account is active. When you delete content, leave a household,
          or delete your account, the associated records — and the calendar events Hearth created —
          are removed. Some operational data may be retained for a limited period for backups and
          maintenance.
        </p>
      </Section>

      <Section title="Contact us">
        <p>
          Questions about this policy or your data? Email{" "}
          <a
            href="mailto:vikhyat.chauhan@gmail.com"
            className="font-medium text-brand-700 underline hover:text-brand-800 dark:text-brand-300"
          >
            vikhyat.chauhan@gmail.com
          </a>
          .
        </p>
      </Section>

      <div className="mt-12 border-t border-line pt-6">
        <Link
          href="/"
          className="text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300"
        >
          ← Back to Hearth
        </Link>
      </div>
    </main>
  );
}
