import { cn } from "@/lib/utils";

type ClassicSpinnerProps = React.ComponentProps<"span"> & {
  theme?: "dark" | "light";
};

function ClassicSpinner({ className, theme = "dark", ...props }: ClassicSpinnerProps) {
  return (
    <span
      aria-label="Loading"
      role="status"
      className={cn("classic-spinner", `classic-spinner-${theme}`, className)}
      {...props}
    />
  );
}

export { ClassicSpinner };
