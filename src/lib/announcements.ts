// Announcements read model (server-only): the message board for a household,
// newest first, with each author's display name/email joined in.

import { eq, desc } from "drizzle-orm";
import { db, announcements, profiles } from "@/db";

export interface AnnouncementView {
  id: string;
  authorId: string;
  authorName: string | null;
  authorEmail: string;
  isAnonymous: boolean;
  body: string;
  createdAt: Date;
}

/** All announcements for a household, newest first, with author info.
 * Anonymous posts keep authorId (for the author's own delete right) but their
 * name/email are stripped so identity can't leak through this view. */
export async function listAnnouncements(householdId: string): Promise<AnnouncementView[]> {
  const rows = await db
    .select({
      id: announcements.id,
      authorId: announcements.authorId,
      authorName: profiles.name,
      authorEmail: profiles.email,
      isAnonymous: announcements.isAnonymous,
      body: announcements.body,
      createdAt: announcements.createdAt,
    })
    .from(announcements)
    .innerJoin(profiles, eq(announcements.authorId, profiles.id))
    .where(eq(announcements.householdId, householdId))
    .orderBy(desc(announcements.createdAt));
  return rows.map((r) =>
    r.isAnonymous ? { ...r, authorName: null, authorEmail: "" } : r,
  );
}
