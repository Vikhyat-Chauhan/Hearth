import type { ReactNode } from "react";

/**
 * Standard page title block: the warm brand display font, a responsive size,
 * an optional subtitle, and a right-aligned action slot. Reused across every
 * (app) page so titles read consistently and keep Hearth's voice.
 */
export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold text-gray-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
