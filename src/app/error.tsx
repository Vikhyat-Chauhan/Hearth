"use client";

// App-level error boundary. Catches render/server errors in route segments and
// offers a recovery action. Feature segments may add their own error.tsx.

import { useEffect } from "react";
import { ErrorState } from "@/components/states";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Don't surface raw error text to users in production — it can leak internals.
  const description =
    process.env.NODE_ENV === "production"
      ? "An unexpected error occurred. Please try again."
      : error.message || "An unexpected error occurred.";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <ErrorState
        title="Something went wrong"
        description={description}
        action={
          <button
            onClick={reset}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-card hover:bg-brand-700"
          >
            Try again
          </button>
        }
      />
    </main>
  );
}
