// Covers the History tab's presentation: an overdue occurrence the viewer is
// assigned to gets a "Mark done" catch-up button, and a done occurrence the
// viewer is assigned to gets a "Mark undone" reversal button. Rows belonging to
// someone else stay read-only.
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ChoreHistoryList from "@/components/ChoreHistoryList";
import type { ChoreHistoryEntry } from "@/lib/chores";

// MarkDoneButton calls useRouter() at render time.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function entry(over: Partial<ChoreHistoryEntry>): ChoreHistoryEntry {
  return {
    choreId: "c1",
    title: "Vacuum",
    date: "2026-06-12",
    status: "overdue",
    completedById: null,
    completedByName: null,
    completedByEmail: null,
    isSelf: false,
    completedAt: null,
    assignees: [],
    ...over,
  };
}

describe("ChoreHistoryList", () => {
  it("shows a Mark done button on an overdue occurrence the viewer is assigned to", () => {
    render(
      <ChoreHistoryList
        entries={[entry({ assignees: [{ name: "Me", email: "me@x.com", isSelf: true }] })]}
      />,
    );
    expect(screen.getByRole("button", { name: "Mark done" })).toBeInTheDocument();
  });

  it("keeps an overdue occurrence assigned to someone else read-only", () => {
    render(
      <ChoreHistoryList
        entries={[entry({ assignees: [{ name: "Sam", email: "sam@x.com", isSelf: false }] })]}
      />,
    );
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark done" })).not.toBeInTheDocument();
  });

  it("shows a Mark undone button on a done occurrence the viewer is assigned to", () => {
    render(
      <ChoreHistoryList
        entries={[
          entry({
            status: "done",
            completedById: "u1",
            completedByName: "Me",
            isSelf: true,
            completedAt: new Date("2026-06-12T10:00:00Z"),
            assignees: [{ name: "Me", email: "me@x.com", isSelf: true }],
          }),
        ]}
      />,
    );
    const item = screen.getByRole("listitem");
    expect(within(item).getByText("Done")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark undone" })).toBeInTheDocument();
  });

  it("keeps a done occurrence the viewer is not assigned to read-only", () => {
    render(
      <ChoreHistoryList
        entries={[
          entry({
            status: "done",
            completedById: "u2",
            completedByName: "Sam",
            isSelf: false,
            completedAt: new Date("2026-06-12T10:00:00Z"),
            assignees: [{ name: "Sam", email: "sam@x.com", isSelf: false }],
          }),
        ]}
      />,
    );
    const item = screen.getByRole("listitem");
    expect(within(item).getByText("Done")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark undone" })).not.toBeInTheDocument();
  });
});
