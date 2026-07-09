import type { HTMLAttributes, ImgHTMLAttributes } from "react";

export function Avatar({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`ui-avatar ${className}`.trim()} {...props} />;
}

export function AvatarImage({ className = "", ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  return <img className={`ui-avatar-image ${className}`.trim()} {...props} />;
}

export function AvatarFallback({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`ui-avatar-fallback ${className}`.trim()} {...props} />;
}
