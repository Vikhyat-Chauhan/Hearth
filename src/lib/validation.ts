// Validation contract — one zod schema per entity (create/update).
//
// FROZEN after Sprint 0. This is the single source of validation truth; every
// stream's API routes reuse these schemas so rules stay consistent. Changes go
// through the user (Schema Change Protocol).
//
// Pattern for an API route:
//
//   import { parseBody } from "@/lib/validation";
//   import { ok, badRequest, withErrorHandling } from "@/lib/api";
//
//   export const POST = withErrorHandling(async (req) => {
//     const result = parseBody(itemCreateSchema, await req.json());
//     if (!result.success) return badRequest(result.error);
//     // ...persist result.data...
//     return ok(row, 201);
//   });

import { z } from "zod";

/**
 * Validate an unknown payload against a schema. Returns a discriminated result
 * so callers handle the failure path explicitly (never throw past the route).
 */
export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  payload: unknown,
):
  | { success: true; data: z.infer<T> }
  | { success: false; error: string; issues: z.ZodIssue[] } {
  const result = schema.safeParse(payload);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    error: result.error.issues.map((i) => i.message).join("; "),
    issues: result.error.issues,
  };
}

// Reusable field helpers.
export const cents = z.number().int().nonnegative();
export const nonEmpty = (label = "This field") =>
  z.string().trim().min(1, `${label} is required`);

// ---------------------------------------------------------------------------
// RRULE (RFC 5545) — recurrence is stored verbatim and passed to the Google
// Calendar API. We validate it is a well-formed RRULE: a FREQ plus optional,
// recognized parts. Not a full RFC parser, but rejects garbage and free text.
// ---------------------------------------------------------------------------
const RRULE_FREQ = ["SECONDLY", "MINUTELY", "HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
const RRULE_KEYS = new Set([
  "FREQ", "INTERVAL", "COUNT", "UNTIL", "BYDAY", "BYMONTHDAY", "BYMONTH",
  "BYSETPOS", "BYYEARDAY", "BYWEEKNO", "BYHOUR", "BYMINUTE", "WKST",
]);

export function isValidRRule(value: string): boolean {
  // Accept an optional "RRULE:" prefix (the Google API uses the prefixed form).
  const body = value.trim().replace(/^RRULE:/i, "");
  if (!body) return false;
  const parts = body.split(";").filter(Boolean);
  const seen = new Map<string, string>();
  for (const part of parts) {
    const [rawKey, rawVal] = part.split("=");
    if (!rawKey || rawVal === undefined || rawVal === "") return false;
    const key = rawKey.toUpperCase();
    if (!RRULE_KEYS.has(key)) return false;
    seen.set(key, rawVal.toUpperCase());
  }
  const freq = seen.get("FREQ");
  if (!freq || !RRULE_FREQ.includes(freq)) return false; // FREQ is required
  if (seen.has("INTERVAL") && !/^\d+$/.test(seen.get("INTERVAL")!)) return false;
  if (seen.has("COUNT") && !/^\d+$/.test(seen.get("COUNT")!)) return false;
  return true;
}

export const rrule = z
  .string()
  .trim()
  .refine(isValidRRule, "Recurrence must be a valid RRULE (e.g. FREQ=WEEKLY;BYDAY=MO)");

// ---------------------------------------------------------------------------
// Entity schemas — the single source of validation truth. Every stream's API
// routes reuse these. FROZEN after Sprint 0.
// ---------------------------------------------------------------------------

export const householdCreateSchema = z.object({
  name: nonEmpty("Household name").pipe(z.string().max(80, "Name must be 80 characters or fewer")),
});
export type HouseholdCreate = z.infer<typeof householdCreateSchema>;

export const householdJoinSchema = z.object({
  inviteCode: nonEmpty("Invite code"),
});
export type HouseholdJoin = z.infer<typeof householdJoinSchema>;

export const choreCreateSchema = z.object({
  householdId: z.string().uuid("A household is required"),
  title: nonEmpty("Title").pipe(z.string().max(120, "Title must be 120 characters or fewer")),
  description: z.string().trim().max(1000, "Description must be 1000 characters or fewer").optional().nullable(),
  rrule,
  assigneeUserIds: z
    .array(z.string().uuid())
    .min(1, "Assign the chore to at least one member"),
});
export type ChoreCreate = z.infer<typeof choreCreateSchema>;

// Edit reuses the create shape minus householdId (a chore can't move households).
export const choreUpdateSchema = choreCreateSchema.omit({ householdId: true });
export type ChoreUpdate = z.infer<typeof choreUpdateSchema>;

export const choreLogCreateSchema = z.object({
  choreId: z.string().uuid(),
  occurrenceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Occurrence date must be YYYY-MM-DD"),
});
export type ChoreLogCreate = z.infer<typeof choreLogCreateSchema>;

export const memberRemoveSchema = z.object({
  householdId: z.string().uuid(),
  userId: z.string().uuid(),
});
export type MemberRemove = z.infer<typeof memberRemoveSchema>;
