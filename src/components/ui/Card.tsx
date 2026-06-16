import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { ACCENTS, type AccentKey } from "@/lib/ui";

// Standard surface for list items and sections: white card, soft border + shadow.
// Optional `accent` adds a thin tinted top rule; `interactive` adds a warm hover lift.
export default function Card({
  className,
  accent,
  interactive = false,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { accent?: AccentKey; interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-surface p-5 shadow-card",
        accent && "relative overflow-hidden",
        interactive && "transition duration-200 hover:-translate-y-0.5 hover:shadow-glow",
        className,
      )}
      {...props}
    >
      {accent && (
        <span
          aria-hidden="true"
          className={cn("absolute inset-x-0 top-0 h-1", ACCENTS[accent].line)}
        />
      )}
      {children}
    </div>
  );
}
