/** Wire format: `base64url(JSON envelope)`, then `.signature` when signed. */

export const ENVELOPE_VERSION = 1;

export interface Envelope {
  /** Expiration, in milliseconds since the epoch. */
  exp?: number;
  /** Creation time, in milliseconds since the epoch. */
  iat: number;
  id: string;
  p: unknown;
  /** Destination pathname. */
  to: string;
  v: typeof ENVELOPE_VERSION;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

const BASE64URL = /^[A-Za-z0-9_-]*$/;
const PADDING = /=+$/;
const ID_BYTES = 16;

export function bytesToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(PADDING, "");
}

export function base64urlToBytes(input: string): Uint8Array {
  if (!BASE64URL.test(input)) {
    throw new Error("Invalid base64url string");
  }
  const base64 = input.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function utf8(input: string): Uint8Array {
  return encoder.encode(input);
}

export function byteLength(input: string): number {
  return encoder.encode(input).byteLength;
}

export function encodeEnvelope(envelope: Envelope): string {
  return bytesToBase64url(utf8(JSON.stringify(envelope)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parses an encoded envelope. Returns `null` on any structural problem. */
export function decodeEnvelope(body: string): Envelope | null {
  try {
    const parsed: unknown = JSON.parse(decoder.decode(base64urlToBytes(body)));
    if (!isRecord(parsed)) {
      return null;
    }
    const { v, id, iat, exp, to } = parsed;
    const valid =
      v === ENVELOPE_VERSION &&
      typeof id === "string" &&
      typeof iat === "number" &&
      typeof to === "string" &&
      (exp === undefined || typeof exp === "number") &&
      "p" in parsed;
    return valid ? (parsed as unknown as Envelope) : null;
  } catch {
    return null;
  }
}

/**
 * Reads the v0.1 format (URI-encoded JSON `{ message, level?, data? }`).
 * Only the soft instance accepts it, until v1.
 */
export function decodeLegacy(raw: string): Record<string, unknown> | null {
  if (!raw.startsWith("%7B")) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (!isRecord(parsed) || typeof parsed.message !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function randomId(): string {
  const bytes = new Uint8Array(ID_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToBase64url(bytes);
}

/** Stable id for legacy flashes (bounded by `maxBytes`), used for replay checks. */
export function legacyId(raw: string): string {
  return `legacy-${raw}`;
}
