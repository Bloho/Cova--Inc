import type { ComponentProps } from "react";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="skeleton" className={["skeleton", className].filter(Boolean).join(" ")} {...props} />;
}
