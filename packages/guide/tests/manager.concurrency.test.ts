import { describe, expect, it, vi } from "vitest";
import { defineGuide } from "../src/guide.js";
import type { HookContext } from "../src/types.js";
import {
  createFakeDriver,
  flush,
  mountedSteps,
  runOf,
  setup,
} from "./helpers.js";

describe("manager concurrency: the latest request wins", () => {
  it("aborts the signal of a pending transition and lands on the latest target", async () => {
    const fake = createFakeDriver();
    const [a, b, c] = mountedSteps(fake, "a", "b", "c");
    let slow: HookContext | undefined;
    let release: (() => void) | undefined;
    const enteredB = vi.fn();
    const guide = defineGuide({
      id: "tour",
      steps: [
        a,
        {
          step: b,
          beforeEnter: (ctx) => {
            slow = ctx;
            return new Promise<void>((resolve) => {
              release = resolve;
            });
          },
          afterEnter: enteredB,
        },
        c,
      ],
    });
    const { manager, events } = await setup({ guides: [guide], fake });
    manager.start("tour");
    await flush();
    manager.next("tour");
    await flush();
    expect(runOf(manager, "tour")?.status).toBe("transitioning");
    manager.goTo("tour", "c");
    expect(slow?.signal.aborted).toBe(true);
    await flush();
    release?.();
    await flush();
    expect(runOf(manager, "tour")).toMatchObject({
      status: "active",
      step: { id: "c" },
    });
    expect(enteredB).not.toHaveBeenCalled();
    expect(
      events.filter((event) => event.type === "step").map((e) => e.stepId)
    ).toEqual(["a", "c"]);
  });

  it("aborts a transition when the run ends", async () => {
    const fake = createFakeDriver();
    const [a] = mountedSteps(fake, "a");
    let signal: AbortSignal | undefined;
    const guide = defineGuide({
      id: "tour",
      steps: [
        {
          step: a,
          beforeEnter: (ctx) => {
            signal = ctx.signal;
            return new Promise<void>(() => undefined);
          },
        },
      ],
    });
    const { manager } = await setup({ guides: [guide], fake });
    manager.start("tour");
    await flush();
    manager.end("tour");
    expect(signal?.aborted).toBe(true);
    await flush();
    expect(manager.getState().runs).toEqual([]);
  });

  it("aborts the signal of a slow hook on timeout", async () => {
    vi.useFakeTimers();
    const fake = createFakeDriver();
    const [a] = mountedSteps(fake, "a");
    let signal: AbortSignal | undefined;
    const guide = defineGuide({
      id: "tour",
      hookTimeout: 100,
      steps: [
        {
          step: a,
          beforeEnter: (ctx) => {
            signal = ctx.signal;
            return new Promise<void>(() => undefined);
          },
        },
      ],
    });
    const { manager, events } = await setup({ guides: [guide], fake });
    manager.start("tour");
    await flush();
    await vi.advanceTimersByTimeAsync(100);
    expect(signal?.aborted).toBe(true);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "error", phase: "timeout" })
    );
  });

  it("a hook requesting another step synchronously cancels its own transition", async () => {
    const fake = createFakeDriver();
    const [a, b, c] = mountedSteps(fake, "a", "b", "c");
    const guide = defineGuide({
      id: "tour",
      steps: [
        a,
        {
          step: b,
          beforeEnter: ({ manager }) => {
            manager.goTo("tour", "c");
          },
        },
        c,
      ],
    });
    const { manager } = await setup({ guides: [guide], fake });
    manager.start("tour");
    await flush();
    manager.next("tour");
    await flush();
    expect(runOf(manager, "tour")?.step?.id).toBe("c");
  });

  it("keeps a single run per guide", async () => {
    const fake = createFakeDriver();
    const [a] = mountedSteps(fake, "a");
    const guide = defineGuide({ id: "tour", steps: [a] });
    const { manager } = await setup({ guides: [guide], fake });
    expect(manager.start("tour")).toBe(true);
    expect(manager.start("tour")).toBe(false);
    expect(manager.getState().runs).toHaveLength(1);
  });
});
