import type { HTMLAttributes } from "react";

type BadgeVariant = "default" | "sky";

export function Badge({
  className = "",
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={`badge badge-${variant} ${className}`.trim()} {...props} />;
}
