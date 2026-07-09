import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "default" | "ghost";
type ButtonSize = "default" | "icon";

export function Button({
  className = "",
  variant = "default",
  size = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={`button button-${variant} button-${size} ${className}`.trim()} {...props} />;
}
