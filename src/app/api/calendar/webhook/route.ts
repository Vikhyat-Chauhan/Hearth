// POST /api/calendar/webhook — receives Google Calendar push notifications for
// a watched channel. Google identifies the channel via the X-Goog-Channel-ID
// header; we map it to the owning user and reconcile their calendar back into
// the app (e.g. an event they deleted drops its CalendarLink).
//
// This endpoint is called by Google, not a logged-in user, so it has no session.
// It authenticates by the channel id existing in calendar_channels. It ALWAYS
// returns 200 quickly so Google doesn't retry-storm; work is best-effort.
import { NextResponse } from "next/server";
import { verifiedChannelOwner, reconcileUserCalendar } from "@/lib/calendar-twoway";

export async function POST(req: Request) {
  try {
    const channelId = req.headers.get("x-goog-channel-id");
    const channelToken = req.headers.get("x-goog-channel-token");
    const resourceState = req.headers.get("x-goog-resource-state");

    // The initial "sync" handshake carries no change — just acknowledge it.
    if (!channelId || resourceState === "sync") {
      return NextResponse.json({ ok: true });
    }

    // Verify the channel's secret token before doing any work — an unknown channel
    // or token mismatch (forged/stale notification) is silently ignored.
    const userId = await verifiedChannelOwner(channelId, channelToken);
    if (userId) {
      const removed = await reconcileUserCalendar(userId);
      if (removed > 0) console.log(`[calendar/webhook] reconciled ${removed} stale link(s)`);
    }
  } catch (err) {
    // Never fail the webhook — Google would retry aggressively.
    console.error("[calendar/webhook] error:", err);
  }
  return NextResponse.json({ ok: true });
}
