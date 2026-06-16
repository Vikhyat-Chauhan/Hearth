import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function Label({
  children,
  optional,
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { optional?: boolean; children: ReactNode }) {
  return (
    <label className={cn("block text-sm font-medium text-muted", className)} {...props}>
      {children}
      {optional && <span className="ml-1 font-normal text-faint">(optional)</span>}
    </label>
  );
}
