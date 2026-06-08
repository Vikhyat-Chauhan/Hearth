// App-level 404.
import Link from "next/link";
import { EmptyState } from "@/components/states";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <EmptyState
        title="Page not found"
        description="The page you're looking for doesn't exist."
        action={
          <Link
            href="/"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Go home
          </Link>
        }
      />
    </main>
  );
}
