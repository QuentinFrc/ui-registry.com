import type { Flash } from "@ui-registry/flash";
import { headers } from "next/headers";
import { FLASH_HEADER } from "./flash-middleware";

function decodeHeader(value: string): unknown {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/**
 * Returns the flash verified by `flashMiddleware` for this request, to pass
 * as `initial` to `<FlashToaster />`. Server Components only.
 */
export async function getServerFlash<T = unknown>(): Promise<Flash<T> | null> {
  const value = (await headers()).get(FLASH_HEADER);
  if (!value) {
    return null;
  }
  try {
    return decodeHeader(value) as Flash<T>;
  } catch {
    return null;
  }
}
