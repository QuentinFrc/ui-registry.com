import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import {
  base64urlToBytes,
  bytesToBase64url,
  decodeEnvelope,
} from "../src/encoding.js";
import {
  createFlash,
  defineCatalog,
  ed25519,
  type Flash,
  hmac,
  memory,
  presets,
  type ToastFlash,
} from "../src/index.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const SIGNED_URL = /^\/billing\?flash=[\w-]+\.[\w-]+$/;
const orderId = "8f14e45f-ceea-4e67-a1b2-1234567890ab";

const messages = defineCatalog({
  "order.placed": {
    level: "success",
    params: z.object({ orderId: z.uuid() }),
    render: (p) => `Order ${p.orderId.slice(0, 8)} placed`,
  },
  "auth.signed-out": { level: "info", render: () => "Signed out" },
});

/** Rewrites the envelope of an unsigned flash URL. */
function tamper(
  url: string,
  edit: (envelope: Record<string, unknown>) => void
) {
  const parsed = new URL(url, "http://x");
  const raw = parsed.searchParams.get("flash") ?? "";
  const [body = "", signature] = raw.split(".");
  const envelope = JSON.parse(new TextDecoder().decode(base64urlToBytes(body)));
  edit(envelope);
  const next = bytesToBase64url(
    new TextEncoder().encode(JSON.stringify(envelope))
  );
  parsed.searchParams.set("flash", signature ? `${next}.${signature}` : next);
  return `${parsed.pathname}${parsed.search}`;
}

describe("catalog", () => {
  const flash = createFlash({ catalog: messages });

  it("carries only the code and params, and resolves the text at read time", () => {
    const url = flash.append("/orders/42", {
      code: "order.placed",
      params: { orderId },
    });
    const raw = new URL(url, "http://x").searchParams.get("flash") ?? "";
    expect(decodeEnvelope(raw)?.p).toEqual({
      code: "order.placed",
      params: { orderId },
    });
    expect(flash.read(url)?.payload).toEqual({
      code: "order.placed",
      params: { orderId },
      level: "success",
      message: "Order 8f14e45f placed",
    });
  });

  it("supports codes without params", () => {
    const url = flash.append("/", { code: "auth.signed-out" });
    expect(flash.read(url)?.payload).toMatchObject({
      level: "info",
      message: "Signed out",
    });
  });

  it("types the payload as a discriminated union", () => {
    type Input = Parameters<typeof flash.append>[1];
    expectTypeOf<{ code: "auth.signed-out" }>().toExtend<Input>();
    expectTypeOf<{
      code: "order.placed";
      params: { orderId: string };
    }>().toExtend<Input>();
    expectTypeOf<{ code: "nope" }>().not.toExtend<Input>();
    expectTypeOf<{ code: "order.placed" }>().not.toExtend<Input>();
    const read = flash.read("/");
    if (read?.payload.code === "order.placed") {
      expectTypeOf(read.payload.params).toEqualTypeOf<{ orderId: string }>();
    }
    expectTypeOf(read).toExtend<Flash<ToastFlash> | null>();
  });

  it("rejects forged codes and params", () => {
    const onReject = vi.fn();
    const reader = createFlash({ catalog: messages, onReject });
    const open = createFlash();
    expect(
      reader.read(open.append("/", { message: "Call 555-0100" }))
    ).toBeNull();
    expect(onReject).toHaveBeenLastCalledWith(
      "unknown-code",
      expect.any(String)
    );
    expect(reader.read(open.append("/", { code: "toString" }))).toBeNull();
    expect(onReject).toHaveBeenLastCalledWith(
      "unknown-code",
      expect.any(String)
    );
    expect(
      reader.read(
        open.append("/", { code: "order.placed", params: { orderId: "hi" } })
      )
    ).toBeNull();
    expect(onReject).toHaveBeenLastCalledWith(
      "invalid-payload",
      expect.any(String)
    );
  });

  it("does not read the v0.1 format", () => {
    const legacy = encodeURIComponent(JSON.stringify({ message: "Forged" }));
    expect(flash.read(`/?flash=${encodeURIComponent(legacy)}`)).toBeNull();
  });

  it("expires after 120 s by default", () => {
    vi.useFakeTimers();
    const url = flash.append("/", { code: "auth.signed-out" });
    vi.advanceTimersByTime(120_000);
    expect(flash.read(url)).toBeNull();
  });

  it("throws on unknown codes at append time", () => {
    expect(() =>
      // @ts-expect-error unknown code
      flash.append("/", { code: "nope" })
    ).toThrow("unknown catalog code");
  });

  it("warns in dev about unconstrained string params", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    defineCatalog({
      welcome: {
        params: z.object({ name: z.string(), plan: z.enum(["pro"]) }),
        render: (p) => `Welcome ${p.name}`,
      },
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('"name"');
  });
});

describe("HMAC signature", () => {
  const flash = createFlash({
    signer: hmac({ secret: "s3cret" }),
    schema: z.object({ message: z.string() }),
  });

  it("is async and round-trips", async () => {
    expectTypeOf(flash.append).returns.toEqualTypeOf<Promise<string>>();
    const url = await flash.append("/billing", { message: "Invoice paid" });
    expect(url).toMatch(SIGNED_URL);
    expect((await flash.read(url))?.payload).toEqual({
      message: "Invoice paid",
    });
  });

  it("rejects unsigned, tampered, moved and extended flashes", async () => {
    const onReject = vi.fn();
    const reader = createFlash({
      verifier: hmac({ secret: "s3cret" }),
      onReject,
    });
    const url = await flash.append("/billing", { message: "Invoice paid" });

    expect(
      await reader.read(createFlash().append("/billing", { message: "x" }))
    ).toBeNull();
    expect(onReject).toHaveBeenLastCalledWith(
      "bad-signature",
      expect.any(String)
    );

    for (const edit of [
      (e: Record<string, unknown>) => {
        e.p = { message: "Call 555-0100" };
      },
      (e: Record<string, unknown>) => {
        e.to = "/admin";
      },
      (e: Record<string, unknown>) => {
        e.exp = Date.now() + 1e9;
      },
    ]) {
      onReject.mockClear();
      expect(await reader.read(tamper(url, edit))).toBeNull();
      expect(onReject).toHaveBeenCalledWith(
        "bad-signature",
        expect.any(String)
      );
    }

    const wrongKey = createFlash({ verifier: hmac({ secret: "other" }) });
    expect(await wrongKey.read(url)).toBeNull();
  });

  it("verifies the destination recorded in the envelope", async () => {
    const reader = createFlash({
      verifier: hmac({ secret: "s3cret" }),
      scope: "exact",
    });
    const url = await flash.append("/billing", { message: "Invoice paid" });
    expect(await reader.read(url)).not.toBeNull();
    expect(await reader.read(url.replace("/billing", "/admin"))).toBeNull();
  });
});

describe("Ed25519 signature", () => {
  it("signs with the private key and verifies with the public key", async () => {
    const keys = await ed25519.generateKeys();
    const producer = createFlash({
      signer: ed25519.signer({ privateKey: keys.privateKey }),
      schema: z.object({ message: z.string() }),
    });
    const consumer = createFlash({
      verifier: ed25519.verifier({ publicKey: keys.publicKey }),
      schema: z.object({ message: z.string() }),
    });
    const url = await producer.append("/", { message: "Signed" });
    expect((await consumer.read(url))?.payload.message).toBe("Signed");

    // A signer alone refuses to read: it cannot verify anything.
    expect(await producer.read(url)).toBeNull();

    const other = await ed25519.generateKeys();
    const impostor = createFlash({
      verifier: ed25519.verifier({ publicKey: other.publicKey }),
    });
    expect(await impostor.read(url)).toBeNull();
  });
});

describe("presets", () => {
  it("safe: catalog, url store, 120 s", () => {
    const options = presets.safe(messages);
    expect(options.ttl).toBe(120);
    expect(options.store.kind).toBe("url");
    const flash = createFlash(options);
    expectTypeOf(flash.append).returns.toEqualTypeOf<string>();
    const url = flash.append("/orders/1", {
      code: "order.placed",
      params: { orderId },
    });
    expect(flash.read(url)?.payload.message).toBe("Order 8f14e45f placed");
  });

  it("strict: signed free text validated as ToastFlash, overridable store", async () => {
    const store = memory();
    const flash = createFlash({
      ...presets.strict({ keys: { secret: "s3cret" } }),
      store,
    });
    expectTypeOf(flash.read).returns.toEqualTypeOf<
      Promise<Flash<ToastFlash> | null>
    >();
    expect(await flash.append("/billing", { message: "Invoice 12 paid" })).toBe(
      "/billing"
    );
    expect(await flash.consume("/elsewhere")).toBeNull();
    expect((await flash.consume("/billing"))?.payload).toEqual({
      message: "Invoice 12 paid",
    });
    expect(store.value).toBeNull();
  });

  it("strict: 30 s", async () => {
    vi.useFakeTimers();
    const flash = createFlash({
      ...presets.strict({ keys: { secret: "k" } }),
      store: memory(),
    });
    await flash.append("/", { message: "Hi" });
    vi.advanceTimersByTime(30_000);
    expect(await flash.read("/")).toBeNull();
  });

  it("strict: requires keys", () => {
    expect(() => presets.strict({ keys: {} })).toThrow("secret");
  });
});
