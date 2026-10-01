import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn's `cn`, imported by registry sources as `@/lib/utils`.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
