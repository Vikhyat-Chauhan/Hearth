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
  it("flattens occurrences and groups them under one header per date, date-sorted", () => {
    render(<ChoreList chores={chores} isAdmin={false} today="2026-06-12" />);

    // One section heading per distinct date, in ascending order.
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual([
      "Fri, Jun 12",
      "Sun, Jun 14",
    ]);

    // Two chores share Jun 12 → both rows sit under that single header.
    const jun12 = headings[0].parentElement as HTMLElement;
    expect(within(jun12).getByText("Trash")).toBeInTheDocument();
    expect(within(jun12).getByText("Vacuum")).toBeInTheDocument();
  });

  it("shows an empty line when no chore has upcoming occurrences", () => {
    render(<ChoreList chores={[{ ...chores[0], occurrences: [] }]} isAdmin={false} today="2026-06-12" />);
    expect(screen.getByText("No upcoming occurrences.")).toBeInTheDocument();
  });
});
