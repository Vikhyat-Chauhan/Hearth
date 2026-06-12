// In-app RRULE expansion: turn a chore's recurrence rule into concrete dates.
//
// Google Calendar expands the RRULE on its side; this is for Hearth's own
// "upcoming occurrences" view and for picking a chore's first occurrence.
//
// Supports the subset Hearth uses: FREQ=DAILY|WEEKLY|MONTHLY with INTERVAL,
// BYDAY (weekly, and monthly-by-weekday e.g. "2MO" / "-1FR"), BYMONTHDAY
// (monthly-by-date), COUNT, and UNTIL. All dates are handled as UTC calendar
// dates (YYYY-MM-DD); chores are all-day, so time-of-day is moot.

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/** A single BYDAY entry: a weekday, optionally with a monthly ordinal. */
export interface ByDay {
  /** Ordinal position within the month: 2 = "2nd", -1 = "last", null = every. */
  ordinal: number | null;
  /** Weekday index, 0=SU..6=SA. */
  day: number;
}

interface ParsedRule {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "OTHER";
  interval: number;
  byday: ByDay[];
  bymonthday: number[];
  count: number | null;
  until: string | null; // YYYY-MM-DD
}

export function parseRRule(rrule: string): ParsedRule {
  const body = rrule.trim().replace(/^RRULE:/i, "");
  const parts: Record<string, string> = {};
  for (const seg of body.split(";")) {
    const [k, v] = seg.split("=");
    if (k && v) parts[k.toUpperCase()] = v.toUpperCase();
  }
  const freqRaw = parts.FREQ as ParsedRule["freq"];
  const freq = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freqRaw) ? freqRaw : "OTHER";
  return {
    freq,
    interval: parts.INTERVAL ? Math.max(1, parseInt(parts.INTERVAL, 10)) : 1,
    byday: parts.BYDAY ? parseByDay(parts.BYDAY) : [],
    bymonthday: parts.BYMONTHDAY ? parts.BYMONTHDAY.split(",").map((d) => parseInt(d, 10)).filter(Number.isFinite) : [],
    count: parts.COUNT ? parseInt(parts.COUNT, 10) : null,
    until: parts.UNTIL ? toISODate(parseUntil(parts.UNTIL)) : null,
  };
}

/** Parse "MO,2WE,-1FR" into ByDay entries; tokens that aren't valid weekdays are dropped. */
function parseByDay(value: string): ByDay[] {
  const out: ByDay[] = [];
  for (const tok of value.split(",")) {
    const m = tok.match(/^(-?\d+)?([A-Z]{2})$/);
    if (!m) continue;
    const day = WEEKDAYS.indexOf(m[2]);
    if (day < 0) continue;
    out.push({ ordinal: m[1] ? parseInt(m[1], 10) : null, day });
  }
  return out;
}

/** Options for {@link buildRRule}. */
export interface RRuleParts {
  freq: "DAILY" | "WEEKLY" | "MONTHLY";
  /** Repeat every N units; INTERVAL is omitted when 1. */
  interval: number;
  /** BYDAY tokens, already ordinal-prefixed where needed: ["MO","WE"] or ["2MO"]. */
  byday?: string[];
  /** End date "YYYY-MM-DD"; emitted as UNTIL=YYYYMMDD. */
  until?: string;
}

/**
 * Compose an RRULE string from form state — the inverse of {@link parseRRule}.
 * e.g. { freq: "WEEKLY", interval: 2, byday: ["MO","WE"], until: "2026-08-30" }
 *      -> "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;UNTIL=20260830"
 */
export function buildRRule(p: RRuleParts): string {
  const parts = [`FREQ=${p.freq}`];
  if (p.interval > 1) parts.push(`INTERVAL=${p.interval}`);
  if (p.byday && p.byday.length) parts.push(`BYDAY=${p.byday.join(",")}`);
  if (p.until) parts.push(`UNTIL=${p.until.replace(/-/g, "")}`);
  return parts.join(";");
}

function parseUntil(v: string): Date {
  // UNTIL is e.g. 20260630 or 20260630T235959Z — take the date portion.
  const m = v.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return new Date(Date.UTC(2100, 0, 1));
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

/**
 * Return up to `count` occurrence dates (YYYY-MM-DD) on or after `from`, given a
 * chore anchored at `anchorISO` (its created date). Bounded by a day horizon so a
 * malformed/sparse rule can never loop unbounded.
 */
export function nextOccurrences(
  rrule: string,
  anchorISO: string,
  opts: { from?: string; count?: number; horizonDays?: number } = {},
): string[] {
  const rule = parseRRule(rrule);
  const anchor = fromISODate(anchorISO);
  const from = fromISODate(opts.from ?? toISODate(new Date()));
  const count = opts.count ?? 5;
  const horizon = opts.horizonDays ?? 400;

  const out: string[] = [];
  let occurrenceIndex = 0; // counts every matching occurrence from the anchor (for COUNT)

  for (let i = 0; i <= horizon && out.length < count; i++) {
    const day = addDays(anchor < from ? anchor : from, i);
    if (day < anchor) continue;
    if (rule.until && toISODate(day) > rule.until) break;
    if (!matches(rule, anchor, day)) continue;

    occurrenceIndex++;
    if (rule.count !== null && occurrenceIndex > rule.count) break;
    if (day >= from) out.push(toISODate(day));
  }
  return out;
}

function matches(rule: ParsedRule, anchor: Date, day: Date): boolean {
  const dayDiff = Math.round((day.getTime() - anchor.getTime()) / 86400000);
  switch (rule.freq) {
    case "DAILY":
      return dayDiff % rule.interval === 0;
    case "WEEKLY": {
      const days = rule.byday.length ? rule.byday.map((b) => b.day) : [anchor.getUTCDay()];
      if (!days.includes(day.getUTCDay())) return false;
      // Week index relative to the anchor's week (Sunday-based).
      const weekDiff = Math.floor((dayDiff + anchor.getUTCDay()) / 7);
      return weekDiff % rule.interval === 0;
    }
    case "MONTHLY": {
      if (monthsBetween(anchor, day) % rule.interval !== 0) return false;
      // BYDAY (ordinal weekday, e.g. "2nd Monday") takes precedence over BYMONTHDAY.
      if (rule.byday.length) {
        const date = day.getUTCDate();
        const ordinalInMonth = Math.floor((date - 1) / 7) + 1;
        const daysInMonth = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0)).getUTCDate();
        const isLast = date + 7 > daysInMonth;
        return rule.byday.some(
          (b) =>
            b.day === day.getUTCDay() &&
            (b.ordinal === null || b.ordinal === ordinalInMonth || (b.ordinal === -1 && isLast)),
        );
      }
      const bymd = rule.bymonthday.length ? rule.bymonthday : [anchor.getUTCDate()];
      return bymd.includes(day.getUTCDate());
    }
    case "YEARLY":
      return (
        day.getUTCMonth() === anchor.getUTCMonth() &&
        day.getUTCDate() === anchor.getUTCDate() &&
        (day.getUTCFullYear() - anchor.getUTCFullYear()) % rule.interval === 0
      );
    default:
      // Unknown freq: treat the anchor itself as the only occurrence.
      return toISODate(day) === toISODate(anchor);
  }
}

// ── Human-readable schedule names ────────────────────────────────────────────
// We bake a chore's cadence into its stored title (e.g. "Vacuum · every Monday")
// so chores are self-describing/unique. The text is derived from the RRULE; the
// suffix is idempotent so re-saving an edited chore never stacks ("· … · …").

/** Separator between a chore's base title and its schedule suffix. */
export const SCHEDULE_SEP = " · ";

const FULL_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "1st", "2nd", "3rd", "21st"… for a day-of-month or positive ordinal. */
function ordinalLabel(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/**
 * A concise lowercase summary of a recurrence, e.g. "every day",
 * "every Monday", "every 2 weeks on Mon, Wed", "every month on the 2nd Monday".
 * Returns "" for rules we can't summarize (so no suffix is appended).
 */
export function rruleToText(rrule: string): string {
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
        const label = ord.ordinal === -1 ? "last" : ordinalLabel(ord.ordinal!);
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

/**
 * Remove a previously-appended schedule suffix from a title, so re-saving is
 * idempotent. Cuts from the last separator only when what follows looks like our
 * generated text ("every …"); otherwise leaves the title untouched.
 */
export function stripScheduleSuffix(title: string): string {
  const i = title.lastIndexOf(SCHEDULE_SEP);
  if (i === -1) return title;
  const rest = title.slice(i + SCHEDULE_SEP.length);
  return rest.startsWith("every") ? title.slice(0, i).trimEnd() : title;
}

/**
 * Bake the schedule into a title: strip any existing suffix, then append the
 * current one. Idempotent — `withSchedule(withSchedule(t, r), r)` === `withSchedule(t, r)`.
 */
export function withSchedule(baseTitle: string, rrule: string): string {
  const base = stripScheduleSuffix(baseTitle).trim();
  const text = rruleToText(rrule);
  return text ? `${base}${SCHEDULE_SEP}${text}` : base;
}

/** The first occurrence on or after the anchor — used as the calendar event's start date. */
export function firstOccurrence(rrule: string, anchorISO: string): string {
  const next = nextOccurrences(rrule, anchorISO, { from: anchorISO, count: 1 });
  return next[0] ?? anchorISO;
}

/**
 * The schedule anchor after an edit. When the recurrence changes, move it to
 * `todayISO` so the edit applies from then on (past occurrences are untouched);
 * otherwise keep the previous anchor so a trivial title/description edit doesn't
 * reshuffle the cadence.
 */
export function nextAnchorOnEdit(
  prevRrule: string,
  prevAnchor: string | null,
  newRrule: string,
  todayISO: string,
): string | null {
  return newRrule !== prevRrule ? todayISO : prevAnchor;
}
