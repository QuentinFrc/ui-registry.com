import type { StandardSchemaV1 } from "./standard-schema.js";

export type MaybePromise<T> = T | Promise<T>;

/** Whether a building block (store, signer, verifier) answers synchronously. */
export type FlashMode = "sync" | "async";

/**
 * The return type of a flash method: `R` when every building block is
 * synchronous, `Promise<R>` as soon as one of them is asynchronous.
 */
export type Ret<M extends FlashMode, R> = M extends "async" ? Promise<R> : R;

/** A plain value for sync building blocks, a value or a promise otherwise. */
export type ModeRet<M extends FlashMode, R> = M extends "sync"
  ? R
  : MaybePromise<R>;

/** Where the flash lives: carried by the link, or kept as a side effect. */
export type FlashStoreKind = "url" | "side";

/**
 * A store only moves an opaque, already-encoded string around. It knows
 * nothing about the payload, the signature or the expiration.
 */
export interface FlashStore<M extends FlashMode = FlashMode> {
  clear(url: URL): ModeRet<M, URL>;
  readonly kind: FlashStoreKind;
  /** Encoded size limit enforced by `append` and on read. */
  readonly maxBytes?: number;
  readonly mode: M;
  read(url: URL): ModeRet<M, string | null>;
  write(url: URL, raw: string): ModeRet<M, URL>;
}

/** Proves that a flash was produced by your server. */
export interface FlashSigner<M extends FlashMode = FlashMode> {
  /** Algorithm identifier, informative only. */
  readonly alg: string;
  readonly mode: M;
  /** Signs `data` and returns a base64url signature. */
  sign(data: string): ModeRet<M, string>;
}

/** Checks a signature produced by the matching {@link FlashSigner}. */
export interface FlashVerifier<M extends FlashMode = FlashMode> {
  readonly alg: string;
  readonly mode: M;
  verify(data: string, signature: string): ModeRet<M, boolean>;
}

/**
 * Decides whether a flash recorded for `to` applies to the current page.
 * - `"exact"`: same pathname (default for `side` stores).
 * - `"prefix"`: the current pathname starts with `to`.
 * - `"any"`: no check (default for `url` stores).
 */
export type FlashScope =
  | "exact"
  | "prefix"
  | "any"
  | ((to: string, current: string) => boolean);

export type RejectReason =
  | "malformed"
  | "bad-signature"
  | "expired"
  | "out-of-scope"
  | "replayed"
  | "invalid-payload"
  | "unknown-code";

/** A verified flash: metadata plus the payload, never mixed together. */
export interface Flash<T> {
  /** Creation time, in milliseconds since the epoch. */
  createdAt: number;
  /** Random nonce, used to prevent replays. */
  id: string;
  payload: T;
}

export interface AppendOptions {
  /** Overrides the instance `ttl` for this flash, in seconds. */
  ttl?: number | false;
}

export type FlashLevel = "info" | "success" | "warning" | "error";

/** The toast-shaped payload used by the presets and the shadcn registry. */
export interface ToastFlash {
  level?: FlashLevel;
  message: string;
}

// biome-ignore lint/suspicious/noExplicitAny: variance-free catalog entry
export type AnyCatalogEntry = CatalogEntry<any>;

export interface CatalogEntry<P> {
  level?: FlashLevel;
  /** Validates the params at read time. Omit for messages without params. */
  params?: StandardSchemaV1<unknown, P>;
  /** Returns the message, or an i18n key. */
  render: (params: P) => string;
}

export type FlashCatalog = Record<string, AnyCatalogEntry>;

type CatalogParams<E> = E extends CatalogEntry<infer P> ? P : never;

/** Entries declared without a `params` schema infer `unknown`. */
type HasParams<E> = unknown extends CatalogParams<E> ? false : true;

/** What a producer appends: `{ code, params }`, discriminated by `code`. */
export type CatalogInput<C extends FlashCatalog> = {
  [K in keyof C & string]: HasParams<C[K]> extends true
    ? { code: K; params: CatalogParams<C[K]> }
    : { code: K; params?: undefined };
}[keyof C & string];

/** What a consumer reads: the input plus the resolved `level` and `message`. */
export type CatalogFlash<C extends FlashCatalog> = {
  [K in keyof C & string]: {
    code: K;
    level?: FlashLevel;
    message: string;
    params: HasParams<C[K]> extends true ? CatalogParams<C[K]> : undefined;
  };
}[keyof C & string];

export interface FlashOptions<T = unknown, M extends FlashMode = FlashMode> {
  /** Replaces free text with message codes. See `defineCatalog`. */
  catalog?: FlashCatalog;
  /** Maximum encoded size in bytes. Defaults to the store's limit. */
  maxBytes?: number;
  /**
   * Forces the instance to return promises. Only needed with an async
   * `schema`, which cannot be detected from its type.
   */
  mode?: M;
  /** Called whenever a flash is dropped, with the reason and the raw value. */
  onReject?: (reason: RejectReason, raw: string) => void;
  /** Validates the payload at read time. Infers `T`. */
  schema?: StandardSchemaV1<unknown, T>;
  /** Where the destination is checked. Defaults per store kind. */
  scope?: FlashScope;
  /** Producer side: signs the envelope. */
  signer?: FlashSigner<M>;
  /** Defaults to `searchParam({ key: "flash" })`. */
  store?: FlashStore<M>;
  /** Lifetime in seconds, `false` to disable. Defaults per store kind. */
  ttl?: number | false;
  /** Consumer side: rejects anything not signed by the matching signer. */
  verifier?: FlashVerifier<M>;
}

export interface FlashApi<T, M extends FlashMode = "sync", I = T> {
  /**
   * Encodes `payload` for `target` and returns the URL to redirect to. Stores
   * that do not live in the URL return it unchanged.
   */
  append(
    target: string | URL,
    payload: I,
    opts?: AppendOptions
  ): Ret<M, string>;
  /** Reads, strips and remembers the flash so it is never shown twice. */
  consume(source?: string | URL): Ret<M, Flash<T> | null>;
  /** Reads and verifies the flash without consuming it. */
  read(source?: string | URL): Ret<M, Flash<T> | null>;
  /** Removes the flash. Returns the cleaned URL. */
  strip(source?: string | URL): Ret<M, string>;
}
