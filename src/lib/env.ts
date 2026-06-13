// Server-only environment validation. Call assertServerEnv() once at app startup
// (from the root layout) so a misconfigured deploy fails fast and loudly instead
// of erroring later on the first DB query or calendar write.
//
// This runs on the server only. It never references secrets in a way that could
// reach the client, and it does NOT log any values — only which keys are missing.

import { assertTokenEncKey } from "@/lib/crypto";

// Required for the app to function in production. The two NEXT_PUBLIC_* keys are
// also needed at build time; the rest are server secrets.
const REQUIRED = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "TOKEN_ENC_KEY",
] as const;

let validated = false;

/**
 * Verify all required server env vars are present and TOKEN_ENC_KEY is a valid
 * 32-byte key. Idempotent (runs its checks once). In development we only warn so
 * the app still boots before .env.local is provisioned; in production a missing
 * var throws to abort the deploy.
 */
export function assertServerEnv(): void {
  if (validated) return;

  // Don't gate the production *build* — `next build` runs with NODE_ENV=production
  // but secrets aren't (and shouldn't be) present then. Validation is a runtime
  // concern; the build phase is detected via NEXT_PHASE.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  validated = true;

  const missing = REQUIRED.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const msg = `Missing required environment variable(s): ${missing.join(", ")}`;
    if (process.env.NODE_ENV === "production") throw new Error(msg);
    console.warn(`[env] ${msg} — continuing in development only.`);
    return;
  }

  // Shape-check the encryption key (must decode to 32 bytes). Throws if malformed.
  assertTokenEncKey();

  // Email notifications are optional — the app runs without them, but warn once
  // so a deploy that expects them isn't silently dropping every message.
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.warn(
      "[env] RESEND_API_KEY/EMAIL_FROM not set — email notifications are disabled (sends are skipped).",
    );
  }
}
