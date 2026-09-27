import { describe, expect, it, vi } from "vitest";
import { defineGuide } from "../src/guide.js";
import { createFakeDriver, flush, mountedSteps, setup } from "./helpers.js";

describe("manager events", () => {
  it("emits start, step, suspend, resume and end with their payloads", async () => {
    const fake = createFakeDriver();
    const [a, b, h] = mountedSteps(fake, "a", "b", "h");
    const { manager, events } = await setup({
      guides: [
        defineGuide({ id: "tour", steps: [a, b] }),
        defineGuide({ id: "hint", mode: "passive", steps: [h] }),
      ],
      fake,
    });
    manager.start("hint");
    await flush();
    manager.start("tour");
    await flush();
    manager.next("tour");
    await flush();
    manager.prev("tour");
    await flush();
    manager.goTo("tour", "b");
    await flush();
    manager.end("tour", "completed");
    await flush();
    expect(events).toEqual([
      {
        type: "start",
        guideId: "hint",
        stepId: "h",
        resumed: false,
        trigger: "manual",
      },
      {
        type: "step",
        guideId: "hint",
        stepId: "h",
        index: 0,
        from: null,
        direction: "forward",
      },
      {
        type: "start",
        guideId: "tour",
        stepId: "a",
        resumed: false,
        trigger: "manual",
      },
      { type: "suspend", guideId: "hint" },
      {
        type: "step",
        guideId: "tour",
        stepId: "a",
        index: 0,
        from: null,
        direction: "forward",
      },
      {
        type: "step",
        guideId: "tour",
        stepId: "b",
        index: 1,
        from: "a",
        direction: "forward",
      },
      {
        type: "step",
        guideId: "tour",
        stepId: "a",
        index: 0,
        from: "b",
        direction: "backward",
      },
      {
        type: "step",
        guideId: "tour",
        stepId: "b",
        index: 1,
        from: "a",
        direction: "jump",
      },
      { type: "end", guideId: "tour", stepId: "b", reason: "completed" },
      { type: "resume", guideId: "hint" },
    ]);
  });

  it("emits missing and error with their payloads", async () => {
    vi.useFakeTimers();
    const fake = createFakeDriver();
    const [a, b] = mountedSteps(fake, "a", "b");
    fake.unmount("#b");
    const error = new Error("boom");
    const { manager, events } = await setup({
      guides: [
        defineGuide({
          id: "tour",
          waitTimeout: 10,
          steps: [
            {
              step: a,
              afterEnter: () => {
                throw error;
              },
            },
            b,
          ],
        }),
      ],
      fake,
      onError: () => "stay",
    });
    manager.start("tour");
    await flush();
    manager.next("tour");
    await vi.advanceTimersByTimeAsync(10);
    expect(events).toContainEqual({
      type: "error",
      guideId: "tour",
      stepId: "a",
      phase: "afterEnter",
      error,
      action: "stay",
    });
    expect(events).toContainEqual({
      type: "missing",
      guideId: "tour",
      stepId: "b",
      action: "skip",
    });
  });

  it("survives a throwing onEvent", async () => {
    const fake = createFakeDriver();
    const [a] = mountedSteps(fake, "a");
    const { manager } = await setup({
      guides: [defineGuide({ id: "tour", steps: [a] })],
      fake,
      onEvent: () => {
        throw new Error("analytics down");
      },
    });
    manager.start("tour");
    await flush();
    expect(manager.getState().runs[0]?.status).toBe("active");
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("`onEvent` threw."),
      expect.any(Error)
    );
  });

  it("works without onEvent", async () => {
    const fake = createFakeDriver();
    const [a] = mountedSteps(fake, "a");
    const { manager } = await setup({
      guides: [defineGuide({ id: "tour", steps: [a] })],
      fake,
      onEvent: undefined,
    });
    expect(manager.start("tour")).toBe(true);
  });
});
