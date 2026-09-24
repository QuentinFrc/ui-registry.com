"use client";

import { defineConfig } from "@ui-registry/swappable";
import { useSyncExternalStore } from "react";

export type ResponsiveVariant = "mobile" | "desktop";

/** Tailwind `md` breakpoint. Adjust to match your design tokens. */
const DESKTOP_QUERY = "(min-width: 768px)";

const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};

const getSnapshot = (): ResponsiveVariant =>
  window.matchMedia(DESKTOP_QUERY).matches ? "desktop" : "mobile";

/**
 * Resolves the variant from the viewport. `initial` is what the server (and
 * the first client render) uses, so pick it from the request when you can
 * (e.g. `sec-ch-ua-mobile`) and let the client correct it after hydration.
 */
export function useResponsiveVariant({
  initial,
}: {
  initial: ResponsiveVariant;
}): ResponsiveVariant {
  return useSyncExternalStore(subscribe, getSnapshot, () => initial);
}

/**
 * Shared config: `createSwappable({ ...responsive, name: "Layout" })`.
 */
export const responsive = defineConfig({
  variants: ["mobile", "desktop"],
  fallback: "desktop",
  useVariant: useResponsiveVariant,
});
