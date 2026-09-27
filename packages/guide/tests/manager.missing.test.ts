import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineGuide } from "../src/guide.js";
import type { GuideEntry, MissingAction } from "../src/types.js";
import {
  createFakeDriver,
  EMPTY_RECT,
  eventsOf,
  fakeElement,
  flush,
  mountedSteps,
  runOf,
  setup,
} from "./helpers.js";

const WAIT = 100;

const missingSetup = (
  onMissing: MissingAction = "skip",
  unmounted: string[] = []
) => {
  const fake = createFakeDriver();
  const steps = mountedSteps(fake, "a", "b", "c");
  for (const id of unmounted) {
    fake.unmount(`#${id}`);
  }
  const guide = defineGuide({
    id: "tour",
    waitTimeout: WAIT,
    onMissing,
    steps: [...steps],
  });
  return setup({ guides: [guide], fake });
};

describe("manager missing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("waits for a late target", async () => {
    const { manager, fake } = await missingSetup("skip", ["a"]);
    manager.start("tour");
    await vi.advanceTimersByTimeAsync(WAIT / 2);
    expect(runOf(manager, "tour")?.status).toBe("transitioning");
    fake.mount("#a", fakeElement("a"));
    await flush();
    expect(runOf(manager, "tour")).toMatchObject({
      status: "active",
      step: { id: "a" },
    });
  });

  it("ignores zero-size targets", async () => {
    const { manager, fake } = await missingSetup("skip", ["a"]);
    fake.mount("#a", fakeElement("hidden", { rect: EMPTY_RECT }));
    manager.start("tour");
    await flush();
    expect(runOf(manager, "tour")?.status).toBe("transitioning");
  });

  it("skips forward past a missing step", async () => {
    const { manager, events } = await missingSetup("skip", ["b"]);
    manager.start("tour");
    await flush();
    manager.next("tour");
    await vi.advanceTimersByTimeAsync(WAIT);
    expect(runOf(manager, "tour")?.step?.id).toBe("c");
    expect(eventsOf(events, "missing")).toEqual([
      { type: "missing", guideId: "tour", stepId: "b", action: "skip" },
    ]);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Step "b" of guide "tour" has no target after')
    );
  });

  it("completes when skipping forward past the last step", async () => {
    const { manager, events } = await missingSetup("skip", ["c"]);
    manager.start("tour", { from: "b" });
    await flush();
    manager.next("tour");
    await vi.advanceTimersByTimeAsync(WAIT);
    expect(eventsOf(events, "end")[0]?.reason).toBe("completed");
  });

  it("skips backward, and returns to the current step at the start", async () => {
    const { manager } = await missingSetup("skip", ["b"]);
    manager.start("tour", { from: "c" });
    await flush();
    manager.prev("tour");
    await vi.advanceTimersByTimeAsync(WAIT);
    expect(runOf(manager, "tour")?.step?.id).toBe("a");
    manager.end("tour");
    await flush();

    const second = await missingSetup("skip", ["a"]);
    second.manager.start("tour", { from: "b" });
    await flush();
    second.manager.prev("tour");
    await vi.advanceTimersByTimeAsync(WAIT);
    expect(runOf(second.manager, "tour")).toMatchObject({
      status: "active",
      step: { id: "b" },
    });
  });

  it("ends with `missing` when skipping backward without current step", async () => {
    const { manager, events } = await missingSetup("skip", ["a", "b"]);
    manager.start("tour", { from: "b" });
    manager.prev("tour");
    await vi.advanceTimersByTimeAsync(WAIT);
    expect(eventsOf(events, "end")[0]?.reason).toBe("missing");
  });

  it("ends with `missing` when onMissing is end", async () => {
    const { manager, events } = await missingSetup("end", ["b"]);
    manager.start("tour");
    await flush();
    manager.next("tour");
    await vi.advanceTimersByTimeAsync(WAIT);
    expect(eventsOf(events, "missing")[0]?.action).toBe("end");
    expect(eventsOf(events, "end")[0]).toMatchObject({
      reason: "missing",
      stepId: "a",
    });
    expect(manager.getState().records.tour).toMatchObject({
      status: "in-progress",
      stepId: "a",
      lastError: { phase: "missing" },
    });
  });

  it("uses the entry-level onMissing", async () => {
    const fake = createFakeDriver();
    const [a, b] = mountedSteps(fake, "a", "b");
    fake.unmount("#b");
    const entry: GuideEntry = { step: b, onMissing: "end", waitTimeout: 10 };
    const guide = defineGuide({ id: "tour", steps: [a, entry] });
    const { manager, events } = await setup({ guides: [guide], fake });
    manager.start("tour");
    await flush();
    manager.next("tour");
    await vi.advanceTimersByTimeAsync(10);
    expect(eventsOf(events, "end")[0]?.reason).toBe("missing");
  });

  it("prefers registered anchors over the target", async () => {
    const { manager, fake } = await missingSetup("skip", ["a"]);
    const anchor = fakeElement("anchor");
    const second = fakeElement("second");
    const cleanup = manager.registerAnchor("a", anchor);
    const cleanupSecond = manager.registerAnchor("a", second);
    manager.start("tour");
    await flush();
    expect([...fake.tracked][0]?.elements).toEqual([anchor, second]);
    cleanup();
    cleanup();
    expect([...fake.tracked][0]?.elements).toEqual([second]);
    cleanupSecond();
  });

  it("waits for the content when the anchor declares one", async () => {
    const { manager } = await missingSetup();
    const cleanupAnchor = manager.registerAnchor("a", fakeElement("anchor"), {
      content: true,
    });
    manager.start("tour");
    await flush();
    expect(runOf(manager, "tour")?.status).toBe("transitioning");
    const cleanupFirst = manager.registerContent("a", "first");
    const cleanupSecond = manager.registerContent("a", "second");
    await flush();
    expect(runOf(manager, "tour")?.status).toBe("active");
    expect(manager.getContent("a")).toBe("second");
    cleanupSecond();
    cleanupSecond();
    expect(manager.getContent("a")).toBe("first");
    cleanupFirst();
    expect(manager.getContent("a")).toBeUndefined();
    cleanupAnchor();
  });

  it("warns about a missing content", async () => {
    const { manager } = await missingSetup();
    manager.registerAnchor("a", fakeElement("anchor"), { content: true });
    manager.start("tour");
    await vi.advanceTimersByTimeAsync(WAIT);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("has no target or content")
    );
  });

  it("goes back to the wait when the anchor unmounts, then recovers", async () => {
    const { manager, fake } = await missingSetup("skip", ["a"]);
    const cleanup = manager.registerAnchor("a", fakeElement("anchor"));
    manager.start("tour");
    await flush();
    expect(manager.getLayout("tour")).not.toBeNull();
    cleanup();
    expect(runOf(manager, "tour")?.status).toBe("transitioning");
    expect(manager.getLayout("tour")).toBeNull();
    manager.registerAnchor("a", fakeElement("again"));
    await flush();
    expect(runOf(manager, "tour")).toMatchObject({
      status: "active",
      step: { id: "a" },
    });
    expect(fake.calls.scroll).toHaveLength(2);
  });

  it("re-tracks when another anchor registers on the active step", async () => {
    const { manager, fake } = await missingSetup();
    manager.start("tour");
    await flush();
    const extra = fakeElement("extra");
    manager.registerAnchor("a", extra);
    expect([...fake.tracked][0]?.elements).toEqual([extra]);
    manager.registerAnchor("b", fakeElement("other"));
    expect(fake.tracked.size).toBe(1);
  });

  it("skips to the next step when the lost anchor never comes back", async () => {
    const { manager, events } = await missingSetup("skip", ["a"]);
    const cleanup = manager.registerAnchor("a", fakeElement("anchor"));
    manager.start("tour");
    await flush();
    cleanup();
    await vi.advanceTimersByTimeAsync(WAIT);
    expect(eventsOf(events, "missing")[0]?.stepId).toBe("a");
    expect(runOf(manager, "tour")?.step?.id).toBe("b");
  });

  it("loses the step when its target shrinks to zero", async () => {
    const { manager, fake, events } = await missingSetup("end");
    manager.start("tour");
    await flush();
    const [element] = fake.driver.query("#a");
    fake.resize(element as Element, EMPTY_RECT);
    expect(runOf(manager, "tour")?.status).toBe("transitioning");
    await vi.advanceTimersByTimeAsync(WAIT);
    expect(eventsOf(events, "end")[0]?.reason).toBe("missing");
  });

  it("stops a recovery when the run ends", async () => {
    const { manager, fake } = await missingSetup();
    manager.start("tour");
    await flush();
    const [element] = fake.driver.query("#a");
    fake.resize(element as Element, EMPTY_RECT);
    manager.end("tour");
    await vi.advanceTimersByTimeAsync(WAIT);
    expect(manager.getState().runs).toEqual([]);
  });
});
