import {
  type CookieAttributes,
  cookie,
  type Flash,
  type FlashApi,
  type FlashMode,
  type FlashStore,
  searchParam,
} from "@ui-registry/flash";
import { type NextRequest, NextResponse } from "next/server";

/** Internal request header carrying the verified flash to Server Components. */
export const FLASH_HEADER = "x-ui-registry-flash";

const DEFAULT_COOKIE = "flash";
const HANDOFF_MAX_AGE = 60;

export interface FlashMiddlewareOptions {
  /** Cookie holding the flash. Defaults to `"flash"`. */
  cookieName?: string;
  /**
   * Moves a flash found in the URL into the cookie, then redirects to the
   * cleaned URL: history, analytics, `Referer` and sharing never see it.
   * Pass the URL store producers use, or `true` for `searchParam()`.
   */
  handoff?: FlashStore<"sync"> | boolean;
}

/**
 * Builds your flash instance around the cookie store the middleware provides.
 * @example (store) => createFlash({ ...presets.strict({ keys }), store })
 */
export type FlashFactory = (
  store: FlashStore<"sync">
) => FlashApi<unknown, FlashMode, never>;

function isPrefetch(request: NextRequest): boolean {
  return (
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose")?.includes("prefetch") === true
  );
}

function encodeHeader(flash: Flash<unknown>): string {
  const bytes = new TextEncoder().encode(JSON.stringify(flash));
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function handoff(
  request: NextRequest,
  from: FlashStore<"sync">,
  cookieName: string
): NextResponse | null {
  const url = new URL(request.url);
  const raw = from.read(url);
  if (!raw) {
    return null;
  }
  const response = NextResponse.redirect(from.clear(url));
  response.cookies.set(cookieName, raw, {
    httpOnly: true,
    maxAge: HANDOFF_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: url.protocol === "https:",
  });
  return response;
}

/**
 * Reads and verifies the flash cookie, deletes it on the response, and hands
 * the verified flash to Server Components through an internal request header
 * (read it with `getServerFlash()`). A header sent by the client is dropped.
 *
 * Use it from `middleware.ts` (or `proxy.ts` on Next 16+).
 */
export function flashMiddleware(
  factory: FlashFactory,
  options: FlashMiddlewareOptions = {}
) {
  const cookieName = options.cookieName ?? DEFAULT_COOKIE;
  const from =
    options.handoff === true ? searchParam() : options.handoff || null;

  return async (request: NextRequest): Promise<NextResponse> => {
    const headers = new Headers(request.headers);
    headers.delete(FLASH_HEADER);

    if (isPrefetch(request)) {
      return NextResponse.next({ request: { headers } });
    }

    if (from) {
      const redirect = handoff(request, from, cookieName);
      if (redirect) {
        return redirect;
      }
    }

    const removed: CookieAttributes[] = [];
    const store = cookie({
      name: cookieName,
      get: (name) => request.cookies.get(name)?.value,
      set: () => {
        throw new Error("flashMiddleware only reads flashes.");
      },
      remove: (_name, attributes) => {
        removed.push(attributes);
      },
    });

    const flash = await factory(store).consume(request.url);
    if (flash) {
      headers.set(FLASH_HEADER, encodeHeader(flash));
    }

    const response = NextResponse.next({ request: { headers } });
    if (removed.length > 0) {
      response.cookies.delete(cookieName);
    }
    return response;
  };
}
