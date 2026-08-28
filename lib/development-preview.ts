import "server-only";
import { notFound } from "next/navigation";

export function requireDevelopmentPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
}
