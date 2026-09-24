/**
 * @ui-registry/flash — carry a flash message across a redirect.
 *
 * One factory, `createFlash`, whose configuration is entirely optional.
 * Without options it is the soft mode: no shape, no signature, no catalog.
 * Protections (catalog, signature, expiry, scope, replay) are added through
 * configuration without changing the API.
 */

import { isDev } from "./catalog.js";
import {
  byteLength,
  decodeEnvelope,
  decodeLegacy,
  ENVELOPE_VERSION,
  type Envelope,
  encodeEnvelope,
  legacyId,
  randomId,
} from "./encoding.js";
import { hasSeen, markSeen } from "./replay.js";
import { asVerifier } from "./signing.js";
import type { StandardSchemaV1 } from "./standard-schema.js";
import { searchParam } from "./stores.js";
import type {
  AppendOptions,
  CatalogFlash,
  CatalogInput,
  Flash,
  FlashApi,
  FlashCatalog,
  FlashMode,
  FlashOptions,
  FlashScope,
  MaybePromise,
  RejectReason,
} from "./types.js";

// biome-ignore lint/performance/noBarrelFile: the package entry point
export { defineCatalog, toastSchema } from "./catalog.js";
export { presets, type StrictKeys } from "./presets.js";
export {
  type Ed25519SignerOptions,
  type Ed25519VerifierOptions,
  ed25519,
  type HmacOptions,
  hmac,
} from "./signing.js";
export type { StandardSchemaV1 } from "./standard-schema.js";
export {
  type CookieAttributes,
  type CookieFunctions,
  type CookieJar,
  type CookieOptions,
  cookie,
  hash,
  type KeyOptions,
  memory,
  type SearchParamStore,
  searchParam,
  sessionStorage,
} from "./stores.js";
export type * from "./types.js";

/** Default lifetime of a flash carried by the URL, in seconds. */
const URL_TTL = 120;
/** Default lifetime of a flash kept in a side store, in seconds. */
const SIDE_TTL = 30;
const MS = 1000;

const PLACEHOLDER_ORIGIN = "http://flash.local";

// ————————————————————————————————————————————————————————————— type plumbing

type Field<O, K extends PropertyKey> = O extends { readonly [P in K]?: infer V }
  ? V
  : undefined;

type PartMode<P> = P extends { readonly mode: infer M }
  ? [M] extends ["sync"]
    ? "sync"
    : [M] extends ["async"]
      ? "async"
      : "unknown"
  : "sync";

type Modes<O> =
  | PartMode<Field<O, "store">>
  | PartMode<Field<O, "signer">>
  | PartMode<Field<O, "verifier">>
  | (O extends { mode: "async" } ? "async" : "sync");

/** `"async"` as soon as one building block is async. */
export type ModeOf<O> =
  "async" extends Modes<O>
    ? "async"
    : "unknown" extends Modes<O>
      ? FlashMode
      : "sync";

type CatalogOf<O> = O extends { catalog: infer C extends FlashCatalog }
  ? C
  : never;

type SchemaOf<O> = O extends { schema: infer S extends StandardSchemaV1 }
  ? S
  : never;

/** What `read` returns in `flash.payload`. */
export type OutputOf<O, T> = [CatalogOf<O>] extends [never]
  ? [SchemaOf<O>] extends [never]
    ? T
    : StandardSchemaV1.InferOutput<SchemaOf<O>>
  : CatalogFlash<CatalogOf<O>>;

/** What `append` accepts. */
export type InputOf<O, T> = [CatalogOf<O>] extends [never]
  ? [SchemaOf<O>] extends [never]
    ? T
    : StandardSchemaV1.InferInput<SchemaOf<O>>
  : CatalogInput<CatalogOf<O>>;

// ———————————————————————————————————————————————————————————————— helpers

function isPromise<T>(value: MaybePromise<T>): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Promise<T>).then === "function"
  );
}

/** Chains synchronously when possible, so sync configs stay sync. */
function chain<A, B>(
  value: MaybePromise<A>,
  fn: (value: A) => MaybePromise<B>
): MaybePromise<B> {
  return isPromise(value) ? value.then(fn) : fn(value);
}

interface ParsedUrl {
  absolute: boolean;
  url: URL;
}

function parseUrl(input: string | URL): ParsedUrl {
  if (input instanceof URL) {
    return { url: new URL(input), absolute: true };
  }
  try {
    return { url: new URL(input), absolute: true };
  } catch {
    return { url: new URL(input, PLACEHOLDER_ORIGIN), absolute: false };
  }
}

function serializeUrl(url: URL, absolute: boolean): string {
  return absolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
}

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" && typeof window.location !== "undefined"
  );
}

function resolveSource(source: string | URL | undefined): ParsedUrl {
  if (source !== undefined) {
    return parseUrl(source);
  }
  if (!isBrowser()) {
    throw new Error(
      "@ui-registry/flash: pass the request URL as `source` on the server — `window.location` is only available in the browser."
    );
  }
  return parseUrl(window.location.href);
}

function inScope(scope: FlashScope, to: string, current: string): boolean {
  if (typeof scope === "function") {
    return scope(to, current);
  }
  if (scope === "exact") {
    return to === current;
  }
  if (scope === "prefix") {
    // Match whole path segments: "/orders" covers "/orders/42", not "/orders-old".
    const base = to.endsWith("/") ? to : `${to}/`;
    return current === to || current.startsWith(base);
  }
  return true;
}

type Outcome =
  | { status: "none" }
  | { status: "ok"; flash: Flash<unknown>; exp: number | undefined }
  | { status: "rejected"; reason: RejectReason };

const NONE: Outcome = { status: "none" };

function rejected(reason: RejectReason): Outcome {
  return { status: "rejected", reason };
}

function validate(
  schema: StandardSchemaV1,
  value: unknown
): MaybePromise<{ ok: true; value: unknown } | { ok: false }> {
  return chain(schema["~standard"].validate(value), (result) =>
    result.issues
      ? { ok: false as const }
      : { ok: true as const, value: result.value }
  );
}

// ——————————————————————————————————————————————————————————————— factory

/**
 * Creates a flash instance. Declare it once (`lib/flash.ts`) and import it
 * everywhere.
 *
 * @example
 * export const flash = createFlash<ToastFlash>();
 * redirect(flash.append("/login", { message: "Signed out", level: "info" }));
 */
export function createFlash<
  T = unknown,
  const O extends FlashOptions<T> = FlashOptions<T, "sync">,
>(options?: O): FlashApi<OutputOf<O, T>, ModeOf<O>, InputOf<O, T>> {
  const opts: FlashOptions = options ?? {};
  const store = opts.store ?? searchParam();
  const { signer, catalog, schema } = opts;
  const verifier = opts.verifier ?? (signer ? asVerifier(signer) : undefined);
  const open = !(catalog || signer || verifier);
  const isUrlStore = store.kind === "url";

  const defaultTtl = isUrlStore ? URL_TTL : SIDE_TTL;
  // The soft mode carried by the URL keeps v0.1's behaviour: no expiry.
  const ttl = opts.ttl ?? (open && isUrlStore ? false : defaultTtl);
  const scope = opts.scope ?? (isUrlStore ? "any" : "exact");
  const maxBytes = opts.maxBytes ?? store.maxBytes ?? Number.POSITIVE_INFINITY;
  const async =
    opts.mode === "async" ||
    [store, signer, verifier].some((part) => part?.mode === "async");

  const logged = new Set<RejectReason>();

  function reject(reason: RejectReason, raw: string): void {
    opts.onReject?.(reason, raw);
    if (isDev() && !logged.has(reason)) {
      logged.add(reason);
      console.warn(`[@ui-registry/flash] flash rejected: ${reason}`);
    }
  }

  function finish<R>(value: MaybePromise<R>): MaybePromise<R> {
    if (async) {
      return Promise.resolve(value);
    }
    if (isPromise(value)) {
      throw new Error(
        '@ui-registry/flash: this instance is sync but got a promise (async schema?). Pass `mode: "async"` to createFlash.'
      );
    }
    return value;
  }

  type Checked =
    | { ok: true; value: unknown }
    | { ok: false; reason: RejectReason };

  function resolvePayload(payload: unknown): MaybePromise<Checked> {
    if (!catalog) {
      return { ok: true, value: payload };
    }
    const { code, params } = (payload ?? {}) as {
      code?: unknown;
      params?: unknown;
    };
    const entry =
      typeof code === "string" && Object.hasOwn(catalog, code)
        ? catalog[code]
        : undefined;
    if (!entry) {
      return { ok: false, reason: "unknown-code" };
    }
    const checked = entry.params
      ? validate(entry.params, params)
      : { ok: true as const, value: undefined };
    return chain(checked, (result): Checked => {
      if (!result.ok) {
        return { ok: false, reason: "invalid-payload" };
      }
      return {
        ok: true,
        value: {
          code,
          params: result.value,
          level: entry.level,
          message: entry.render(result.value),
        },
      };
    });
  }

  function checkPayload(
    envelope: Pick<Envelope, "id" | "iat" | "exp" | "p">
  ): MaybePromise<Outcome> {
    return chain(resolvePayload(envelope.p), (resolved) => {
      if (!resolved.ok) {
        return rejected(resolved.reason);
      }
      const checked = schema ? validate(schema, resolved.value) : resolved;
      return chain(checked, (result): Outcome => {
        if (!result.ok) {
          return rejected("invalid-payload");
        }
        return {
          status: "ok",
          exp: envelope.exp,
          flash: {
            payload: result.value,
            id: envelope.id,
            createdAt: envelope.iat,
          },
        };
      });
    });
  }

  function checkEnvelope(body: string, current: string): MaybePromise<Outcome> {
    const envelope = decodeEnvelope(body);
    if (!envelope) {
      return rejected("malformed");
    }
    if (envelope.exp !== undefined && envelope.exp <= Date.now()) {
      return rejected("expired");
    }
    if (!inScope(scope, envelope.to, current)) {
      return rejected("out-of-scope");
    }
    if (hasSeen(envelope.id)) {
      return rejected("replayed");
    }
    return checkPayload(envelope);
  }

  function evaluate(raw: string | null, url: URL): MaybePromise<Outcome> {
    if (!raw) {
      return NONE;
    }
    if (byteLength(raw) > maxBytes) {
      return rejected("malformed");
    }

    const legacy = open ? decodeLegacy(raw) : null;
    if (legacy) {
      const id = legacyId(raw);
      return hasSeen(id)
        ? rejected("replayed")
        : checkPayload({ id, iat: 0, p: legacy });
    }

    const dot = raw.indexOf(".");
    const body = dot === -1 ? raw : raw.slice(0, dot);
    if (signer && !verifier) {
      // A signer alone cannot tell a genuine flash from a forged one.
      return rejected("bad-signature");
    }
    if (!verifier) {
      return checkEnvelope(body, url.pathname);
    }
    if (dot === -1) {
      return rejected("bad-signature");
    }
    return chain(verifier.verify(body, raw.slice(dot + 1)), (valid) =>
      valid ? checkEnvelope(body, url.pathname) : rejected("bad-signature")
    );
  }

  function inspect(url: URL): MaybePromise<{ outcome: Outcome; raw: string }> {
    return chain(store.read(url), (raw) =>
      chain(evaluate(raw, url), (outcome) => {
        if (outcome.status === "rejected") {
          reject(outcome.reason, raw ?? "");
        }
        return { outcome, raw: raw ?? "" };
      })
    );
  }

  function append(
    target: string | URL,
    payload: unknown,
    appendOpts?: AppendOptions
  ) {
    const { url, absolute } = parseUrl(target);
    if (catalog) {
      const code = (payload as { code?: unknown } | null)?.code;
      if (typeof code !== "string" || !Object.hasOwn(catalog, code)) {
        throw new Error(
          `@ui-registry/flash: unknown catalog code "${String(code)}".`
        );
      }
    }
    const now = Date.now();
    const lifetime = appendOpts?.ttl ?? ttl;
    const envelope: Envelope = {
      v: ENVELOPE_VERSION,
      id: randomId(),
      iat: now,
      to: url.pathname,
      p: payload,
      ...(lifetime === false ? {} : { exp: now + lifetime * MS }),
    };
    const body = encodeEnvelope(envelope);
    const signed = signer
      ? chain(signer.sign(body), (sig) => `${body}.${sig}`)
      : body;

    return finish(
      chain(signed, (raw) => {
        const size = byteLength(raw);
        if (size > maxBytes) {
          throw new Error(
            `@ui-registry/flash: encoded flash is ${size} bytes, over the ${maxBytes}-byte limit. A flash is not a data channel.`
          );
        }
        return chain(store.write(url, raw), (next) =>
          serializeUrl(next, absolute)
        );
      })
    );
  }

  function read(source?: string | URL) {
    const { url } = resolveSource(source);
    return finish(
      chain(inspect(url), ({ outcome }) =>
        outcome.status === "ok" ? outcome.flash : null
      )
    );
  }

  function strip(source?: string | URL) {
    const { url, absolute } = resolveSource(source);
    return finish(
      chain(store.clear(url), (next) => serializeUrl(next, absolute))
    );
  }

  function consume(source?: string | URL) {
    const fromWindow = source === undefined;
    const { url, absolute } = resolveSource(source);

    return finish(
      chain(inspect(url), ({ outcome }) => {
        if (outcome.status === "none") {
          return null;
        }
        // Out of scope, a side flash waits for the right page (within its ttl).
        if (
          outcome.status === "rejected" &&
          outcome.reason === "out-of-scope" &&
          !isUrlStore
        ) {
          return null;
        }
        return chain(store.clear(url), (next) => {
          if (fromWindow && isUrlStore && typeof history !== "undefined") {
            history.replaceState(
              history.state,
              "",
              serializeUrl(next, absolute)
            );
          }
          if (outcome.status !== "ok") {
            return null;
          }
          markSeen(outcome.flash.id, outcome.exp);
          return outcome.flash;
        });
      })
    );
  }

  return { append, read, strip, consume } as unknown as FlashApi<
    OutputOf<O, T>,
    ModeOf<O>,
    InputOf<O, T>
  >;
}
