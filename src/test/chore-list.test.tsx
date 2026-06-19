// Covers ChoreList's presentation: occurrences from every chore are flattened,
// sorted by date, and grouped under one header per date (rather than grouped per
// chore). The data layer is covered separately in chores-readmodel.test.ts.
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ChoreList from "@/components/ChoreList";
import type { MyChore } from "@/lib/chores";

const chores: MyChore[] = [
  {
    id: "c1",
    title: "Vacuum",
    description: null,
    rrule: "FREQ=WEEKLY",
    assignees: [],
    occurrences: [
      { date: "2026-06-14", done: false },
      { date: "2026-06-12", done: false },
    ],
  },
  {
    id: "c2",
    title: "Trash",
    description: null,
    rrule: "FREQ=WEEKLY",
    assignees: [],
    occurrences: [{ date: "2026-06-12", done: false }],
  },
];

describe("ChoreList", () => {
  it("pins today's occurrences under a 'Today' header and groups the rest by date", () => {
    render(<ChoreList chores={chores} isAdmin={false} today="2026-06-12" />);

    // Jun 12 is today → it becomes the pinned "Today" section; Jun 14 stays a
    // date section below it.
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual(["Today", "Sun, Jun 14"]);

    // Two chores share today → both rows sit under the "Today" header.
    const todaySection = headings[0].parentElement as HTMLElement;
    expect(within(todaySection).getByText("Trash")).toBeInTheDocument();
    expect(within(todaySection).getByText("Vacuum")).toBeInTheDocument();
  });

  it("always renders the 'Today' section with an empty state when nothing is due today", () => {
    render(<ChoreList chores={[{ ...chores[0], occurrences: [] }]} isAdmin={false} today="2026-06-12" />);
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual(["Today"]);
    expect(screen.getByText("Nothing due today 🎉")).toBeInTheDocument();
  });

  it("shows the 'Today' empty state and lists future occurrences below when none fall on today", () => {
    render(<ChoreList chores={chores} isAdmin={false} today="2026-06-10" />);

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual([
      "Today",
      "Fri, Jun 12",
      "Sun, Jun 14",
    ]);
    expect(screen.getByText("Nothing due today 🎉")).toBeInTheDocument();
  });
});
