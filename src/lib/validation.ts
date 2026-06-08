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

// Example entity schema (delete once real entities exist):
//
// export const itemCreateSchema = z.object({
//   title: nonEmpty("Title"),
//   priceCents: cents,
// });
// export type ItemCreate = z.infer<typeof itemCreateSchema>;
