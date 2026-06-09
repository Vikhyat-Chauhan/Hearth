import type { ReactNode } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";

// One panel on the home dashboard: an icon-led title, a "View all →" link into
// the feature page, and a body of recent items — or a compact inline empty
// message so every widget stays the same calm, uniform shape whether full or empty.
export default function DashboardWidget({
  title,
  href,
  icon,
  count,
  empty = false,
  emptyText = "Nothing here yet.",
  children,
}: {
  title: string;
  href: string;
  icon: ReactNode;
  count?: number;
  empty?: boolean;
  emptyText?: string;
  children?: ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-base"
          >
            {icon}
          </span>
          {title}
          {typeof count === "number" && count > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
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
          <p className="py-3 text-sm text-gray-500">{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
