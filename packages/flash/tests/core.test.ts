import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import {
  createFlash,
  type Flash,
  hash,
  memory,
  type ToastFlash,
  toastSchema,
} from "../src/index.js";
import { stubBrowser } from "./helpers.js";

const FLASH_IN_QUERY = /^\/dashboard\?ref=email&flash=[\w-]+$/;
const FLASH_IN_HASH = /^\/dashboard#flash=[\w-]+$/;
const LOCALE_PREFIX = /^\/\w{2}\//;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("soft mode — createFlash()", () => {
  const flash = createFlash<ToastFlash>();

  it("round-trips a payload through the query string", () => {
    const url = flash.append("https://example.com/login", {
      message: "Signed out",
      level: "info",
    });
    expect(url.startsWith("https://example.com/login?flash=")).toBe(true);
    const read = flash.read(url);
    expect(read?.payload).toEqual({ message: "Signed out", level: "info" });
    expect(read?.id).toHaveLength(22);
    expect(typeof read?.createdAt).toBe("number");
  });

  it("keeps relative URLs relative and preserves other params", () => {
    const url = flash.append("/dashboard?ref=email", { message: "Hi" });
    expect(url).toMatch(FLASH_IN_QUERY);
    expect(flash.read(url)?.payload).toEqual({ message: "Hi" });
  });

  it("replaces an existing flash instead of duplicating it", () => {
    const first = flash.append("/x", { message: "one" });
    const second = flash.append(first, { message: "two" });
    expect(second.match(/flash=/g)).toHaveLength(1);
    expect(flash.read(second)?.payload.message).toBe("two");
  });

  it("is synchronous and has no expiry by default", () => {
    vi.useFakeTimers();
    const url = flash.append("/x", { message: "Hi" });
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(flash.read(url)).not.toBeNull();
    expectTypeOf(flash.append).returns.toEqualTypeOf<string>();
    expectTypeOf(flash.read).returns.toEqualTypeOf<Flash<ToastFlash> | null>();
  });

  it("returns null and reports malformed values", () => {
    const onReject = vi.fn();
    const strict = createFlash({ onReject });
    expect(strict.read("/no-flash")).toBeNull();
    expect(onReject).not.toHaveBeenCalled();
    expect(strict.read("/?flash=not-an-envelope")).toBeNull();
    expect(onReject).toHaveBeenCalledWith("malformed", "not-an-envelope");
  });

  it("accepts any payload shape", () => {
    const orders = createFlash<{ orderId: number }>();
    const url = orders.append("/orders", { orderId: 42 });
    expect(orders.read(url)?.payload).toEqual({ orderId: 42 });
  });

  it("reads the v0.1 format", () => {
    const legacy = encodeURIComponent(
      JSON.stringify({ message: "Old", level: "success", data: { n: 1 } })
    );
    const url = `/x?flash=${encodeURIComponent(legacy)}`;
    expect(flash.read(url)?.payload).toEqual({
      message: "Old",
      level: "success",
      data: { n: 1 },
    });
  });

  it("strips the flash and stays idempotent", () => {
    const url = flash.append("/x?keep=1", { message: "Hi" });
    expect(flash.strip(url)).toBe("/x?keep=1");
    expect(flash.strip("/x?keep=1")).toBe("/x?keep=1");
  });

  it("refuses payloads over maxBytes", () => {
    expect(() => flash.append("/x", { message: "x".repeat(2000) })).toThrow(
      "limit"
    );
    const big = createFlash<ToastFlash>({ maxBytes: 10_000 });
    expect(() => big.append("/x", { message: "x".repeat(2000) })).not.toThrow();
  });

  it("requires a source on the server", () => {
    expect(() => flash.read()).toThrow("source");
  });
});

describe("hash store", () => {
  const flash = createFlash<ToastFlash>({ store: hash() });

  it("round-trips through the fragment only", () => {
    const url = flash.append("/dashboard", { message: "Hi" });
    expect(url).toMatch(FLASH_IN_HASH);
    expect(flash.read(url)?.payload).toEqual({ message: "Hi" });
    expect(createFlash().read(url)).toBeNull();
    expect(flash.strip(url)).toBe("/dashboard");
  });
});

describe("expiration", () => {
  it("applies the ttl option", () => {
    vi.useFakeTimers();
    const onReject = vi.fn();
    const flash = createFlash<ToastFlash>({ ttl: 10, onReject });
    const url = flash.append("/x", { message: "Hi" });
    vi.advanceTimersByTime(9000);
    expect(flash.read(url)).not.toBeNull();
    vi.advanceTimersByTime(1000);
    expect(flash.read(url)).toBeNull();
    expect(onReject).toHaveBeenCalledWith("expired", expect.any(String));
  });

  it("lets append override the ttl", () => {
    vi.useFakeTimers();
    const flash = createFlash<ToastFlash>({ ttl: 10 });
    const url = flash.append("/x", { message: "Hi" }, { ttl: false });
    vi.advanceTimersByTime(60_000);
    expect(flash.read(url)).not.toBeNull();
  });

  it("defaults to 30 s for side stores", () => {
    vi.useFakeTimers();
    const flash = createFlash<ToastFlash>({ store: memory() });
    flash.append("/x", { message: "Hi" });
    vi.advanceTimersByTime(29_000);
    expect(flash.read("/x")).not.toBeNull();
    vi.advanceTimersByTime(1000);
    expect(flash.read("/x")).toBeNull();
  });
});

describe("scope", () => {
  it("defaults to exact for side stores, and waits for the right page", () => {
    const onReject = vi.fn();
    const store = memory();
    const flash = createFlash<ToastFlash>({ store, onReject });
    expect(flash.append("/billing", { message: "Paid" })).toBe("/billing");
    expect(flash.consume("/elsewhere")).toBeNull();
    expect(onReject).toHaveBeenCalledWith("out-of-scope", expect.any(String));
    expect(store.value).not.toBeNull();
    expect(flash.consume("/billing")?.payload.message).toBe("Paid");
    expect(store.value).toBeNull();
  });

  it("supports prefix and custom rules", () => {
    const prefix = createFlash<ToastFlash>({
      store: memory(),
      scope: "prefix",
    });
    prefix.append("/orders", { message: "Hi" });
    expect(prefix.read("/orders/42")).not.toBeNull();
    expect(prefix.read("/orders")).not.toBeNull();
    expect(prefix.read("/orders-archive")).toBeNull();
    expect(prefix.read("/billing")).toBeNull();

    const ignoreLocale = createFlash<ToastFlash>({
      store: memory(),
      scope: (to, current) =>
        to.replace(LOCALE_PREFIX, "/") === current.replace(LOCALE_PREFIX, "/"),
    });
    ignoreLocale.append("/fr/orders", { message: "Hi" });
    expect(ignoreLocale.read("/en/orders")).not.toBeNull();
  });

  it("is not checked by default for url stores", () => {
    const flash = createFlash<ToastFlash>();
    const url = flash.append("/a", { message: "Hi" });
    expect(flash.read(url.replace("/a", "/b"))).not.toBeNull();
  });
});

describe("schema validation", () => {
  const schema = z.object({
    step: z.enum(["paid", "failed"]),
    cartId: z.uuid(),
  });
  const checkout = createFlash({ store: memory(), schema });
  const cartId = "8f14e45f-ceea-4e67-a1b2-1234567890ab";

  it("infers T from the schema", () => {
    expectTypeOf(checkout.read).returns.toEqualTypeOf<Flash<
      z.output<typeof schema>
    > | null>();
  });

  it("returns the validated payload", () => {
    checkout.append("/checkout", { step: "paid", cartId });
    expect(checkout.read("/checkout")?.payload).toEqual({
      step: "paid",
      cartId,
    });
  });

  it("rejects invalid payloads", () => {
    const onReject = vi.fn();
    const loose = createFlash({ onReject });
    const reader = createFlash({ schema, onReject });
    const url = loose.append("/checkout", { step: "refunded", cartId });
    expect(reader.read(url)).toBeNull();
    expect(onReject).toHaveBeenCalledWith(
      "invalid-payload",
      expect.any(String)
    );
  });

  it("ships a ToastFlash schema", () => {
    const toasts = createFlash({ schema: toastSchema });
    const url = createFlash().append("/", { message: 42 });
    expect(toasts.read(url)).toBeNull();
    const ok = toasts.append("/", { message: "Hi", level: "warning" });
    expect(toasts.read(ok)?.payload).toEqual({
      message: "Hi",
      level: "warning",
    });
  });

  it("needs mode: async for async schemas", async () => {
    const asyncSchema = z.object({ n: z.number() }).refine(async () => true);
    const url = createFlash().append("/", { n: 1 });
    expect(() => createFlash({ schema: asyncSchema }).read(url)).toThrow(
      "mode"
    );
    const flash = createFlash({ schema: asyncSchema, mode: "async" });
    expectTypeOf(flash.read).returns.toEqualTypeOf<
      Promise<Flash<{ n: number }> | null>
    >();
    expect((await flash.read(url))?.payload).toEqual({ n: 1 });
  });
});

describe("consume in the browser", () => {
  it("reads, strips the URL, preserves history state and blocks replays", () => {
    const flash = createFlash<ToastFlash>();
    const target = "https://example.com/dashboard?tab=1";
    const { location, replaceState } = stubBrowser(
      flash.append(target, { message: "Welcome" })
    );

    const consumed = flash.consume();
    expect(consumed?.payload).toEqual({ message: "Welcome" });
    expect(location.href).toBe(target);
    expect(replaceState).toHaveBeenCalledWith({ keep: true }, "", target);

    // Back button: the same flash comes back in the URL.
    const onReject = vi.fn();
    const replay = createFlash<ToastFlash>({ onReject });
    location.href = flash.append(target, { message: "other" });
    expect(replay.consume()?.payload.message).toBe("other");
    const again = `${target}&flash=${new URL(flash.append(target, { message: "x" })).searchParams.get("flash")}`;
    location.href = again;
    const first = replay.consume();
    location.href = again;
    expect(first).not.toBeNull();
    expect(replay.consume()).toBeNull();
    expect(onReject).toHaveBeenCalledWith("replayed", expect.any(String));
  });

  it("returns null without touching history when there is nothing", () => {
    const { replaceState } = stubBrowser("https://example.com/");
    expect(createFlash().consume()).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });
});
