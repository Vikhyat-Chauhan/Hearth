"use client";

// Two views on the chores page: "My chores" (the viewer's assignments, with
// interactive Mark-done) and "All chores" (every chore in the household,
// read-only; admins get Edit links). Visible to everyone; only admins edit.
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { MyChore, ChoreHistoryEntry } from "@/lib/chores";
import { EmptyState } from "@/components/states";
import LinkButton from "@/components/ui/LinkButton";
import ChoreList from "@/components/ChoreList";
import ChoreHistoryList from "@/components/ChoreHistoryList";

type Tab = "mine" | "all" | "history";

export default function ChoreTabs({
  myChores,
  allChores,
  history,
  isAdmin,
}: {
  myChores: MyChore[];
  allChores: MyChore[];
  history: ChoreHistoryEntry[];
  isAdmin: boolean;
}) {
  const [tab, setTab] = useState<Tab>("mine");

  const tabClass = (active: boolean) =>
    cn(
      "rounded-lg px-3 py-1.5 text-sm font-medium transition",
      active ? "bg-brand-600 text-white shadow-card" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
    );

  return (
    <div>
      <div
        role="tablist"
        aria-label="Chore views"
        className="mt-6 inline-flex gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-card"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "mine"}
          className={tabClass(tab === "mine")}
          onClick={() => setTab("mine")}
        >
          My chores
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "all"}
          className={tabClass(tab === "all")}
          onClick={() => setTab("all")}
        >
          All chores
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "history"}
          className={tabClass(tab === "history")}
          onClick={() => setTab("history")}
        >
          History
        </button>
      </div>

      {tab === "history" ? (
        history.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No completed chores yet"
              description="Chores your household completes will show here for two weeks."
              icon="🗓️"
            />
          </div>
        ) : (
          <ChoreHistoryList entries={history} />
        )
      ) : tab === "mine" ? (
        myChores.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No chores assigned to you"
              description={
                isAdmin
                  ? "Assign a recurring chore to yourself or a roommate to get started."
                  : "When the admin assigns you a chore, it'll show up here."
              }
              icon="🧹"
              action={isAdmin ? <LinkButton href="/chores/new">Assign a chore</LinkButton> : undefined}
            />
          </div>
        ) : (
          <ChoreList chores={myChores} isAdmin={isAdmin} interactive />
        )
      ) : allChores.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No chores in this household yet"
            description={
              isAdmin
                ? "Create a recurring chore and assign it to your roommates."
                : "When the admin adds chores, they'll show up here."
            }
            icon="🧹"
            action={isAdmin ? <LinkButton href="/chores/new">Create a chore</LinkButton> : undefined}
          />
        </div>
      ) : (
        <ChoreList chores={allChores} isAdmin={isAdmin} />
      )}
    </div>
  );
}
