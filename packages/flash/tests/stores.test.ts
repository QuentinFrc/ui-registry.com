import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  type CookieAttributes,
  type CookieJar,
  cookie,
  createFlash,
  type Flash,
  sessionStorage,
  type ToastFlash,
} from "../src/index.js";
import { stubBrowser } from "./helpers.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

function fakeJar() {
  const values = new Map<
    string,
    { value: string; attributes: CookieAttributes }
  >();
  const jar: CookieJar = {
    get: (name) => values.get(name),
    set: (name, value, attributes) => {
      values.set(name, { value, attributes });
    },
    delete: (name) => {
      values.delete(name);
    },
  };
  return { jar, values };
}

describe("cookie store", () => {
  it("works with get/set/remove functions and is sync", () => {
    const values = new Map<string, string>();
    const store = cookie({
      name: "notice",
      get: (name) => values.get(name),
      set: (name, value) => {
        values.set(name, value);
      },
      remove: (name) => {
        values.delete(name);
      },
    });
    expect(store.mode).toBe("sync");
    expect(store.maxBytes).toBe(3800);
    const flash = createFlash<ToastFlash>({ store });
    expect(flash.append("/billing?x=1", { message: "Paid" })).toBe(
      "/billing?x=1"
    );
    expect(values.has("notice")).toBe(true);
    expect(flash.consume("/billing")?.payload.message).toBe("Paid");
    expect(values.size).toBe(0);
  });

  it("writes secure httpOnly cookies by default", () => {
    const { jar, values } = fakeJar();
    createFlash<ToastFlash>({ store: cookie({ jar }) }).append("/", {
      message: "Hi",
    });
    expect(values.get("flash")?.attributes).toEqual({
      httpOnly: true,
      maxAge: 60,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  });

  it("is async with a jar factory, like Next's cookies()", async () => {
    const { jar, values } = fakeJar();
    const store = cookie({ jar: async () => jar, secure: false });
    expectTypeOf(store.mode).toEqualTypeOf<"async">();
    const flash = createFlash({ store });
    expectTypeOf(flash.consume).returns.toEqualTypeOf<
      Promise<Flash<unknown> | null>
    >();
    await flash.append("/", { message: "Hi" });
    expect(values.get("flash")?.attributes.secure).toBe(false);
    expect((await flash.consume("/"))?.payload).toEqual({ message: "Hi" });
    expect(values.size).toBe(0);
  });
});

describe("sessionStorage store", () => {
  it("is scoped to the destination page", () => {
    stubBrowser("https://example.com/");
    const flash = createFlash<ToastFlash>({
      store: sessionStorage({ key: "checkout" }),
    });
    flash.append("/checkout", { message: "Paid" });
    expect(window.sessionStorage.getItem("checkout")).not.toBeNull();
    expect(flash.consume("https://example.com/")).toBeNull();
    expect(flash.consume("https://example.com/checkout")?.payload.message).toBe(
      "Paid"
    );
    expect(window.sessionStorage.getItem("checkout")).toBeNull();
  });

  it("throws outside the browser", () => {
    expect(() => createFlash({ store: sessionStorage() }).read("/")).toThrow(
      "browser"
    );
  });
});
