"use client";

import type { Flash, FlashApi, FlashMode } from "@ui-registry/flash";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface UseFlashOptions<T> {
  /** A flash already verified on the server (see `getServerFlash`). */
  initial?: Flash<T> | null;
  /** Called once per flash, e.g. to show a toast. */
  onFlash?: (flash: Flash<T>) => void;
}

// biome-ignore lint/suspicious/noExplicitAny: any producer input is fine here
type AnyFlashApi<T> = FlashApi<T, FlashMode, any>;

function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
  return value instanceof Promise;
}

/**
 * Consumes the flash after mount (stripping it from the URL with
 * `history.replaceState`) and again on every client navigation, since
 * `router.push` does not reload the page. Each flash is delivered once, even
 * under StrictMode, thanks to its nonce.
 */
export function useFlash<T>(
  flash: AnyFlashApi<T>,
  options: UseFlashOptions<T> = {}
): Flash<T> | null {
  const { initial = null, onFlash } = options;
  const [current, setCurrent] = useState<Flash<T> | null>(initial);
  const delivered = useRef(new Set<string>());
  const onFlashRef = useRef(onFlash);
  const pathname = usePathname();
  const search = useSearchParams()?.toString();

  useEffect(() => {
    onFlashRef.current = onFlash;
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: `pathname` and `search` re-run the effect on client navigations
  useEffect(() => {
    const deliver = (next: Flash<T> | null) => {
      if (!next || delivered.current.has(next.id)) {
        return;
      }
      delivered.current.add(next.id);
      setCurrent(next);
      onFlashRef.current?.(next);
    };

    deliver(initial);
    const result = flash.consume();
    // A consumed flash is gone from its store: deliver it even if the effect
    // was cleaned up in between (StrictMode), the id check prevents doubles.
    if (isPromise(result)) {
      result.then(deliver);
    } else {
      deliver(result);
    }
  }, [flash, initial, pathname, search]);

  return current;
}
