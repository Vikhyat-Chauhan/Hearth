// Announcements (server component): the household message board. Any member can
// post; the author or admin can delete a message.
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getHouseholdContext, getProfileName } from "@/lib/household";
import { listAnnouncements } from "@/lib/announcements";
import { EmptyState } from "@/components/states";
import PageHeader from "@/components/ui/PageHeader";
import LinkButton from "@/components/ui/LinkButton";
import AnnouncementForm from "@/components/AnnouncementForm";
import DeleteButton from "@/components/DeleteButton";

function formatWhen(d: Date): string {
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AnnouncementsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const ctx = await getHouseholdContext(user.id);
  if (!ctx) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          title="No household yet"
          description="Create or join a household to use the message board."
          icon="📣"
          action={<LinkButton href="/household">Go to household</LinkButton>}
        />
      </main>
    );
  }

  const [items, posterLabel] = await Promise.all([
    listAnnouncements(ctx.household.id),
    getProfileName(user.id),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader title="Announcements" subtitle={`Messages for everyone in ${ctx.household.name}.`} />

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-card">
        <AnnouncementForm householdId={ctx.household.id} posterLabel={posterLabel} />
      </div>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No announcements yet" description="Post the first message above." />
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((a) => {
            const canDelete = a.authorId === user.id || ctx.role === "admin";
            return (
              <li key={a.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm text-gray-500">
                    <span className="font-medium text-gray-700">
                      {a.isAnonymous ? "Anonymous" : (a.authorName ?? a.authorEmail)}
                    </span>
                    {" · "}
                    {formatWhen(a.createdAt)}
                  </div>
                  {canDelete && (
                    <DeleteButton endpoint={`/api/announcements/${a.id}`} confirm="Delete this message?" />
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-gray-800">{a.body}</p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
