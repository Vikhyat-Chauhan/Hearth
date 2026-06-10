import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClass, type ButtonVariant, type ButtonSize } from "@/components/ui/Button";

type LinkButtonProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/**
 * A next/link styled exactly like Button — use for navigational actions
 * (page CTAs, EmptyState actions) so links and buttons stay visually consistent.
 */
export default function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}
