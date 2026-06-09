// Household domain helpers (server-only). Centralizes the "what household is
// this user in, and what role" lookup that every household-scoped feature needs.
//
// Multi-household (SCOPE Phase): a user may belong to several households. The
// "active" one is chosen by a cookie set via the household switcher; absent a
// valid cookie we fall back to their most recent membership.

import { randomBytes } from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import { db, households, memberships, profiles } from "@/db";
import type { Role } from "@/lib/types";

/** Cookie holding the user's currently-selected household id. */
export const ACTIVE_HOUSEHOLD_COOKIE = "hearth_active_household";

/**
 * Read the active-household cookie if we're in a request scope. Returns null
 * outside one (e.g. unit tests), so callers fall back to the most-recent rule.
 */
async function readActiveHouseholdCookie(): Promise<string | null> {
  try {
    // Imported lazily so non-request callers don't pull in the request API.
    const { cookies } = await import("next/headers");
    const store = await cookies();
    return store.get(ACTIVE_HOUSEHOLD_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

// Unambiguous alphabet (no 0/O/1/I) for human-shareable invite codes.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

export interface HouseholdContext {
  household: typeof households.$inferSelect;
  membership: typeof memberships.$inferSelect;
  role: Role;
}

/**
 * The user's active household + role, or null if they belong to none. The
 * active household is the one named by the active-household cookie (when the
 * user is a member of it); otherwise their most recent membership.
 */
export async function getHouseholdContext(userId: string): Promise<HouseholdContext | null> {
  const rows = await db
    .select({ household: households, membership: memberships })
    .from(memberships)
    .innerJoin(households, eq(memberships.householdId, households.id))
    .where(eq(memberships.userId, userId))
    .orderBy(desc(memberships.joinedAt));
  if (rows.length === 0) return null;

  const activeId = await readActiveHouseholdCookie();
  const row = (activeId && rows.find((r) => r.household.id === activeId)) || rows[0];
  return { household: row.household, membership: row.membership, role: row.membership.role as Role };
}

/** Every household the user belongs to (with their role), most recent first. */
export async function listUserHouseholds(
  userId: string,
): Promise<{ id: string; name: string; role: Role }[]> {
  const rows = await db
    .select({ id: households.id, name: households.name, role: memberships.role })
    .from(memberships)
    .innerJoin(households, eq(memberships.householdId, households.id))
    .where(eq(memberships.userId, userId))
    .orderBy(desc(memberships.joinedAt));
  return rows.map((r) => ({ id: r.id, name: r.name, role: r.role as Role }));
}

/** The current user's display label (name, falling back to email). Used for
 * the "Posting as <you>" indicator on the board and shopping forms. */
export async function getProfileName(userId: string): Promise<string> {
  const [p] = await db
    .select({ name: profiles.name, email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return p?.name ?? p?.email ?? "you";
}

/** All members of a household, with their profile (name/email), admin first. */
export async function listMembers(householdId: string) {
  return db
    .select({
      userId: memberships.userId,
      role: memberships.role,
      joinedAt: memberships.joinedAt,
      name: profiles.name,
      email: profiles.email,
    })
    .from(memberships)
    .innerJoin(profiles, eq(memberships.userId, profiles.id))
    .where(eq(memberships.householdId, householdId))
    .orderBy(desc(memberships.role)); // 'member' < 'admin' lexically; desc → admin first
}

/** Is this user the admin of this household? */
export async function isAdmin(userId: string, householdId: string): Promise<boolean> {
  const rows = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.householdId, householdId)))
    .limit(1);
  return rows[0]?.role === "admin";
}

/** Is this user a member (any role) of this household? Authorizes shared features. */
export async function isMember(userId: string, householdId: string): Promise<boolean> {
  const rows = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.householdId, householdId)))
    .limit(1);
  return rows.length > 0;
}
