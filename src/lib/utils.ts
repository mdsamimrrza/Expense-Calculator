import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Display name with the same fallback the APK and avatar menu use:
 * stored name, else the email prefix capitalized.
 */
export function displayNameFor(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  if (name && name.trim()) return name.trim();
  if (email && email.includes("@")) {
    const prefix = email.split("@")[0].trim();
    if (prefix) return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
  return "Portfolio Owner";
}
