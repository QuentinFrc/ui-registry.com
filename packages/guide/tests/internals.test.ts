import { describe, expect, it, vi } from "vitest";
import {
  callAsync,
  GuideTimeoutError,
  runBounded,
  waitUntil,
  withAbort,
} from "../src/async.js";
import { isDev, warn } from "../src/dev.js";
import { createHeadlessDriver } from "../src/headless-driver.js";
import { fakeElement } from "./helpers.js";

describe("async helpers", () => {
  it("callAsync turns synchronous throws into rejections", async () => {
    await expect(callAsync(() => 1)).resolves.toBe(1);
    await expect(
      callAsync(() => {
        throw new Error("sync");
      })
    ).rejects.toThrow("sync");
  });

  it("withAbort settles like the promise or rejects on abort", async () => {
    const controller = new AbortController();
    await expect(
      withAbort(Promise.resolve(1), controller.signal)
    ).resolves.toBe(1);
    await expect(
      withAbort(Promise.reject(new Error("no")), controller.signal)
    ).rejects.toThrow("no");
    const pending = withAbort(new Promise(() => undefined), controller.signal);
    controller.abort(new Error("aborted"));
    await expect(pending).rejects.toThrow("aborted");
    await expect(
      withAbort(Promise.resolve(1), controller.signal)
    ).rejects.toThrow("aborted");
  });

  it("runBounded times out with a GuideTimeoutError and aborts the task signal", async () => {
    vi.useFakeTimers();
    let taskSignal: AbortSignal | undefined;
    const pending = runBounded(
      (signal) => {
        taskSignal = signal;
        return new Promise(() => undefined);
      },
      50,
      new AbortController().signal
    );
    const assertion = expect(pending).rejects.toBeInstanceOf(GuideTimeoutError);
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    expect(taskSignal?.aborted).toBe(true);
    expect(new GuideTimeoutError(5)).toMatchObject({
      timeout: 5,
      name: "GuideTimeoutError",
    });
  });

  it("waitUntil resolves on check, on timeout, and rejects on abort", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const notifiers = new Set<() => void>();
    const subscribe = (notify: () => void) => {
      notifiers.add(notify);
      return () => notifiers.delete(notify);
    };
    let ready = false;
    const notify = () => {
      for (const fn of [...notifiers]) {
        fn();
      }
    };

    await expect(
      waitUntil(() => true, subscribe, 10, controller.signal)
    ).resolves.toBe(true);

    const eventually = waitUntil(
      () => ready,
      subscribe,
      100,
      controller.signal
    );
    notify();
    ready = true;
    notify();
    await expect(eventually).resolves.toBe(true);
    expect(notifiers.size).toBe(0);

    ready = false;
    const late = waitUntil(() => ready, subscribe, 100, controller.signal);
    await vi.advanceTimersByTimeAsync(100);
    await expect(late).resolves.toBe(false);

    const aborted = waitUntil(() => ready, subscribe, 100, controller.signal);
    controller.abort(new Error("stop"));
    await expect(aborted).rejects.toThrow("stop");
    await expect(
      waitUntil(() => true, subscribe, 10, controller.signal)
    ).rejects.toThrow("stop");
  });
});

describe("dev warnings", () => {
  it("warns in development only", () => {
    warn("hello", 1);
    expect(console.warn).toHaveBeenCalledWith("[@ui-registry/guide] hello", 1);
    vi.mocked(console.warn).mockClear();
    vi.stubEnv("NODE_ENV", "production");
    expect(isDev()).toBe(false);
    warn("silent");
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("is silent without process", () => {
    const original = globalThis.process;
    // @ts-expect-error simulate a browser without `process`
    globalThis.process = undefined;
    try {
      expect(isDev()).toBe(false);
    } finally {
      globalThis.process = original;
    }
  });
});

describe("headless driver", () => {
  it("resolves nothing and moves nothing", async () => {
    const driver = createHeadlessDriver();
    const element = fakeElement("a");
    expect(driver.query("#a")).toEqual([]);
    expect(driver.measure(element)).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
    expect(driver.viewport()).toEqual({ width: 0, height: 0 });
    expect(driver.isInViewport(element)).toBe(false);
    expect(driver.contains(element, element)).toBe(true);
    expect(driver.contains(element, null)).toBe(false);
    await expect(
      driver.scrollIntoView([], {} as never, new AbortController().signal)
    ).resolves.toBeUndefined();
    for (const cleanup of [
      driver.watch(() => undefined),
      driver.lockScroll(),
      driver.captureFocus(),
      driver.listenKeys(() => false),
      driver.track([], () => undefined),
      driver.observeVisibility({
        resolve: () => [],
        subscribe: () => () => undefined,
        threshold: 0.5,
        onChange: () => undefined,
      }),
    ]) {
      expect(cleanup()).toBeUndefined();
    }
  });
});

describe("package entry", () => {
  it("exposes the vanilla API", async () => {
    const entry = await import("../src/index.js");
    expect(Object.keys(entry).sort()).toEqual([
      "GuideTimeoutError",
      "createGuideManager",
      "createGuideStep",
      "defaultPlacement",
      "defineGuide",
      "localStorageAdapter",
      "memoryAdapter",
      "onPage",
      "spotlightPath",
    ]);
  });
});
