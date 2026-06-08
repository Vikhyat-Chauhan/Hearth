// App-level loading UI, shown while a route segment streams in.
import { LoadingState } from "@/components/states";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <LoadingState />
    </main>
  );
}
