"use client";

import {
  consumeFlash,
  type Flash,
  type FlashOptions,
} from "@ui-registry/flash";
import { useEffect, useState } from "react";

/**
 * Reads a flash message from the URL on mount, strips it from history, and
 * returns it. Returns `null` until the effect runs (SSR-safe).
 */
export function useFlash<TData = unknown>(
  opts?: FlashOptions
): Flash<TData> | null {
  const [flash, setFlash] = useState<Flash<TData> | null>(null);

  useEffect(() => {
    setFlash(consumeFlash<TData>(opts));
    // Options are read once on mount — passing a new object every render
    // would re-trigger the effect for no reason.
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  }, []);

  return flash;
}
