// POST /api/calendar/webhook — receives Google Calendar push notifications for
// a watched channel. Google identifies the channel via the X-Goog-Channel-ID
// header; we map it to the owning user and reconcile their calendar back into
// the app (e.g. an event they deleted drops its CalendarLink).
//
// This endpoint is called by Google, not a logged-in user, so it has no session.
// It authenticates by the channel id existing in calendar_channels. It ALWAYS
// returns 200 quickly so Google doesn't retry-storm; work is best-effort.
import { NextResponse } from "next/server";
import { channelOwner, reconcileUserCalendar } from "@/lib/calendar-twoway";

export async function POST(req: Request) {
  try {
    const channelId = req.headers.get("x-goog-channel-id");
    const resourceState = req.headers.get("x-goog-resource-state");

    // The initial "sync" handshake carries no change — just acknowledge it.
    if (!channelId || resourceState === "sync") {
      return NextResponse.json({ ok: true });
    }

    const userId = await channelOwner(channelId);
    if (userId) {
      const removed = await reconcileUserCalendar(userId);
      if (removed > 0) console.log(`[calendar/webhook] reconciled ${removed} link(s) for ${userId}`);
    }
  } catch (err) {
    // Never fail the webhook — Google would retry aggressively.
    console.error("[calendar/webhook] error:", err);
  }
  return NextResponse.json({ ok: true });
}
