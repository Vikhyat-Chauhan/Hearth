// Marketing landing shown to logged-out visitors at "/". Warm, editorial take on
// the Hearth brand (Fraunces display + ember terracotta). Server-rendered; the
// page-load reveal is a CSS-only staggered animation (see globals.css). The
// primary CTA is a GoogleSignIn button that launches the Google sign-in +
// Calendar flow directly (no intermediate /login page).
import Link from "next/link";
import GoogleSignIn from "@/components/GoogleSignIn";

// A small accent vocabulary mirroring src/lib/ui.ts (FEATURE_ACCENT). Class
// strings stay literal so Tailwind's content scan keeps them.
const ACCENT = {
  brand: {
    eyebrow: "text-brand-700 dark:text-brand-300",
    chip: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200",
    glyph: "text-brand-600 dark:text-brand-400",
    band: "bg-brand-50/40 border-brand-100 dark:bg-brand-900/10 dark:border-brand-900/40",
  },
  accent: {
    eyebrow: "text-accent-700 dark:text-accent-300",
    chip: "bg-accent-50 text-accent-700 dark:bg-accent-900/40 dark:text-accent-200",
    glyph: "text-accent-600 dark:text-accent-400",
    band: "bg-accent-50/40 border-accent-100 dark:bg-accent-900/10 dark:border-accent-900/40",
  },
  amber: {
    eyebrow: "text-amber-700 dark:text-amber-300",
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    glyph: "text-amber-600 dark:text-amber-400",
    band: "bg-amber-50/40 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/40",
  },
  green: {
    eyebrow: "text-green-700 dark:text-green-300",
    chip: "bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-200",
    glyph: "text-green-600 dark:text-green-400",
    band: "bg-green-50/40 border-green-100 dark:bg-green-900/10 dark:border-green-900/40",
  },
} as const;

type AccentKey = keyof typeof ACCENT;
type MockupKind = "chores" | "shopping" | "bills" | "expenses" | "board";

type Showcase = {
  icon: string;
  eyebrow: string;
  accent: AccentKey;
  title: string;
  body: string;
  points: string[];
  mockup: MockupKind;
};

// The five core "life improvement" features, each explained in full. Copy is
// kept accurate to what's actually built (recurrence, any-one-marks-it,
// anonymous posts, custom splits, paid/unpaid bills).
const SHOWCASE: Showcase[] = [
  {
    icon: "📅",
    eyebrow: "Chores · Google Calendar",
    accent: "brand",
    title: "Recurring chores, on everyone's calendar",
    body: "Set a chore to repeat — dishes every night, trash on Tuesdays — and assign it to one roommate or share it across several. It lands on each person's own Google Calendar automatically. Any one of them marking it done marks it done for the whole house.",
    points: [
      "Recurring schedules, from nightly to every-other-week",
      "Shared chores: whoever does it first checks it off for everyone",
      "Edits and deletes sync to every assignee's calendar",
    ],
    mockup: "chores",
  },
  {
    icon: "🛒",
    eyebrow: "Shared shopping list",
    accent: "accent",
    title: "One shopping list the whole house shares",
    body: "Anyone adds, anyone checks off, and you can always see who added what. Unchecked items float to the top so it's instantly clear what's still needed — no more three people buying the same carton of milk.",
    points: [
      "Live and shared — not a list per person",
      "Check items off as you shop; they don't disappear",
      "See who added each item at a glance",
    ],
    mockup: "shopping",
  },
  {
    icon: "🧾",
    eyebrow: "Bills & utilities",
    accent: "amber",
    title: "Never get surprised by a shared bill again",
    body: "Track every shared bill in one place — rent, internet, power — each with a due date and a paid or unpaid status. The outstanding total sits right at the top, so the lights never quietly go out mid-month.",
    points: [
      "Due dates, with the soonest surfaced first",
      "Mark paid without losing the history",
      "A running outstanding total up top",
    ],
    mockup: "bills",
  },
  {
    icon: "💸",
    eyebrow: "Expenses, split fair",
    accent: "green",
    title: "Split shared spending without the spreadsheet",
    body: "Someone covers groceries; split it evenly or by custom shares. Hearth keeps the running who-owes-who balance and lets you record a settlement when you pay each other back. Money is tracked to the cent — no rounding drama.",
    points: [
      "Even or custom splits per person",
      "Automatic, always-balanced who-owes-who",
      "Record a settlement to square up",
    ],
    mockup: "expenses",
  },
  {
    icon: "📣",
    eyebrow: "House board",
    accent: "accent",
    title: "House-wide notes, minus the awkward group text",
    body: "Post what the house needs to know — a package is coming, guests this weekend, the sink is leaking. Go anonymous when you need to raise something without the friction. Only you and the admin can take a post down.",
    points: [
      "Announcements everyone in the house sees",
      "Optional anonymous posting",
      "Author or admin can delete",
    ],
    mockup: "board",
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
    <GoogleSignIn
      className={`inline-flex items-center justify-center gap-2.5 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-medium text-white shadow-card transition hover:bg-brand-700 hover:shadow-card-hover ${className}`}
    >
      <span
        aria-hidden="true"
        className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-xs font-bold text-brand-700 dark:bg-brand-50"
      >
        G
      </span>
      {children}
    </GoogleSignIn>
  );
}

// Decorative, data-free product previews — one per showcase feature. Reuse the
// hero card vocabulary (rounded-2xl white surface, stone list rows, brand check
// tiles). Purely illustrative, so the whole thing is aria-hidden.
function FeatureMockup({ kind }: { kind: MockupKind }) {
  const shell =
    "w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-card-hover";

  if (kind === "chores") {
    return (
      <div aria-hidden="true" className={`${shell} rotate-1`}>
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-semibold text-ink">This week</p>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
            Apt 4B
          </span>
        </div>
        <ul className="mt-4 space-y-2.5">
          {[
            { t: "Take out the trash", who: "You", day: "Today", done: false },
            { t: "Kitchen deep clean", who: "Sam", day: "Today", done: true },
            { t: "Vacuum living room", who: "Priya", day: "Tue", done: false },
          ].map((c) => (
            <li
              key={c.t}
              className="flex items-center gap-3 rounded-xl border border-line bg-canvas/60 px-3.5 py-2.5"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs ${
                  c.done
                    ? "bg-brand-600 text-white"
                    : "border border-line bg-surface text-transparent"
                }`}
              >
                ✓
              </span>
              <span
                className={`flex-1 text-sm ${
                  c.done ? "text-faint line-through" : "text-ink"
                }`}
              >
                {c.t}
              </span>
              <span className="text-xs text-faint">{c.who}</span>
              <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs font-medium text-muted shadow-card">
                {c.day}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (kind === "shopping") {
    return (
      <div aria-hidden="true" className={`${shell} -rotate-1`}>
        <p className="font-display text-lg font-semibold text-ink">Shopping list</p>
        <ul className="mt-4 space-y-2.5">
          {[
            { t: "Oat milk", who: "Priya", done: false },
            { t: "Dish soap", who: "You", done: false },
            { t: "Paper towels", who: "Sam", done: true },
            { t: "Coffee beans", who: "Alex", done: true },
          ].map((c) => (
            <li
              key={c.t}
              className="flex items-center gap-3 rounded-xl border border-line bg-canvas/60 px-3.5 py-2.5"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs ${
                  c.done
                    ? "bg-accent-600 text-white"
                    : "border border-line bg-surface text-transparent"
                }`}
              >
                ✓
              </span>
              <span
                className={`flex-1 text-sm ${
                  c.done ? "text-faint line-through" : "text-ink"
                }`}
              >
                {c.t}
              </span>
              <span className="text-xs text-faint">Added by {c.who}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (kind === "bills") {
    return (
      <div aria-hidden="true" className={`${shell} rotate-1`}>
        <div className="flex items-center justify-between rounded-xl bg-warning-soft px-3.5 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-warning">
            Outstanding
          </p>
          <p className="font-display text-lg font-semibold text-warning">$128.40</p>
        </div>
        <ul className="mt-4 space-y-2.5">
          {[
            { t: "Internet", due: "Jun 15", amt: "$60.00", paid: false },
            { t: "Electricity", due: "Jun 18", amt: "$68.40", paid: false },
            { t: "Water", due: "Jun 2", amt: "$24.00", paid: true },
          ].map((b) => (
            <li
              key={b.t}
              className="flex items-center gap-3 rounded-xl border border-line bg-canvas/60 px-3.5 py-2.5"
            >
              <span className="flex-1 text-sm text-ink">{b.t}</span>
              <span className="text-xs text-faint">Due {b.due}</span>
              <span className="text-sm font-medium text-muted">{b.amt}</span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
                  b.paid ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
                }`}
              >
                {b.paid ? "Paid" : "Unpaid"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (kind === "expenses") {
    return (
      <div aria-hidden="true" className={`${shell} -rotate-1`}>
        <p className="font-display text-lg font-semibold text-ink">Balances</p>
        <ul className="mt-4 space-y-2.5">
          {[
            { who: "Priya owes you", amt: "+$18.00", tone: "text-success" },
            { who: "Sam owes you", amt: "+$11.50", tone: "text-success" },
            { who: "You owe Alex", amt: "−$6.00", tone: "text-muted" },
          ].map((r) => (
            <li
              key={r.who}
              className="flex items-center justify-between rounded-xl border border-line bg-canvas/60 px-3.5 py-2.5"
            >
              <span className="text-sm text-ink">{r.who}</span>
              <span className={`font-display text-sm font-semibold ${r.tone}`}>{r.amt}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-end">
          <span className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white">
            Settle up
          </span>
        </div>
      </div>
    );
  }

  // board
  return (
    <div aria-hidden="true" className={`${shell} rotate-1`}>
      <p className="font-display text-lg font-semibold text-ink">House board</p>
      <ul className="mt-4 space-y-3">
        <li className="rounded-xl border border-line bg-canvas/60 px-3.5 py-3">
          <p className="text-sm text-ink">📦 Package for the house arrives Thursday.</p>
          <p className="mt-1.5 text-xs text-faint">Sam · 2h ago</p>
        </li>
        <li className="rounded-xl border border-line bg-canvas/60 px-3.5 py-3">
          <p className="text-sm text-ink">Can we agree on a quiet-hours rule? 🙏</p>
          <p className="mt-1.5 text-xs text-faint">
            <span className="rounded bg-surface-2 px-1.5 py-0.5 font-medium text-muted">
              Anonymous
            </span>{" "}
            · 5h ago
          </p>
        </li>
      </ul>
    </div>
  );
}

export default function LandingPage({ error = null }: { error?: string | null }) {
  return (
    <main className="overflow-x-hidden">
      {/* A bounced-back sign-in failure (from /auth/callback) surfaces here. */}
      {error && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <p
            role="alert"
            className="rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            {error}
          </p>
        </div>
      )}

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate">
        {/* Warm ambient glow + grain */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-50 via-canvas to-canvas dark:from-brand-900/20" />
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
              className="animate-rise inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface/70 px-3.5 py-1.5 text-xs font-medium uppercase tracking-wide text-brand-700 backdrop-blur dark:border-brand-700 dark:text-brand-300"
              style={{ animationDelay: "0ms" }}
            >
              <span aria-hidden="true">🔥</span> For students &amp; roommates
            </p>

            <h1
              className="animate-rise mt-6 font-display text-[2.75rem] font-semibold leading-[1.04] tracking-tight text-ink sm:text-6xl"
              style={{ animationDelay: "80ms" }}
            >
              Make the shared house{" "}
              <span className="relative whitespace-nowrap text-brand-700 dark:text-brand-300">
                feel like home
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-2 w-full rounded-full bg-brand-200/70 dark:bg-brand-700/70"
                />
              </span>
              .
            </h1>

            <p
              className="animate-rise mt-6 max-w-xl text-lg leading-relaxed text-muted"
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
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-6 py-3.5 text-base font-medium text-muted transition hover:bg-surface-2"
              >
                See how it works
              </Link>
            </div>

            <p
              className="animate-rise mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted"
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
            <div className="rotate-1 rounded-2xl border border-line bg-surface p-5 shadow-card-hover">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-faint">
                    This week
                  </p>
                  <p className="font-display text-xl font-semibold text-ink">Apt 4B</p>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
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
                    className="flex items-center gap-3 rounded-xl border border-line bg-canvas/60 px-3.5 py-2.5"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs ${
                        c.done
                          ? "bg-brand-600 text-white"
                          : "border border-line bg-surface text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span
                      className={`flex-1 text-sm ${
                        c.done ? "text-faint line-through" : "text-ink"
                      }`}
                    >
                      {c.t}
                    </span>
                    <span className="text-xs text-faint">{c.who}</span>
                    <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs font-medium text-muted shadow-card">
                      {c.day}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Floating accent card */}
            <div className="absolute -bottom-6 -left-6 hidden -rotate-3 rounded-xl border border-line bg-surface p-3.5 shadow-card-hover sm:block">
              <p className="text-xs text-faint">You&apos;re owed</p>
              <p className="font-display text-lg font-semibold text-success">
                <span aria-hidden="true">▲ </span>$42.50
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features intro + index ───────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Five fewer things to argue about
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Everything a shared home needs
          </h2>
          <p className="mt-4 text-lg text-muted">
            One place for the unglamorous logistics, so you can get back to actually living
            together.
          </p>
        </div>

        {/* Quick index — scannable overview that bridges into the detail rows. */}
        <div className="mt-12 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SHOWCASE.map((f) => {
            const a = ACCENT[f.accent];
            return (
              <a
                key={f.eyebrow}
                href={`#feat-${f.mockup}`}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-4 text-center shadow-card transition hover:-translate-y-1 hover:shadow-card-hover"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${a.chip}`}
                >
                  {f.icon}
                </span>
                <span className="text-sm font-medium text-ink">{f.eyebrow}</span>
              </a>
            );
          })}
        </div>
      </section>

      {/* ─── Feature showcase — alternating detail rows ───────────────────── */}
      <section className="mt-12">
        {SHOWCASE.map((f, i) => {
          const a = ACCENT[f.accent];
          const banded = i % 2 === 1;
          return (
            <div
              key={f.eyebrow}
              id={`feat-${f.mockup}`}
              className={`scroll-mt-20 ${
                banded ? `relative border-y ${a.band}` : ""
              }`}
            >
              {banded && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-hearth-grain opacity-40"
                />
              )}
              <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:gap-16 lg:py-20">
                {/* Copy */}
                <div className={banded ? "lg:order-last" : ""}>
                  <p
                    className={`inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wide ${a.eyebrow}`}
                  >
                    <span aria-hidden="true">{f.icon}</span> {f.eyebrow}
                  </p>
                  <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                    {f.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">{f.body}</p>
                  <ul className="mt-6 space-y-2.5">
                    {f.points.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-muted">
                        <span aria-hidden="true" className={`mt-0.5 shrink-0 ${a.glyph}`}>
                          ✦
                        </span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Mockup */}
                <div className="flex justify-center">
                  <FeatureMockup kind={f.mockup} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ─── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="relative scroll-mt-20 border-y border-brand-100 bg-brand-50/40 dark:border-brand-900/40 dark:bg-brand-900/10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-hearth-grain opacity-50" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Up and running in minutes
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              How Hearth works
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <span className="font-display text-5xl font-semibold text-brand-200 dark:text-brand-800">{s.n}</span>
                <h3 className="mt-3 font-display text-xl font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
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
            <GoogleSignIn className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-surface px-7 py-3.5 text-base font-semibold text-brand-700 shadow-card transition hover:bg-brand-50 dark:bg-brand-50 dark:text-brand-800 dark:hover:bg-brand-100">
              <span
                aria-hidden="true"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white"
              >
                G
              </span>
              Get started with Google
            </GoogleSignIn>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row">
          <p className="font-display text-base font-semibold text-brand-700 dark:text-brand-300">
            <span aria-hidden="true">🔥</span> Hearth
          </p>
          <p>Shared-home harmony for students &amp; roommates.</p>
          <GoogleSignIn
            showError={false}
            className="font-medium text-muted hover:text-brand-700 dark:hover:text-brand-300"
          >
            Sign in →
          </GoogleSignIn>
        </div>
      </footer>
    </main>
  );
}
