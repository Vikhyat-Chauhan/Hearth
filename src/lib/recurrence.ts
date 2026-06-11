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
