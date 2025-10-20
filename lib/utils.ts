// File: lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional classNames and resolve Tailwind conflicts */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
