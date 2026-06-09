import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "paid" | "unpaid" | "done" | "pending" | "neutral";

// Always pairs color WITH an icon glyph + text label so status never relies on
// color alone (accessibility). The glyph is decorative; the label carries meaning.
const variants: Record<Variant, { className: string; glyph: string }> = {
  paid: { className: "bg-green-50 text-green-700", glyph: "✓" },
  done: { className: "bg-green-50 text-green-700", glyph: "✓" },
  unpaid: { className: "bg-amber-50 text-amber-700", glyph: "●" },
  pending: { className: "bg-amber-50 text-amber-700", glyph: "●" },
  neutral: { className: "bg-gray-100 text-gray-600", glyph: "•" },
};

export default function Badge({
  variant = "neutral",
  children,
}: {
  variant?: Variant;
  children: ReactNode;
}) {
  const v = variants[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        v.className,
      )}
    >
      <span aria-hidden="true">{v.glyph}</span>
      {children}
    </span>
  );
}
