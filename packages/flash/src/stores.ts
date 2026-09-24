import type { FlashStore, MaybePromise } from "./types.js";

export const DEFAULT_KEY = "flash";

/** Default size limit of stores carried by the URL. */
export const URL_MAX_BYTES = 1024;
/** Default size limit of the cookie store, under the ~4 KB browser cap. */
export const COOKIE_MAX_BYTES = 3800;
/** Default size limit of in-browser and in-memory stores. */
export const SIDE_MAX_BYTES = 16_384;

export interface KeyOptions {
  /** Name of the parameter, storage key or cookie. Defaults to `"flash"`. */
  key?: string;
}

export type SearchParamStore = FlashStore<"sync"> & { readonly kind: "url" };

/** Stores the flash in a query param. Default store, visible during SSR. */
export function searchParam(options: KeyOptions = {}): SearchParamStore {
  const key = options.key ?? DEFAULT_KEY;
  return {
    mode: "sync",
    kind: "url",
    maxBytes: URL_MAX_BYTES,
    write(url, raw) {
      const next = new URL(url);
      next.searchParams.set(key, raw);
      return next;
    },
    read: (url) => url.searchParams.get(key),
    clear(url) {
      const next = new URL(url);
      next.searchParams.delete(key);
      return next;
    },
  };
}

function hashParams(url: URL): URLSearchParams {
  return new URLSearchParams(
    url.hash.startsWith("#") ? url.hash.slice(1) : url.hash
  );
}

/** Stores the flash in the URL fragment: never sent to the server. */
export function hash(options: KeyOptions = {}): FlashStore<"sync"> {
  const key = options.key ?? DEFAULT_KEY;
  return {
    mode: "sync",
    kind: "url",
    maxBytes: URL_MAX_BYTES,
    write(url, raw) {
      const next = new URL(url);
      const params = hashParams(next);
      params.set(key, raw);
      next.hash = params.toString();
      return next;
    },
    read: (url) => hashParams(url).get(key),
    clear(url) {
      const next = new URL(url);
      const params = hashParams(next);
      params.delete(key);
      next.hash = params.toString();
      return next;
    },
  };
}

function browserSessionStorage(): Storage {
  if (typeof window === "undefined" || !window.sessionStorage) {
    throw new Error(
      "@ui-registry/flash: the sessionStorage store only works in the browser."
    );
  }
  return window.sessionStorage;
}

/** Stores the flash in `sessionStorage`: per tab, lost when it closes. */
export function sessionStorage(options: KeyOptions = {}): FlashStore<"sync"> {
  const key = options.key ?? DEFAULT_KEY;
  return {
    mode: "sync",
    kind: "side",
    maxBytes: SIDE_MAX_BYTES,
    write(url, raw) {
      browserSessionStorage().setItem(key, raw);
      return url;
    },
    read: () => browserSessionStorage().getItem(key),
    clear(url) {
      browserSessionStorage().removeItem(key);
      return url;
    },
  };
}

/** In-process store for tests. No effect outside the current process. */
export function memory(): FlashStore<"sync"> & {
  readonly value: string | null;
} {
  let value: string | null = null;
  return {
    mode: "sync",
    kind: "side",
    maxBytes: SIDE_MAX_BYTES,
    get value() {
      return value;
    },
    write(url, raw) {
      value = raw;
      return url;
    },
    read: () => value,
    clear(url) {
      value = null;
      return url;
    },
  };
}

export interface CookieAttributes {
  httpOnly: boolean;
  maxAge: number;
  path: string;
  sameSite: "lax" | "strict" | "none";
  secure: boolean;
}

/** The shape of Next's `cookies()`, and of most server cookie APIs. */
export interface CookieJar {
  delete(name: string): unknown;
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, attributes: CookieAttributes): unknown;
}

export interface CookieFunctions {
  get(name: string): string | null | undefined;
  remove(name: string, attributes: CookieAttributes): void;
  set(name: string, value: string, attributes: CookieAttributes): void;
}

export interface CookieBaseOptions extends Partial<CookieAttributes> {
  /** Encoded size limit. Defaults to 3 800 bytes. */
  maxBytes?: number;
  /** Cookie name. Defaults to `"flash"`. */
  name?: string;
}

export type CookieOptions = CookieBaseOptions &
  (
    | CookieFunctions
    | { jar: CookieJar }
    | { jar: () => MaybePromise<CookieJar> }
  );

type CookieMode<O> = O extends { jar: (...args: never[]) => unknown }
  ? "async"
  : "sync";

const DEFAULT_COOKIE_MAX_AGE = 60;

function toFunctions(jar: CookieJar): CookieFunctions {
  return {
    get: (name) => jar.get(name)?.value,
    set: (name, value, attributes) => {
      jar.set(name, value, attributes);
    },
    remove: (name) => {
      jar.delete(name);
    },
  };
}

/**
 * Stores the flash in a cookie. Pass `get`/`set`/`remove`, a cookie `jar`
 * (Next's `cookies()`), or a function returning one, which makes the store
 * async: `cookie({ jar: () => cookies() })`.
 */
export function cookie<const O extends CookieOptions>(
  options: O
): FlashStore<CookieMode<O>> {
  const name = options.name ?? DEFAULT_KEY;
  const attributes: CookieAttributes = {
    httpOnly: options.httpOnly ?? true,
    maxAge: options.maxAge ?? DEFAULT_COOKIE_MAX_AGE,
    path: options.path ?? "/",
    sameSite: options.sameSite ?? "lax",
    secure: options.secure ?? true,
  };
  const base = {
    kind: "side" as const,
    maxBytes: options.maxBytes ?? COOKIE_MAX_BYTES,
  };

  if ("jar" in options && typeof options.jar === "function") {
    const getJar = options.jar;
    const store: FlashStore<"async"> = {
      ...base,
      mode: "async",
      async write(url, raw) {
        (await getJar()).set(name, raw, attributes);
        return url;
      },
      read: async () => (await getJar()).get(name)?.value ?? null,
      async clear(url) {
        (await getJar()).delete(name);
        return url;
      },
    };
    return store as FlashStore<CookieMode<O>>;
  }

  const fns: CookieFunctions =
    "jar" in options ? toFunctions(options.jar as CookieJar) : options;
  const store: FlashStore<"sync"> = {
    ...base,
    mode: "sync",
    write(url, raw) {
      fns.set(name, raw, attributes);
      return url;
    },
    read: () => fns.get(name) ?? null,
    clear(url) {
      fns.remove(name, { ...attributes, maxAge: 0 });
      return url;
    },
  };
  return store as FlashStore<CookieMode<O>>;
}
