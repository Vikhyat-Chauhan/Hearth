// Server-only email module. The ONLY file that talks to Resend — every send
// goes through sendEmail(). Mirrors the single-module discipline of calendar.ts.
//
// Best-effort by contract: if RESEND_API_KEY/EMAIL_FROM are unset, or the send
// fails, we log and return without throwing. Email is a notification, never a
// gate on persistence, so a mail failure must NEVER bubble into a 500.

import { Resend } from "resend";
import type { OverdueChore } from "@/lib/notifications";

let client: Resend | null = null;

/** Lazily build the Resend client; null when no API key is configured. */
function getClient(): Resend | null {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  client = new Resend(key);
  return client;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send one email, best-effort. Resolves (never rejects) whether or not the send
 * happened — callers don't branch on the outcome. Skips silently when email
 * isn't configured.
 */
export async function sendEmail({ to, subject, html }: EmailMessage): Promise<void> {
  const resend = getClient();
  const from = process.env.EMAIL_FROM;
  if (!resend || !from) {
    console.warn(`[email] skipped (not configured): "${subject}" → ${to}`);
    return;
  }
  try {
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) console.error(`[email] send failed → ${to}:`, error);
  } catch (err) {
    console.error(`[email] send threw → ${to}:`, err);
  }
}

// --- Templates -------------------------------------------------------------
// Minimal inline-styled HTML. escapeHtml keeps user-supplied text safe.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-06-03" → "Jun 3", formatted as a UTC calendar date (no tz drift). */
function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function shell(heading: string, inner: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;color:#1f2937">
  <p style="font-size:20px;font-weight:700;color:#b45309">🔥 Hearth</p>
  <h1 style="font-size:18px;margin:16px 0 8px">${heading}</h1>
  ${inner}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
  <p style="font-size:12px;color:#9ca3af">You're receiving this because of your Hearth notification settings. Manage them under Settings → Notifications.</p>
</div>`;
}

/** A new board post landed in the household. */
export function announcementEmail(
  householdName: string,
  authorLabel: string,
  body: string,
): { subject: string; html: string } {
  const subject = `New announcement in ${householdName}`;
  const html = shell(
    `${escapeHtml(authorLabel)} posted to ${escapeHtml(householdName)}`,
    `<p style="font-size:15px;line-height:1.5;white-space:pre-wrap">${escapeHtml(body)}</p>`,
  );
  return { subject, html };
}

/** Daily digest of the chores due today (and any overdue) for one member. */
export function dueChoresEmail(
  name: string | null,
  householdName: string,
  dueTitles: string[],
  overdue: OverdueChore[] = [],
): { subject: string; html: string } {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const hh = escapeHtml(householdName);

  const sections: string[] = [`<p style="font-size:15px">${greeting}</p>`];

  if (dueTitles.length > 0) {
    const items = dueTitles
      .map((t) => `<li style="margin:4px 0">${escapeHtml(t)}</li>`)
      .join("");
    sections.push(
      `<p style="font-size:15px">You have these chores due today in ${hh}:</p>
       <ul style="font-size:15px;line-height:1.5;padding-left:20px">${items}</ul>`,
    );
  }

  if (overdue.length > 0) {
    const items = overdue
      .map((o) => {
        const since = `overdue since ${formatShortDate(o.oldestDate)}`;
        const times = o.count > 1 ? ` (${o.count}×)` : "";
        return `<li style="margin:4px 0">${escapeHtml(o.title)} — ${since}${times}</li>`;
      })
      .join("");
    sections.push(
      `<p style="font-size:15px;color:#b45309">⚠️ Still overdue:</p>
       <ul style="font-size:15px;line-height:1.5;padding-left:20px;color:#92400e">${items}</ul>`,
    );
  }

  const subject =
    dueTitles.length > 0
      ? dueTitles.length === 1
        ? `1 chore due today in ${householdName}`
        : `${dueTitles.length} chores due today in ${householdName}`
      : overdue.length === 1
        ? `1 overdue chore in ${householdName}`
        : `${overdue.length} overdue chores in ${householdName}`;

  const heading = dueTitles.length > 0 ? "Chores due today" : "Overdue chores";
  const html = shell(heading, sections.join("\n"));
  return { subject, html };
}
