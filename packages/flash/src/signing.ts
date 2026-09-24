import { base64urlToBytes, bytesToBase64url, utf8 } from "./encoding.js";
import type { FlashSigner, FlashVerifier } from "./types.js";

type KeyMaterial = string | Uint8Array;

function subtle(): SubtleCrypto {
  const api = globalThis.crypto?.subtle;
  if (!api) {
    throw new Error(
      "@ui-registry/flash: signing requires WebCrypto (crypto.subtle), available in Node 19+, edge runtimes and secure browser contexts."
    );
  }
  return api;
}

// WebCrypto wants an ArrayBuffer-backed view, not a SharedArrayBuffer one.
function buffer(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes);
}

function toBytes(key: KeyMaterial): Uint8Array<ArrayBuffer> {
  return buffer(typeof key === "string" ? utf8(key) : key);
}

function decodeKey(key: KeyMaterial): Uint8Array<ArrayBuffer> {
  return buffer(typeof key === "string" ? base64urlToBytes(key) : key);
}

function safeDecode(signature: string): Uint8Array<ArrayBuffer> | null {
  try {
    return buffer(base64urlToBytes(signature));
  } catch {
    return null;
  }
}

export interface HmacOptions {
  /** Server-only secret. Never ship it to the client. */
  secret: KeyMaterial;
}

/**
 * HMAC-SHA256: one object is both the signer and the verifier. The secret
 * must stay on the server, so verification happens there too.
 */
export function hmac(
  options: HmacOptions
): FlashSigner<"async"> & FlashVerifier<"async"> {
  let key: Promise<CryptoKey> | undefined;
  const getKey = () => {
    key ??= subtle().importKey(
      "raw",
      toBytes(options.secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    return key;
  };

  return {
    alg: "HS256",
    mode: "async",
    async sign(data) {
      const signature = await subtle().sign(
        "HMAC",
        await getKey(),
        buffer(utf8(data))
      );
      return bytesToBase64url(new Uint8Array(signature));
    },
    async verify(data, signature) {
      const bytes = safeDecode(signature);
      if (!bytes) {
        return false;
      }
      return subtle().verify("HMAC", await getKey(), bytes, buffer(utf8(data)));
    },
  };
}

export interface Ed25519SignerOptions {
  /** PKCS#8 private key (base64url string or bytes), or a `CryptoKey`. */
  privateKey: KeyMaterial | CryptoKey;
}

export interface Ed25519VerifierOptions {
  /** Raw 32-byte public key (base64url string or bytes), or a `CryptoKey`. */
  publicKey: KeyMaterial | CryptoKey;
}

const ED25519 = { name: "Ed25519" } as const;

function isCryptoKey(key: unknown): key is CryptoKey {
  return typeof CryptoKey !== "undefined" && key instanceof CryptoKey;
}

function lazyKey(
  input: KeyMaterial | CryptoKey,
  format: "pkcs8" | "raw",
  usage: KeyUsage
): () => Promise<CryptoKey> {
  let key: Promise<CryptoKey> | undefined;
  return () => {
    key ??= isCryptoKey(input)
      ? Promise.resolve(input)
      : subtle().importKey(format, decodeKey(input), ED25519, false, [usage]);
    return key;
  };
}

/**
 * Ed25519: sign on the server with the private key, verify anywhere with the
 * public key, which is safe to ship in the client bundle. Check WebCrypto
 * Ed25519 support on the browsers you target.
 */
export const ed25519 = {
  signer(options: Ed25519SignerOptions): FlashSigner<"async"> {
    const getKey = lazyKey(options.privateKey, "pkcs8", "sign");
    return {
      alg: "EdDSA",
      mode: "async",
      async sign(data) {
        const signature = await subtle().sign(
          ED25519,
          await getKey(),
          buffer(utf8(data))
        );
        return bytesToBase64url(new Uint8Array(signature));
      },
    };
  },

  verifier(options: Ed25519VerifierOptions): FlashVerifier<"async"> {
    const getKey = lazyKey(options.publicKey, "raw", "verify");
    return {
      alg: "EdDSA",
      mode: "async",
      async verify(data, signature) {
        const bytes = safeDecode(signature);
        if (!bytes) {
          return false;
        }
        return subtle().verify(
          ED25519,
          await getKey(),
          bytes,
          buffer(utf8(data))
        );
      },
    };
  },

  /** Generates a key pair, encoded for environment variables. */
  async generateKeys(): Promise<{ privateKey: string; publicKey: string }> {
    const pair = (await subtle().generateKey(ED25519, true, [
      "sign",
      "verify",
    ])) as CryptoKeyPair;
    const [privateKey, publicKey] = await Promise.all([
      subtle().exportKey("pkcs8", pair.privateKey),
      subtle().exportKey("raw", pair.publicKey),
    ]);
    return {
      privateKey: bytesToBase64url(new Uint8Array(privateKey)),
      publicKey: bytesToBase64url(new Uint8Array(publicKey)),
    };
  },
};

/** A signer that can also verify (like {@link hmac}). */
export function asVerifier(signer: FlashSigner): FlashVerifier | undefined {
  const candidate = signer as Partial<FlashVerifier>;
  return typeof candidate.verify === "function"
    ? (candidate as FlashVerifier)
    : undefined;
}
