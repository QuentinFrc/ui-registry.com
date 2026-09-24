"use client";

import type {
  Flash,
  FlashApi,
  FlashLevel,
  FlashMode,
  ToastFlash,
} from "@ui-registry/flash";
import { Suspense } from "react";
import { type ExternalToast, toast } from "sonner";
import { useFlash } from "./use-flash";

export type FlashToast = ExternalToast & { title: string; level?: FlashLevel };

type ToToast<T> = (payload: T) => FlashToast;

export type FlashToasterProps<T> = {
  // biome-ignore lint/suspicious/noExplicitAny: any producer input is fine here
  flash: FlashApi<T, FlashMode, any>;
  /** A flash already verified on the server (see `getServerFlash`). */
  initial?: Flash<T> | null;
} & (T extends ToastFlash ? { toToast?: ToToast<T> } : { toToast: ToToast<T> });

function defaultToToast(payload: unknown): FlashToast {
  const { message, level } = payload as ToastFlash;
  return { title: message, level };
}

function show({ title, level, ...rest }: FlashToast) {
  switch (level) {
    case "success":
      toast.success(title, rest);
      break;
    case "error":
      toast.error(title, rest);
      break;
    case "warning":
      toast.warning(title, rest);
      break;
    case "info":
      toast.info(title, rest);
      break;
    default:
      toast(title, rest);
  }
}

interface InnerProps<T> {
  // biome-ignore lint/suspicious/noExplicitAny: any producer input is fine here
  flash: FlashApi<T, FlashMode, any>;
  initial?: Flash<T> | null;
  toToast: ToToast<T>;
}

function FlashToasterInner<T>({ flash, initial, toToast }: InnerProps<T>) {
  useFlash(flash, {
    initial,
    onFlash: (next) => show(toToast(next.payload)),
  });
  return null;
}

/**
 * Mount once near the root, next to `<Toaster />`, with your flash instance.
 * `toToast` is optional when the payload is a `ToastFlash` (including a
 * resolved catalog payload), required otherwise.
 */
export function FlashToaster<T>(props: FlashToasterProps<T>) {
  const toToast: ToToast<T> = props.toToast ?? defaultToToast;
  // `useSearchParams` needs a Suspense boundary to keep static rendering.
  return (
    <Suspense fallback={null}>
      <FlashToasterInner
        flash={props.flash}
        initial={props.initial}
        toToast={toToast}
      />
    </Suspense>
  );
}
