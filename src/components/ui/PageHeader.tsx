import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ACCENTS, type AccentKey } from "@/lib/ui";

/**
 * Standard page title block: the warm brand display font, a responsive size,
 * an optional subtitle, and a right-aligned action slot. Reused across every
 * (app) page so titles read consistently and keep Hearth's voice.
 *
 * Optional `eyebrow` (small uppercase label) and `icon` (tinted chip) make the
 * header feel composed over the page's warm wash rather than a lone gray line.
 */
export default function PageHeader({
  title,
  subtitle,
  action,
  eyebrow,
  icon,
  accent = "brand",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  accent?: AccentKey;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3.5">
        {icon && (
          <span
            aria-hidden="true"
            className={cn(
              "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl",
              ACCENTS[accent].chip,
            )}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p
              className={cn(
                "text-xs font-semibold uppercase tracking-wide",
                accent === "brand" ? "text-brand-600" : "text-accent-600",
              )}
            >
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-2xl font-semibold text-gray-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
