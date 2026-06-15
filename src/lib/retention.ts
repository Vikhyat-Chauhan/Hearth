// Data retention (server-only). Prunes accumulating user data past its retention
// window so tables don't grow without bound. Windows are env-configurable; see the
// RETENTION_* vars in .env.example. Invoked by the /api/cron/retention cron.
//
// Best-effort by row class: each delete is independent, so one failing query never
// blocks the others. Nothing here is reversible — windows default generously.

import { and, eq, lt } from "drizzle-orm";
import { db, choreLogs, announcements, shoppingItems } from "@/db";
import { toISODate } from "@/lib/recurrence";

/** Read an integer env var, falling back to `def` when unset or non-numeric. */
function days(name: string, def: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : def;
}

/** A `Date` `n` days before now (UTC). */
function cutoffDate(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

export interface PruneResult {
  choreLogs: number;
  announcements: number;
  shoppingItems: number;
}

/**
 * Delete data older than its retention window:
 *  - chore_logs    by occurrence_date  (RETENTION_CHORELOG_DAYS, default 90)
 *  - announcements by created_at        (RETENTION_ANNOUNCEMENT_DAYS, default 90)
 *  - shopping_items that are checked off, by created_at (RETENTION_SHOPPING_DAYS, default 30)
 * Returns the row count removed per class. Each class is pruned independently.
 */
export async function pruneOldData(): Promise<PruneResult> {
  const result: PruneResult = { choreLogs: 0, announcements: 0, shoppingItems: 0 };

  // chore_logs.occurrence_date is a DATE column → compare against an ISO date string.
  try {
    const cutoff = toISODate(cutoffDate(days("RETENTION_CHORELOG_DAYS", 90)));
    const rows = await db
      .delete(choreLogs)
      .where(lt(choreLogs.occurrenceDate, cutoff))
      .returning({ id: choreLogs.id });
    result.choreLogs = rows.length;
  } catch (err) {
    console.error("[retention] prune chore_logs failed:", err);
  }

  // announcements.created_at is a timestamptz → compare against a Date.
  try {
    const cutoff = cutoffDate(days("RETENTION_ANNOUNCEMENT_DAYS", 90));
    const rows = await db
      .delete(announcements)
      .where(lt(announcements.createdAt, cutoff))
      .returning({ id: announcements.id });
    result.announcements = rows.length;
  } catch (err) {
    console.error("[retention] prune announcements failed:", err);
  }

  // Only checked-off shopping items are pruned; open items stay regardless of age.
  try {
    const cutoff = cutoffDate(days("RETENTION_SHOPPING_DAYS", 30));
    const rows = await db
      .delete(shoppingItems)
      .where(and(eq(shoppingItems.checked, true), lt(shoppingItems.createdAt, cutoff)))
      .returning({ id: shoppingItems.id });
    result.shoppingItems = rows.length;
  } catch (err) {
    console.error("[retention] prune shopping_items failed:", err);
  }

  return result;
}
