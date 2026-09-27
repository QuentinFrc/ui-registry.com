import { describe, expect, it, vi } from "vitest";
import { defineGuide } from "../src/guide.js";
import {
  asFake,
  createFakeDriver,
  eventsOf,
  flush,
  mountedSteps,
  runOf,
  setup,
} from "./helpers.js";

const modesSetup = (options: { lock?: boolean } = {}) => {
  const fake = createFakeDriver();
  const [a, b, c, d] = mountedSteps(fake, "a", "b", "c", "d");
  const guides = [
    defineGuide({ id: "tour", steps: [a, b] }),
    defineGuide({ id: "other", steps: [b] }),
    defineGuide({ id: "hint1", mode: "passive", steps: [c] }),
    defineGuide({ id: "hint2", mode: "passive", steps: [d] }),
  ];
  return setup({ guides, fake, scroll: { lock: options.lock } });
};

describe("manager modes", () => {
  it("allows a single modal run at a time", async () => {
    const { manager } = await modesSetup();
    expect(manager.start("tour")).toBe(true);
    expect(manager.start("other")).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('the modal guide "tour" is running')
    );
  });

  it("replaces the modal run with `replace`", async () => {
    const { manager, events } = await modesSetup();
    manager.start("tour");
    await flush();
    expect(manager.start("other", { replace: true })).toBe(true);
    await flush();
    expect(manager.getState().runs.map((run) => run.guide.id)).toEqual([
      "other",
    ]);
    expect(eventsOf(events, "end")).toEqual([
      { type: "end", guideId: "tour", stepId: "a", reason: "replaced" },
    ]);
    expect(manager.getState().records.tour).toMatchObject({
      status: "in-progress",
      stepId: "a",
    });
  });

  it("runs several passive guides together", async () => {
    const { manager } = await modesSetup();
    expect(manager.start("hint1")).toBe(true);
    expect(manager.start("hint2")).toBe(true);
    await flush();
    expect(manager.getState().runs.map((run) => run.status)).toEqual([
      "active",
      "active",
    ]);
  });

  it("suspends passive runs during a modal run and resumes them after", async () => {
    const { manager, events } = await modesSetup();
    manager.start("hint1");
    await flush();
    manager.start("tour");
    expect(runOf(manager, "hint1")?.status).toBe("suspended");
    expect(eventsOf(events, "suspend")).toEqual([
      { type: "suspend", guideId: "hint1" },
    ]);
    manager.start("hint2");
    await flush();
    expect(runOf(manager, "hint2")).toMatchObject({
      status: "suspended",
      step: { id: "d" },
    });
    manager.end("tour");
    await flush();
    expect(runOf(manager, "hint1")?.status).toBe("active");
    expect(runOf(manager, "hint2")?.status).toBe("active");
    expect(eventsOf(events, "resume").map((event) => event.guideId)).toEqual([
      "hint1",
      "hint2",
    ]);
  });

  it("scrolls, takes and restores the focus in modal only", async () => {
    const { manager, fake } = await modesSetup();
    manager.start("hint1");
    await flush();
    expect(fake.calls.scroll).toHaveLength(0);
    expect(fake.calls.capture).toBe(0);
    manager.end("hint1");
    manager.start("tour");
    await flush();
    expect(fake.calls.scroll).toHaveLength(1);
    expect(fake.calls.capture).toBe(1);
    expect(fake.calls.lock).toBe(0);
    manager.end("tour");
    await flush();
    expect(fake.calls.restore).toBe(1);
  });

  it("locks the scroll during a modal run when `scroll.lock`", async () => {
    const { manager, fake } = await modesSetup({ lock: true });
    manager.start("tour");
    await flush();
    expect(fake.calls.lock).toBe(1);
    manager.end("tour", "completed");
    await flush();
    expect(fake.calls.unlock).toBe(1);
  });

  it("ignores scroll failures", async () => {
    const { manager, fake } = await modesSetup();
    fake.setScroll(() => Promise.reject(new Error("no scroll")));
    manager.start("tour");
    await flush();
    expect(runOf(manager, "tour")?.status).toBe("active");
  });

  it("waits for a passive target to be visible in the viewport", async () => {
    vi.useFakeTimers();
    const fake = createFakeDriver();
    const [c] = mountedSteps(fake, "c");
    const guide = defineGuide({ id: "hint", mode: "passive", steps: [c] });
    const { manager } = await setup({ guides: [guide], fake });
    const [element] = fake.driver.query("#c");
    asFake(element as Element).inViewport = false;
    manager.start("hint");
    await flush();
    expect(runOf(manager, "hint")?.status).toBe("transitioning");
    asFake(element as Element).inViewport = true;
    fake.notify();
    await flush();
    expect(runOf(manager, "hint")?.status).toBe("active");
    expect(fake.calls.scroll).toHaveLength(0);
  });
});
