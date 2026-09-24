"use client";

import type { FlashOptions } from "@ui-registry/flash";
import { useEffect } from "react";
import { toast } from "sonner";
import { useFlash } from "./use-flash";

type Props = FlashOptions;

/**
 * Mount once near the root of your app, next to `<Toaster />`. Surfaces any
 * flash message present in the URL as a Sonner toast.
 */
export function FlashToaster(props: Props) {
  const flash = useFlash<unknown>(props);

  useEffect(() => {
    if (!flash) {
      return;
    }
    switch (flash.level) {
      case "success":
        toast.success(flash.message);
        break;
      case "error":
        toast.error(flash.message);
        break;
      case "warning":
        toast.warning(flash.message);
        break;
      default:
        toast(flash.message);
    }
  }, [flash]);

  return null;
}
