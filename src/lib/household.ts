// Household domain helpers (server-only). Centralizes the "what household is
// this user in, and what role" lookup that every household-scoped feature needs.
//
// V1 assumes one active household per user (SCOPE: multi-household is later). If a
// user somehow has several memberships, we use their most recent one.

import { randomBytes } from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import { db, households, memberships, profiles } from "@/db";
import type { Role } from "@/lib/types";

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

/** The user's active household + role, or null if they belong to none. */
export async function getHouseholdContext(userId: string): Promise<HouseholdContext | null> {
  const rows = await db
    .select({ household: households, membership: memberships })
    .from(memberships)
    .innerJoin(households, eq(memberships.householdId, households.id))
    .where(eq(memberships.userId, userId))
    .orderBy(desc(memberships.joinedAt))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { household: row.household, membership: row.membership, role: row.membership.role as Role };
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
