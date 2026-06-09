import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Standard surface for list items and sections: white card, soft border + shadow.
export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-gray-200 bg-white p-5 shadow-card", className)}
      {...props}
    />
  );
}
