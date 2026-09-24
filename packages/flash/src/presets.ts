import { toastSchema } from "./catalog.js";
import {
  type Ed25519SignerOptions,
  type Ed25519VerifierOptions,
  ed25519,
  type HmacOptions,
  hmac,
} from "./signing.js";
import { type SearchParamStore, searchParam } from "./stores.js";
import type { FlashCatalog, FlashSigner, FlashVerifier } from "./types.js";

const SAFE_TTL = 120;
const STRICT_TTL = 30;

export type StrictKeys =
  | HmacOptions
  | (Partial<Ed25519SignerOptions> & Partial<Ed25519VerifierOptions>);

interface StrictBase {
  scope: "exact";
  signer?: FlashSigner<"async">;
  ttl: number;
  verifier?: FlashVerifier<"async">;
}

function signing(keys: StrictKeys): Pick<StrictBase, "signer" | "verifier"> {
  if ("secret" in keys) {
    const both = hmac(keys);
    return { signer: both, verifier: both };
  }
  if (!(keys.privateKey || keys.publicKey)) {
    throw new Error(
      "@ui-registry/flash: presets.strict needs a `secret` (HMAC), a `privateKey` or a `publicKey` (Ed25519)."
    );
  }
  return {
    signer: keys.privateKey
      ? ed25519.signer({ privateKey: keys.privateKey })
      : undefined,
    verifier: keys.publicKey
      ? ed25519.verifier({ publicKey: keys.publicKey })
      : undefined,
  };
}

function safe<const C extends FlashCatalog>(
  catalog: C
): { catalog: C; store: SearchParamStore; ttl: number } {
  return { catalog, store: searchParam(), ttl: SAFE_TTL };
}

function strict<const C extends FlashCatalog>(options: {
  catalog: C;
  keys: StrictKeys;
}): StrictBase & { catalog: C };
function strict(options: {
  keys: StrictKeys;
}): StrictBase & { schema: typeof toastSchema };
function strict(options: { catalog?: FlashCatalog; keys: StrictKeys }) {
  const base: StrictBase = {
    ...signing(options.keys),
    scope: "exact",
    ttl: STRICT_TTL,
  };
  return options.catalog
    ? { ...base, catalog: options.catalog }
    : { ...base, schema: toastSchema };
}

/**
 * Prefilled `createFlash` options, overridable field by field.
 * - `safe(catalog)`: message codes only, 120 s, no secret.
 * - `strict({ catalog?, keys })`: signed, 30 s, exact scope. Free text is
 *   validated as a `ToastFlash`. Pair it with a `cookie` store.
 */
export const presets = { safe, strict };
