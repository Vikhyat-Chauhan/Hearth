// Proves the test harness works end-to-end: pure logic + React rendering.
// Replace/extend with real feature tests; each feature ships its own.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { parseBody, nonEmpty, cents } from "@/lib/validation";
import { EmptyState } from "@/components/states";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("parseBody", () => {
  const schema = z.object({ title: nonEmpty("Title"), priceCents: cents });

  it("accepts valid input", () => {
    const result = parseBody(schema, { title: "Hat", priceCents: 1500 });
    expect(result.success).toBe(true);
  });

  it("rejects invalid input with a message", () => {
    const result = parseBody(schema, { title: "", priceCents: -1 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Title is required");
  });
});

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="No items" description="Add one to begin" />);
    expect(screen.getByText("No items")).toBeInTheDocument();
    expect(screen.getByText("Add one to begin")).toBeInTheDocument();
  });
});
