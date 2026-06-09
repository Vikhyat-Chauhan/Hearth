// Google Calendar sync — the ONLY module that talks to the Google Calendar API.
//
// FROZEN contract after Sprint 0. The chore feature streams call these functions;
// no other file touches Google directly. One-way sync (app → calendar): create,
// update, and delete a recurring event on a single assignee's calendar.
//
// Design rules (from CLAUDE.md):
// - Best-effort: callers wrap these so a failure never blocks chore persistence.
//   These functions THROW on a real API failure (so the caller can mark the sync
//   retryable) and return a sentinel when sync is simply not possible yet.
// - A member who hasn't connected Google has a null refresh token → SKIPPED, not
//   an error: callers pass null and get back `{ status: "skipped" }`.
//
// Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (the same OAuth app wired
// into Supabase's Google provider). The per-user refresh token is decrypted by
// the caller (src/lib/crypto.ts) and passed in.

import { decryptToken } from "@/lib/crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CAL_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export interface ChoreEventInput {
  title: string;
  description: string | null;
  /** Bare RRULE, e.g. "FREQ=WEEKLY;BYDAY=MO" (with or without the RRULE: prefix). */
  rrule: string;
  /** First occurrence date, YYYY-MM-DD. Defaults to today if omitted. */
  startDate?: string;
}

export type SyncResult =
  | { status: "synced"; externalEventId: string }
  | { status: "skipped" }; // member hasn't connected Google

function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Exchange a refresh token for a short-lived access token. Throws on failure. */
async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token refresh failed (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Google token refresh returned no access_token");
  return json.access_token;
}

function eventBody(input: ChoreEventInput) {
  const start = input.startDate ?? new Date().toISOString().slice(0, 10);
  const rule = input.rrule.toUpperCase().startsWith("RRULE:")
    ? input.rrule.toUpperCase()
    : `RRULE:${input.rrule.toUpperCase()}`;
  return {
    summary: input.title,
    description: input.description ?? undefined,
    // All-day recurring event keyed on the chore's start date.
    start: { date: start },
    end: { date: start },
    recurrence: [rule],
  };
}

async function callCalendar(
  accessToken: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<Response> {
  return fetch(`${CAL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Create or update a chore's recurring event on one assignee's calendar.
 * Pass `refreshTokenEnc = null` for a member who hasn't connected Google → skipped.
 * Pass `existingEventId` to update an event in place; omit to create a new one.
 */
export async function syncChoreEvent(
  refreshTokenEnc: string | null,
  input: ChoreEventInput,
  existingEventId?: string,
): Promise<SyncResult> {
  if (!refreshTokenEnc || !googleConfigured()) return { status: "skipped" };

  const accessToken = await getAccessToken(decryptToken(refreshTokenEnc));
  const res = existingEventId
    ? await callCalendar(accessToken, "PUT", `/${existingEventId}`, eventBody(input))
    : await callCalendar(accessToken, "POST", "", eventBody(input));

  if (!res.ok) {
    throw new Error(`Google Calendar write failed (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { id?: string };
  const externalEventId = json.id ?? existingEventId;
  if (!externalEventId) throw new Error("Google Calendar write returned no event id");
  return { status: "synced", externalEventId };
}

/** Delete a chore's event from one assignee's calendar. No-op if not connected. */
export async function deleteChoreEvent(
  refreshTokenEnc: string | null,
  externalEventId: string,
): Promise<void> {
  if (!refreshTokenEnc || !googleConfigured()) return;
  const accessToken = await getAccessToken(decryptToken(refreshTokenEnc));
  const res = await callCalendar(accessToken, "DELETE", `/${externalEventId}`);
  // 410 Gone / 404 = already deleted on Google's side — treat as success.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Google Calendar delete failed (${res.status}): ${await res.text()}`);
  }
}

// ---------------------------------------------------------------------------
// Two-way sync (SCOPE Phase 4). Watch channels let Google push a notification
// to our webhook when a user's calendar changes; reconciliation then reads the
// current event state. Best-effort and skipped when Google isn't connected.
// ---------------------------------------------------------------------------

const CHANNELS_STOP_URL = "https://www.googleapis.com/calendar/v3/channels/stop";

export type WatchResult =
  | { status: "watching"; resourceId: string; expiration: number | null }
  | { status: "skipped" };

/**
 * Register a watch channel on the user's primary calendar. Google will POST
 * notifications to `address` (our webhook) until `expiration`. `channelId` is a
 * caller-generated unique id we use to map a notification back to the user.
 */
export async function watchCalendar(
  refreshTokenEnc: string | null,
  opts: { channelId: string; address: string; token?: string },
): Promise<WatchResult> {
  if (!refreshTokenEnc || !googleConfigured()) return { status: "skipped" };
  const accessToken = await getAccessToken(decryptToken(refreshTokenEnc));
  const res = await callCalendar(accessToken, "POST", "/watch", {
    id: opts.channelId,
    type: "web_hook",
    address: opts.address,
    token: opts.token,
  });
  if (!res.ok) {
    throw new Error(`Google Calendar watch failed (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { resourceId?: string; expiration?: string };
  if (!json.resourceId) throw new Error("Google Calendar watch returned no resourceId");
  return {
    status: "watching",
    resourceId: json.resourceId,
    expiration: json.expiration ? Number(json.expiration) : null,
  };
}

/** Stop a previously-registered watch channel. Best-effort; never throws hard. */
export async function stopChannel(
  refreshTokenEnc: string | null,
  channelId: string,
  resourceId: string,
): Promise<void> {
  if (!refreshTokenEnc || !googleConfigured()) return;
  const accessToken = await getAccessToken(decryptToken(refreshTokenEnc));
  await fetch(CHANNELS_STOP_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: channelId, resourceId }),
  }).catch(() => undefined);
}

export type EventStatus = "active" | "missing" | "skipped";

/**
 * Read the current state of one event on the user's calendar. Returns "missing"
 * if the user deleted/cancelled it (404, 410, or status "cancelled") — the
 * signal two-way reconciliation uses to drop a stale CalendarLink.
 */
export async function getEventStatus(
  refreshTokenEnc: string | null,
  externalEventId: string,
): Promise<EventStatus> {
  if (!refreshTokenEnc || !googleConfigured()) return "skipped";
  const accessToken = await getAccessToken(decryptToken(refreshTokenEnc));
  const res = await callCalendar(accessToken, "GET", `/${externalEventId}`);
  if (res.status === 404 || res.status === 410) return "missing";
  if (!res.ok) {
    throw new Error(`Google Calendar get failed (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { status?: string };
  return json.status === "cancelled" ? "missing" : "active";
}
