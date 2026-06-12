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
import { toISODate } from "@/lib/recurrence";

/**
 * Validate an unknown payload against a schema. Returns a discriminated result
 * so callers handle the failure path explicitly (never throw past the route).
 *
 * `fieldErrors` maps each invalid field's path (e.g. "title", "splits") to its
 * first message, so forms can surface errors inline per-field. `error` keeps the
 * combined single-string form for callers that just want one message.
 */
export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  payload: unknown,
):
  | { success: true; data: z.infer<T> }
  | { success: false; error: string; issues: z.ZodIssue[]; fieldErrors: Record<string, string> } {
  const result = schema.safeParse(payload);
  if (result.success) return { success: true, data: result.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return {
    success: false,
    error: result.error.issues.map((i) => i.message).join("; "),
    issues: result.error.issues,
    fieldErrors,
  };
}

// Reusable field helpers.
export const cents = z.number().int().nonnegative();
export const nonEmpty = (label = "This field") =>
  z.string().trim().min(1, `${label} is required`);
// Calendar date as YYYY-MM-DD.
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

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
  // Recurrence anchor (YYYY-MM-DD). Optional — defaults to today server-side.
  // Today or future only; backdating is rejected.
  startDate: isoDate
    .refine((d) => d >= toISODate(new Date()), "Start date can't be in the past")
    .optional(),
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

// Household exit flows: admin deletes the house, a member leaves it, or the
// admin hands it to another member and leaves.
export const householdDeleteSchema = z.object({
  householdId: z.string().uuid(),
});
export type HouseholdDelete = z.infer<typeof householdDeleteSchema>;

export const householdLeaveSchema = z.object({
  householdId: z.string().uuid(),
});
export type HouseholdLeave = z.infer<typeof householdLeaveSchema>;

export const householdTransferSchema = z.object({
  householdId: z.string().uuid(),
  newAdminUserId: z.string().uuid(),
});
export type HouseholdTransfer = z.infer<typeof householdTransferSchema>;

// Multi-household: switch which household is "active" for the current user.
export const householdActiveSchema = z.object({
  householdId: z.string().uuid("A household is required"),
});
export type HouseholdActive = z.infer<typeof householdActiveSchema>;

// ---------------------------------------------------------------------------
// P2 / later-SCOPE-phase schemas (additive). Money is validated as integer
// cents via the `cents` helper above (z.number().int().nonnegative()).
// ---------------------------------------------------------------------------

// SCOPE Phase 2 — Announcements.
export const announcementCreateSchema = z.object({
  householdId: z.string().uuid("A household is required"),
  body: nonEmpty("Message").pipe(z.string().max(2000, "Message must be 2000 characters or fewer")),
  isAnonymous: z.boolean().optional().default(false),
});
export type AnnouncementCreate = z.infer<typeof announcementCreateSchema>;

// SCOPE Phase 2 — Shopping list.
export const shoppingItemCreateSchema = z.object({
  householdId: z.string().uuid("A household is required"),
  name: nonEmpty("Item").pipe(z.string().max(120, "Item must be 120 characters or fewer")),
});
export type ShoppingItemCreate = z.infer<typeof shoppingItemCreateSchema>;

export const shoppingItemUpdateSchema = z.object({
  checked: z.boolean(),
});
export type ShoppingItemUpdate = z.infer<typeof shoppingItemUpdateSchema>;

// SCOPE Phase 3 — Bills. amountCents must be a positive integer count of cents.
export const billCreateSchema = z.object({
  householdId: z.string().uuid("A household is required"),
  title: nonEmpty("Title").pipe(z.string().max(120, "Title must be 120 characters or fewer")),
  amountCents: cents.refine((v) => v > 0, "Amount must be greater than zero"),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be YYYY-MM-DD")
    .optional()
    .nullable(),
});
export type BillCreate = z.infer<typeof billCreateSchema>;

export const billUpdateSchema = z.object({
  paid: z.boolean(),
});
export type BillUpdate = z.infer<typeof billUpdateSchema>;

// SCOPE Phase 5 — Expense splitting. Each split's shareCents must sum to amountCents.
export const expenseCreateSchema = z
  .object({
    householdId: z.string().uuid("A household is required"),
    description: nonEmpty("Description").pipe(
      z.string().max(200, "Description must be 200 characters or fewer"),
    ),
    amountCents: cents.refine((v) => v > 0, "Amount must be greater than zero"),
    paidBy: z.string().uuid("Who paid is required"),
    splits: z
      .array(
        z.object({
          userId: z.string().uuid(),
          shareCents: cents,
        }),
      )
      .min(1, "Split the expense across at least one member"),
  })
  .refine(
    (e) => e.splits.reduce((sum, s) => sum + s.shareCents, 0) === e.amountCents,
    { message: "Split shares must add up to the total amount", path: ["splits"] },
  );
export type ExpenseCreate = z.infer<typeof expenseCreateSchema>;

export const settlementCreateSchema = z
  .object({
    householdId: z.string().uuid("A household is required"),
    fromUserId: z.string().uuid(),
    toUserId: z.string().uuid(),
    amountCents: cents.refine((v) => v > 0, "Amount must be greater than zero"),
  })
  .refine((s) => s.fromUserId !== s.toUserId, {
    message: "A settlement must be between two different members",
    path: ["toUserId"],
  });
export type SettlementCreate = z.infer<typeof settlementCreateSchema>;
