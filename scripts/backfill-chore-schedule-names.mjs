// One-off: bake each chore's schedule into its stored title, e.g.
//   "Vacuum" -> "Vacuum · every Monday".
// Mirrors withSchedule()/rruleToText() from src/lib/recurrence.ts — duplicated
// inline because Node can't import the TS module (no tsx/ts-node in the project).
// Idempotent: rows already carrying the suffix are left unchanged.
//
// Run with: node --env-file=.env.local scripts/backfill-chore-schedule-names.mjs [--commit]
import postgres from "postgres";

const COMMIT = process.argv.includes("--commit");

// ── minimal RRULE → text (kept in sync with src/lib/recurrence.ts) ───────────
const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const FULL_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SCHEDULE_SEP = " · ";

function parseRRule(rrule) {
  const body = rrule.trim().replace(/^RRULE:/i, "");
  const parts = {};
  for (const seg of body.split(";")) {
    const [k, v] = seg.split("=");
    if (k && v) parts[k.toUpperCase()] = v.toUpperCase();
  }
  const freqRaw = parts.FREQ;
  const freq = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freqRaw) ? freqRaw : "OTHER";
  const byday = [];
  if (parts.BYDAY) {
    for (const tok of parts.BYDAY.split(",")) {
      const m = tok.match(/^(-?\d+)?([A-Z]{2})$/);
      if (!m) continue;
      const day = WEEKDAYS.indexOf(m[2]);
      if (day < 0) continue;
      byday.push({ ordinal: m[1] ? parseInt(m[1], 10) : null, day });
    }
  }
  return {
    freq,
    interval: parts.INTERVAL ? Math.max(1, parseInt(parts.INTERVAL, 10)) : 1,
    byday,
    bymonthday: parts.BYMONTHDAY
      ? parts.BYMONTHDAY.split(",").map((d) => parseInt(d, 10)).filter(Number.isFinite)
      : [],
  };
}

function ordinalLabel(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function rruleToText(rrule) {
  const r = parseRRule(rrule);
  const n = r.interval;
  switch (r.freq) {
    case "DAILY":
      return n === 1 ? "every day" : `every ${n} days`;
    case "WEEKLY": {
      const everyWeek = n === 1 ? "every week" : `every ${n} weeks`;
      if (!r.byday.length) return everyWeek;
      const days = [...r.byday].sort((a, b) => a.day - b.day);
      if (n === 1 && days.length === 1) return `every ${FULL_WEEKDAYS[days[0].day]}`;
      return `${everyWeek} on ${days.map((b) => SHORT_WEEKDAYS[b.day]).join(", ")}`;
    }
    case "MONTHLY": {
      const everyMonth = n === 1 ? "every month" : `every ${n} months`;
      const ord = r.byday.find((b) => b.ordinal !== null);
      if (ord) {
        const label = ord.ordinal === -1 ? "last" : ordinalLabel(ord.ordinal);
        return `${everyMonth} on the ${label} ${FULL_WEEKDAYS[ord.day]}`;
      }
      if (r.bymonthday.length) return `${everyMonth} on the ${ordinalLabel(r.bymonthday[0])}`;
      return everyMonth;
    }
    case "YEARLY":
      return n === 1 ? "every year" : `every ${n} years`;
    default:
      return "";
  }
}

function stripScheduleSuffix(title) {
  const i = title.lastIndexOf(SCHEDULE_SEP);
  if (i === -1) return title;
  return title.slice(i + SCHEDULE_SEP.length).startsWith("every") ? title.slice(0, i).trimEnd() : title;
}

function withSchedule(baseTitle, rrule) {
  const base = stripScheduleSuffix(baseTitle).trim();
  const text = rruleToText(rrule);
  return text ? `${base}${SCHEDULE_SEP}${text}` : base;
}

// ── backfill ─────────────────────────────────────────────────────────────────
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

try {
  const rows = await sql`select id, title, rrule from chores order by created_at`;
  const changes = rows
    .map((r) => ({ id: r.id, old: r.title, next: withSchedule(r.title, r.rrule) }))
    .filter((c) => c.old !== c.next);

  console.log(`${rows.length} chores total; ${changes.length} need updating.`);
  if (changes.length === 0) {
    await sql.end();
    process.exit(0);
  }
  console.table(changes.map((c) => ({ id: c.id, old: c.old, "→ new": c.next })));

  if (!COMMIT) {
    console.log("\n[dry-run] Re-run with --commit to apply.");
    await sql.end();
    process.exit(0);
  }

  await sql.begin(async (tx) => {
    for (const c of changes) {
      await tx`update chores set title = ${c.next} where id = ${c.id}`;
      console.log(`Updated ${c.id}: ${c.old} → ${c.next}`);
    }
  });

  console.log("\nDone.");
} finally {
  await sql.end();
}
