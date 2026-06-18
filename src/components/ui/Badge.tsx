import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "paid" | "unpaid" | "done" | "pending" | "neutral";

// Always pairs color WITH an icon glyph + text label so status never relies on
// color alone (accessibility). The glyph is decorative; the label carries meaning.
const variants: Record<Variant, { className: string; glyph: string }> = {
  paid: { className: "bg-success-soft text-success", glyph: "✓" },
  done: { className: "bg-success-soft text-success", glyph: "✓" },
  unpaid: { className: "bg-warning-soft text-warning", glyph: "●" },
  pending: { className: "bg-warning-soft text-warning", glyph: "●" },
  neutral: { className: "bg-surface-2 text-muted", glyph: "•" },
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
