// Shared UI primitives for the three states every async view must render.
// Reuse these everywhere so loading/empty/error look consistent across features.

import type { ReactNode } from "react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-3 py-12 text-gray-500"
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <p className="text-lg font-medium text-gray-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-gray-500">{description}</p>}
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
      <p className="text-lg font-medium text-red-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-red-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
