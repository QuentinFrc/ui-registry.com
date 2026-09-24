/**
 * @ui-registry/flash — encode flash messages in the URL so they survive a redirect.
 *
 * Zero-dep, framework-agnostic. All functions take a URL string and return a URL
 * string, except `consumeFlash` which reads from `window.location` and cleans up
 * via `history.replaceState`.
 */

export const FLASH_PARAM = "flash";

export type FlashLevel = "info" | "success" | "warning" | "error";

export type Flash<TData = unknown> = {
  message: string;
  level?: FlashLevel;
  data?: TData;
};

export type FlashStorage = "searchParam" | "hash";

export type FlashOptions = {
  /** URL parameter name. Defaults to {@link FLASH_PARAM}. */
  param?: string;
  /** Where to encode the flash. Defaults to `"searchParam"`. */
  storage?: FlashStorage;
};

type ResolvedOptions = Required<FlashOptions>;

const DEFAULTS: ResolvedOptions = {
  param: FLASH_PARAM,
  storage: "searchParam",
};

function resolve(opts?: FlashOptions): ResolvedOptions {
  return { ...DEFAULTS, ...opts };
}

const PLACEHOLDER_ORIGIN = "http://flash.local";

function parseUrl(input: string): { url: URL; absolute: boolean } {
  try {
    return { url: new URL(input), absolute: true };
  } catch {
    return { url: new URL(input, PLACEHOLDER_ORIGIN), absolute: false };
  }
}

function serializeUrl(url: URL, absolute: boolean): string {
  if (absolute) {
    return url.toString();
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function encode<T>(flash: Flash<T>): string {
  return encodeURIComponent(JSON.stringify(flash));
}

function decode<T>(raw: string | null): Flash<T> | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as { message?: unknown }).message !== "string"
    ) {
      return null;
    }
    return parsed as Flash<T>;
  } catch {
    return null;
  }
}

function readFromHash(hash: string, param: string): string | null {
  if (!hash) {
    return null;
  }
  const stripped = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(stripped).get(param);
}

function writeToHash(hash: string, param: string, value: string): string {
  const stripped = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(stripped);
  params.set(param, value);
  return `#${params.toString()}`;
}

function deleteFromHash(hash: string, param: string): string {
  const stripped = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(stripped);
  params.delete(param);
  const next = params.toString();
  return next ? `#${next}` : "";
}

/** Append (or replace) a flash on a URL. Returns the new URL string. */
export function appendFlash<T = unknown>(
  url: string,
  flash: Flash<T>,
  opts?: FlashOptions
): string {
  const { param, storage } = resolve(opts);
  const { url: parsed, absolute } = parseUrl(url);
  const value = encode(flash);

  if (storage === "searchParam") {
    parsed.searchParams.set(param, value);
  } else {
    parsed.hash = writeToHash(parsed.hash, param, value);
  }

  return serializeUrl(parsed, absolute);
}

/** Read a flash from a URL string. Returns `null` if missing or malformed. */
export function readFlash<T = unknown>(
  url: string,
  opts?: FlashOptions
): Flash<T> | null {
  const { param, storage } = resolve(opts);
  const { url: parsed } = parseUrl(url);

  const raw =
    storage === "searchParam"
      ? parsed.searchParams.get(param)
      : readFromHash(parsed.hash, param);

  return decode<T>(raw);
}

/** Remove the flash param from a URL. Idempotent. */
export function stripFlash(url: string, opts?: FlashOptions): string {
  const { param, storage } = resolve(opts);
  const { url: parsed, absolute } = parseUrl(url);

  if (storage === "searchParam") {
    parsed.searchParams.delete(param);
  } else {
    parsed.hash = deleteFromHash(parsed.hash, param);
  }

  return serializeUrl(parsed, absolute);
}

/**
 * Browser-only: reads the flash from `window.location`, strips it from the URL
 * via `history.replaceState`, and returns it. No-op in non-browser environments.
 */
export function consumeFlash<T = unknown>(
  opts?: FlashOptions
): Flash<T> | null {
  if (typeof window === "undefined" || typeof history === "undefined") {
    return null;
  }

  const current = window.location.href;
  const flash = readFlash<T>(current, opts);
  if (!flash) {
    return null;
  }

  const cleaned = stripFlash(current, opts);
  history.replaceState(history.state, "", cleaned);
  return flash;
}
