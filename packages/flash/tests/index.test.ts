import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendFlash,
  consumeFlash,
  FLASH_PARAM,
  type Flash,
  readFlash,
  stripFlash,
} from "../src/index.js";

describe("constants", () => {
  it("exposes the default URL param name", () => {
    expect(FLASH_PARAM).toBe("flash");
  });
});

describe("appendFlash / readFlash — searchParam (default)", () => {
  it("round-trips a flash on an absolute URL", () => {
    const flash: Flash = { message: "Saved", level: "success" };
    const url = appendFlash("https://example.com/login", flash);
    expect(url).toContain("https://example.com/login?flash=");
    expect(readFlash(url)).toEqual(flash);
  });

  it("round-trips on a relative URL and preserves the rest", () => {
    const flash: Flash = { message: "Hi" };
    const url = appendFlash("/dashboard?ref=email", flash);
    expect(url).toMatch(/^\/dashboard\?ref=email&flash=/);
    expect(readFlash(url)).toEqual(flash);
  });

  it("preserves a typed data payload", () => {
    type Payload = { orderId: number };
    const flash: Flash<Payload> = {
      message: "Order placed",
      level: "success",
      data: { orderId: 42 },
    };
    const url = appendFlash("/orders", flash);
    expect(readFlash<Payload>(url)).toEqual(flash);
  });

  it("replaces an existing flash rather than duplicating", () => {
    const first = appendFlash("/x", { message: "one" });
    const second = appendFlash(first, { message: "two" });
    expect(second.match(/flash=/g)).toHaveLength(1);
    expect(readFlash(second)?.message).toBe("two");
  });

  it("returns null when missing or malformed", () => {
    expect(readFlash("/no-flash")).toBeNull();
    expect(readFlash("/?flash=not-json")).toBeNull();
    expect(readFlash(`/?flash=${encodeURIComponent("{}")}`)).toBeNull();
    expect(
      readFlash(`/?flash=${encodeURIComponent(JSON.stringify({ level: "x" }))}`)
    ).toBeNull();
  });

  it("honours a custom param name", () => {
    const url = appendFlash("/", { message: "Hi" }, { param: "notice" });
    expect(url).toContain("notice=");
    expect(readFlash(url)).toBeNull();
    expect(readFlash(url, { param: "notice" })).toEqual({ message: "Hi" });
  });
});

describe("appendFlash / readFlash — hash storage", () => {
  const opts = { storage: "hash" } as const;

  it("round-trips through the URL hash", () => {
    const url = appendFlash("/dashboard", { message: "Hi" }, opts);
    expect(url).toMatch(/^\/dashboard#flash=/);
    expect(readFlash(url, opts)).toEqual({ message: "Hi" });
  });

  it("does not leak into search params", () => {
    const url = appendFlash("/x?y=1", { message: "Hi" }, opts);
    expect(url).toContain("?y=1");
    expect(url).toContain("#flash=");
    expect(readFlash(url)).toBeNull();
  });
});

describe("stripFlash", () => {
  it("removes the flash from search params", () => {
    const url = appendFlash("/x?keep=1", { message: "Hi" });
    expect(stripFlash(url)).toBe("/x?keep=1");
  });

  it("removes the flash from hash and clears empty hashes", () => {
    const url = appendFlash("/x", { message: "Hi" }, { storage: "hash" });
    expect(stripFlash(url, { storage: "hash" })).toBe("/x");
  });

  it("is idempotent", () => {
    const url = "/dashboard?ref=email";
    expect(stripFlash(url)).toBe(url);
    expect(stripFlash(stripFlash(url))).toBe(url);
  });
});

describe("consumeFlash", () => {
  const originalHref = "https://example.com/dashboard";

  beforeEach(() => {
    const initialUrl = appendFlash(originalHref, {
      message: "Welcome",
      level: "success",
    });
    vi.stubGlobal("window", { location: { href: initialUrl } });
    vi.stubGlobal("history", {
      state: { foo: "bar" },
      replaceState: vi.fn((state, _title, url) => {
        (
          globalThis as { window: { location: { href: string } } }
        ).window.location.href = url;
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads, strips, and preserves history state", () => {
    const flash = consumeFlash();
    expect(flash).toEqual({ message: "Welcome", level: "success" });
    expect(window.location.href).toBe(originalHref);
    const replaceState = history.replaceState as ReturnType<typeof vi.fn>;
    expect(replaceState).toHaveBeenCalledWith({ foo: "bar" }, "", originalHref);
  });

  it("returns null when there's no flash to consume", () => {
    (window as { location: { href: string } }).location.href = originalHref;
    expect(consumeFlash()).toBeNull();
    expect(history.replaceState).not.toHaveBeenCalled();
  });
});
