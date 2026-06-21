import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service · Hearth",
  description:
    "The terms that govern your use of Hearth, the shared-household app for students and roommates.",
};

// Public terms of service. Must be reachable while logged out (it's linked from
// the sign-in surface and expected alongside the privacy policy for Google OAuth
// verification) — see the PUBLIC_PATHS allowlist in src/middleware.ts.
const UPDATED = "June 20, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-muted">{children}</div>
    </section>
  );
}

export default function TermsOfService() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-700 dark:text-brand-300">
        Hearth
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">
        Terms of Service
      </h1>
      <p className="mt-3 text-sm text-faint">Last updated: {UPDATED}</p>

      <p className="mt-8 text-muted">
        Hearth is a shared-household app that helps students and roommates manage chores, shopping,
        bills, and shared expenses, and syncs recurring chores to each member&apos;s Google Calendar.
        By creating an account or using Hearth, you agree to these Terms of Service. If you do not
        agree, please don&apos;t use the app.
      </p>

      <Section title="Eligibility & your account">
        <p>
          Hearth is intended for students, roommates, and others sharing a home. You sign in with
          your Google account, and you&apos;re responsible for keeping that account secure and for
          all activity that happens under your Hearth profile.
        </p>
      </Section>

      <Section title="Acceptable use">
        <ul className="list-disc space-y-2 pl-5">
          <li>Use Hearth only for managing your own household with people who have agreed to take part.</li>
          <li>
            Don&apos;t attempt to access households, chores, or data that don&apos;t belong to you, or
            otherwise probe, abuse, or disrupt the service.
          </li>
          <li>
            Chore completion is on the honor system — marking a chore done is a shared signal to your
            housemates, not a verified record.
          </li>
          <li>Don&apos;t use Hearth for anything unlawful or to harass other members.</li>
        </ul>
      </Section>

      <Section title="Google Calendar">
        <p>
          When you connect Google, you authorize Hearth to create, update, and delete the recurring
          chore events it manages on your Google Calendar. You can disconnect at any time from your{" "}
          <Link
            href="/settings/calendar"
            className="font-medium text-brand-700 underline hover:text-brand-800 dark:text-brand-300"
          >
            calendar settings
          </Link>
          . Our handling of your Google data is described in our{" "}
          <Link
            href="/privacy"
            className="font-medium text-brand-700 underline hover:text-brand-800 dark:text-brand-300"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </Section>

      <Section title="Your content">
        <p>
          You and your housemates own the content you create in Hearth — households, chores, shopping
          items, announcements, bills, and expenses. You&apos;re responsible for what you post, and
          you understand that household content is visible to the other members of that household.
        </p>
      </Section>

      <Section title="Service provided “as is”">
        <p>
          Hearth is a free app offered without warranties of any kind, express or implied. We
          don&apos;t guarantee that calendar sync, notifications, or any feature will be
          uninterrupted or error-free. To the fullest extent permitted by law, Hearth and its
          maintainer are not liable for any indirect, incidental, or consequential damages arising
          from your use of the app — including missed chores, bills, or calendar events.
        </p>
      </Section>

      <Section title="Termination">
        <p>
          You may stop using Hearth at any time — you can leave a household or delete your account,
          which removes your profile and the chore events Hearth created on your calendar. We may
          suspend or terminate access that violates these terms or abuses the service.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may update these terms from time to time. When we do, we&apos;ll revise the date above.
          Continued use of Hearth after a change means you accept the updated terms.
        </p>
      </Section>

      <Section title="Contact us">
        <p>
          Questions about these terms? Email{" "}
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
