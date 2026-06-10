// Marketing landing shown to logged-out visitors at "/". Warm, editorial take on
// the Hearth brand (Fraunces display + ember terracotta). Server-rendered; the
// page-load reveal is a CSS-only staggered animation (see globals.css). The
// primary CTA points at /login, which starts the Google sign-in + Calendar flow.
import Link from "next/link";

const FEATURES = [
  {
    icon: "✓",
    title: "Recurring chores",
    body: "Assign dish duty, trash, and the bathroom on a repeat. Hearth keeps the rotation so nobody has to nag.",
  },
  {
    icon: "📅",
    title: "On everyone's calendar",
    body: "Every chore lands on each roommate's own Google Calendar — one-way, automatic, no extra app to check.",
  },
  {
    icon: "🛒",
    title: "Shared shopping list",
    body: "Anyone adds, anyone checks off. The whole house sees what's needed and what's already in the cart.",
  },
  {
    icon: "🧾",
    title: "Bills & utilities",
    body: "Track what's due and what's paid, so the internet never quietly gets shut off mid-month.",
  },
  {
    icon: "💸",
    title: "Expenses, split fair",
    body: "Splitwise-style balances show who owes who at a glance — then settle up without the spreadsheet.",
  },
  {
    icon: "📣",
    title: "House board",
    body: "Post announcements (or go anonymous) for the whole house. Far fewer awkward group texts.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Start your household",
    body: "Create a house, get a unique invite code, and bring your roommates in.",
  },
  {
    n: "02",
    title: "Assign the chores",
    body: "Set recurring chores and pick who does what. They sync to each person's Google Calendar instantly.",
  },
  {
    n: "03",
    title: "Stay in sync",
    body: "Shopping, bills, and shared expenses keep everyone honest — and the dishes actually done.",
  },
];

function GoogleCTA({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href="/login"
      className={`inline-flex items-center justify-center gap-2.5 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-medium text-white shadow-card transition hover:bg-brand-700 hover:shadow-card-hover ${className}`}
    >
      <span
        aria-hidden="true"
        className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-700"
      >
        G
      </span>
      {children}
    </Link>
  );
}

export default function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate">
        {/* Warm ambient glow + grain */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-50 via-stone-50 to-stone-50" />
          <div className="absolute inset-0 bg-hearth-grain opacity-70" />
          <div className="animate-ember absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-300/40 blur-3xl" />
          <div
            className="animate-ember absolute -right-16 top-32 h-80 w-80 rounded-full bg-brand-400/30 blur-3xl"
            style={{ animationDelay: "2s" }}
          />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-28">
          {/* Copy */}
          <div>
            <p
              className="animate-rise inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3.5 py-1.5 text-xs font-medium uppercase tracking-wide text-brand-700 backdrop-blur"
              style={{ animationDelay: "0ms" }}
            >
              <span aria-hidden="true">🔥</span> For students &amp; roommates
            </p>

            <h1
              className="animate-rise mt-6 font-display text-[2.75rem] font-semibold leading-[1.04] tracking-tight text-gray-900 sm:text-6xl"
              style={{ animationDelay: "80ms" }}
            >
              Make the shared house{" "}
              <span className="relative whitespace-nowrap text-brand-700">
                feel like home
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-2 w-full rounded-full bg-brand-200/70"
                />
              </span>
              .
            </h1>

            <p
              className="animate-rise mt-6 max-w-xl text-lg leading-relaxed text-gray-600"
              style={{ animationDelay: "160ms" }}
            >
              Hearth keeps roommates in sync — recurring chores on everyone&apos;s Google Calendar,
              a live shopping list, bills, and who-owes-who, all in one warm little place.
            </p>

            <div
              className="animate-rise mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center"
              style={{ animationDelay: "240ms" }}
            >
              <GoogleCTA>Get started with Google</GoogleCTA>
              <Link
                href="#how"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-base font-medium text-gray-700 transition hover:bg-gray-50"
              >
                See how it works
              </Link>
            </div>

            <p
              className="animate-rise mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500"
              style={{ animationDelay: "300ms" }}
            >
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="text-brand-600">✦</span> Free to start
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="text-brand-600">✦</span> Syncs with Google Calendar
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="text-brand-600">✦</span> No app to install
              </span>
            </p>
          </div>

          {/* Product preview */}
          <div
            className="animate-rise relative mx-auto w-full max-w-md lg:mx-0"
            style={{ animationDelay: "360ms" }}
          >
            <div className="rotate-1 rounded-2xl border border-gray-200 bg-white p-5 shadow-card-hover">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    This week
                  </p>
                  <p className="font-display text-xl font-semibold text-gray-900">Apt 4B</p>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                  4 roommates
                </span>
              </div>

              <ul className="mt-4 space-y-2.5">
                {[
                  { t: "Take out the trash", who: "You", day: "Today", done: false },
                  { t: "Kitchen deep clean", who: "Sam", day: "Today", done: true },
                  { t: "Vacuum living room", who: "Priya", day: "Tue", done: false },
                  { t: "Bathroom", who: "Alex", day: "Thu", done: true },
                ].map((c) => (
                  <li
                    key={c.t}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-stone-50/60 px-3.5 py-2.5"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs ${
                        c.done
                          ? "bg-brand-600 text-white"
                          : "border border-gray-300 bg-white text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span
                      className={`flex-1 text-sm ${
                        c.done ? "text-gray-400 line-through" : "text-gray-800"
                      }`}
                    >
                      {c.t}
                    </span>
                    <span className="text-xs text-gray-400">{c.who}</span>
                    <span className="rounded-md bg-white px-1.5 py-0.5 text-xs font-medium text-gray-500 shadow-card">
                      {c.day}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Floating accent card */}
            <div className="absolute -bottom-6 -left-6 hidden -rotate-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-card-hover sm:block">
              <p className="text-xs text-gray-400">You&apos;re owed</p>
              <p className="font-display text-lg font-semibold text-green-700">
                <span aria-hidden="true">▲ </span>$42.50
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Everything a shared home needs
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            One place for the unglamorous logistics, so you can get back to actually living
            together.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div
                aria-hidden="true"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-xl transition group-hover:bg-brand-100"
              >
                {f.icon}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="relative scroll-mt-20 border-y border-brand-100 bg-brand-50/40">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-hearth-grain opacity-50" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide text-brand-700">
              Up and running in minutes
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              How Hearth works
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <span className="font-display text-5xl font-semibold text-brand-200">{s.n}</span>
                <h3 className="mt-3 font-display text-xl font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Closing CTA ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <div className="relative isolate overflow-hidden rounded-3xl bg-brand-700 px-6 py-16 text-center shadow-card-hover sm:px-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-brand-500/40 blur-3xl" />
            <div className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-brand-400/30 blur-3xl" />
          </div>
          <p className="text-4xl" aria-hidden="true">🔥</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Bring a little warmth to the chore chart
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-100">
            Free to start, syncs with the calendar you already use. Your house will run itself.
          </p>
          <div className="mt-9 flex justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-brand-700 shadow-card transition hover:bg-brand-50"
            >
              <span
                aria-hidden="true"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white"
              >
                G
              </span>
              Get started with Google
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-gray-500 sm:flex-row">
          <p className="font-display text-base font-semibold text-brand-700">
            <span aria-hidden="true">🔥</span> Hearth
          </p>
          <p>Shared-home harmony for students &amp; roommates.</p>
          <Link href="/login" className="font-medium text-gray-700 hover:text-brand-700">
            Sign in →
          </Link>
        </div>
      </footer>
    </main>
  );
}
