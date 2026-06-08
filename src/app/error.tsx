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

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <ErrorState
        title="Something went wrong"
        description={error.message || "An unexpected error occurred."}
        action={
          <button
            onClick={reset}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Try again
          </button>
        }
      />
    </main>
  );
}
