// POST /api/calendar/watch — enable two-way sync for the current user by
// registering a Google Calendar watch channel pointed at our webhook. Skipped
// (not an error) when the user hasn't connected Google. Best-effort: a Google
// failure surfaces as a clear, retryable status, never an unhandled 500.
import { getUser } from "@/lib/supabase/server";
import { registerWatch } from "@/lib/calendar-twoway";
import { ok, unauthorized, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const user = await getUser();
  if (!user) return unauthorized();

  const origin = new URL(req.url).origin;
  const webhookAddress = `${origin}/api/calendar/webhook`;

  try {
    const result = await registerWatch(user.id, webhookAddress);
    if (result.status === "skipped") {
      return ok({ enabled: false, reason: "google_not_connected" });
    }
    return ok({ enabled: true, channelId: result.channelId });
  } catch (err) {
    console.error("[calendar/watch] failed to register watch:", err);
    // Retryable: report a clear status instead of a 500.
    return ok({ enabled: false, reason: "watch_failed", retryable: true });
  }
});
