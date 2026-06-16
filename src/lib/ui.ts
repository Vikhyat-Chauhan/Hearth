// Shared visual-accent vocabulary for the app interior. One small map so cards,
// widgets, and page headers tint consistently per feature. `brand` (ember) is the
// dominant accent; `accent` is the complementary eucalyptus secondary; `green`
// and `amber` stay reserved for their semantic meaning (paid/done, unpaid).
//
// NOTE: these class strings must stay literal so Tailwind's content scan keeps
// them (tailwind.config content includes src/lib for exactly this reason).

export type AccentKey = "brand" | "accent" | "green" | "amber" | "neutral";

export const ACCENTS: Record<
  AccentKey,
  { chip: string; line: string; badge: string }
> = {
  // chip: icon tile bg + text · line: thin top accent rule · badge: count pill
  brand: { chip: "bg-brand-50 text-brand-700", line: "bg-brand-400", badge: "bg-brand-50 text-brand-700" },
  accent: { chip: "bg-accent-50 text-accent-700", line: "bg-accent-400", badge: "bg-accent-50 text-accent-700" },
  green: { chip: "bg-green-50 text-green-700", line: "bg-green-400", badge: "bg-green-50 text-green-700" },
  amber: { chip: "bg-amber-50 text-amber-700", line: "bg-amber-400", badge: "bg-amber-50 text-amber-700" },
  neutral: { chip: "bg-surface-2 text-muted", line: "bg-line", badge: "bg-surface-2 text-muted" },
};

// Per-feature accent assignment used by page headers and the dashboard widgets.
export const FEATURE_ACCENT = {
  chores: "brand",
  board: "accent",
  shopping: "brand",
  bills: "amber",
  expenses: "green",
  household: "accent",
  calendar: "accent",
} as const satisfies Record<string, AccentKey>;
