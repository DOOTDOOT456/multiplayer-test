import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convex surfaces server errors with stack traces; keep the first clean line. */
export function errMsg(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const first = raw.split("\n")[0] ?? "Something went wrong.";
  return (
    first
      .replace(/^Uncaught (?:Error|ConvexError): /, "")
      .replace(/^Server Error: /, "")
      .trim() || "Something went wrong."
  );
}
