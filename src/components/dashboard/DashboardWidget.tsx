import type { ReactNode } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { ACCENTS, type AccentKey } from "@/lib/ui";

// One panel on the home dashboard: an icon-led title, a "View all →" link into
// the feature page, and a body of recent items — or a compact inline empty
// message so every widget stays the same calm, uniform shape whether full or empty.
// `accent` tints the icon chip + count pill so the grid reads warm, not flat.
export default function DashboardWidget({
  title,
  href,
  icon,
  count,
  accent = "brand",
  empty = false,
  emptyText = "Nothing here yet.",
  children,
}: {
  title: string;
  href: string;
  icon: ReactNode;
  count?: number;
  accent?: AccentKey;
  empty?: boolean;
  emptyText?: string;
  children?: ReactNode;
}) {
  const a = ACCENTS[accent];
  return (
    <Card accent={accent} interactive className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
          <span
            aria-hidden="true"
            className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-base", a.chip)}
          >
            {icon}
          </span>
          {title}
          {typeof count === "number" && count > 0 && (
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", a.badge)}>
              {count}
            </span>
          )}
        </h2>
        <Link
          href={href}
          className="shrink-0 text-sm font-medium text-brand-600 transition hover:text-brand-700"
        >
          View all →
        </Link>
      </div>

      <div className="mt-4 flex-1">
        {empty ? (
          <p className="py-3 text-sm text-muted">{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
