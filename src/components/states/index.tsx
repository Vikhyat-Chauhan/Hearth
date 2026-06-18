// Shared UI primitives for the three states every async view must render.
// Reuse these everywhere so loading/empty/error look consistent across features.

import type { ReactNode } from "react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-3 py-12 text-muted"
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  description,
  icon = "✨",
  action,
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div
        aria-hidden="true"
        className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-accent-50 text-2xl ring-1 ring-inset ring-brand-100 dark:from-brand-900/30 dark:to-accent-900/30 dark:ring-brand-900/40"
      >
        {icon}
      </div>
      <p className="text-lg font-medium text-muted">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 py-12 text-center"
    >
      <div
        aria-hidden="true"
        className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-2xl"
      >
        ⚠
      </div>
      <p className="text-lg font-medium text-danger">{title}</p>
      {description && <p className="max-w-sm text-sm text-danger/80">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
