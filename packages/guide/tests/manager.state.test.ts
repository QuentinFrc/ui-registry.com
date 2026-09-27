import { describe, expect, it, vi } from "vitest";
import { defineGuide } from "../src/guide.js";
import { createGuideManager } from "../src/manager.js";
import { createGuideStep } from "../src/step.js";
import { memoryAdapter } from "../src/storage.js";
import {
  createFakeDriver,
  flush,
  mountedSteps,
  runOf,
  setup,
} from "./helpers.js";

const threeStepGuide = async () => {
  const fake = createFakeDriver();
  const [a, b, c] = mountedSteps(fake, "a", "b", "c");
  const guide = defineGuide({
    id: "tour",
    steps: [a, b, c],
  });
  return { ...(await setup({ guides: [guide], fake })), guide };
};

describe("manager state", () => {
  it("starts empty then hydrated", async () => {
    const { manager } = await threeStepGuide();
    expect(manager.getState()).toEqual({
      runs: [],
      records: { tour: null },
      hydrated: true,
    });
  });

  it("starts a run: transitioning with no step, then active on the first step", async () => {
    const { manager } = await threeStepGuide();
    expect(manager.start("tour")).toBe(true);
    const first = runOf(manager, "tour");
    expect(first).toMatchObject({
      status: "transitioning",
      step: null,
      entry: null,
      index: 0,
      total: 3,
      dismissible: true,
    });
    await flush();
    expect(runOf(manager, "tour")).toMatchObject({
      status: "active",
      step: { id: "a" },
      index: 0,
    });
  });

  it("navigates with next, prev and goTo; next on the last step completes", async () => {
    const { manager } = await threeStepGuide();
    manager.start("tour");
    await flush();
    expect(manager.next("tour")).toBe(true);
    await flush();
    expect(runOf(manager, "tour")).toMatchObject({
      index: 1,
      step: { id: "b" },
    });
    expect(manager.prev("tour")).toBe(true);
    await flush();
    expect(runOf(manager, "tour")?.index).toBe(0);
    expect(manager.prev("tour")).toBe(false);
    expect(manager.goTo("tour", "c")).toBe(true);
    await flush();
    expect(runOf(manager, "tour")).toMatchObject({
      index: 2,
      step: { id: "c" },
    });
    expect(manager.goTo("tour", "unknown")).toBe(false);
    expect(manager.next("tour")).toBe(true);
    await flush();
    expect(manager.getState().runs).toEqual([]);
    expect(manager.getState().records.tour).toMatchObject({
      status: "completed",
    });
  });

  it("keeps the step during a transition and bases navigation on the requested index before the first commit", async () => {
    const fake = createFakeDriver();
    const [a, b, c] = mountedSteps(fake, "a", "b", "c");
    fake.unmount("#a");
    const guide = defineGuide({
      id: "tour",
      steps: [a, b, c],
    });
    const { manager } = await setup({ guides: [guide], fake });
    manager.start("tour");
    await flush();
    expect(runOf(manager, "tour")?.step).toBeNull();
    expect(manager.prev("tour")).toBe(false);
    manager.next("tour");
    await flush();
    expect(runOf(manager, "tour")).toMatchObject({
      status: "active",
      index: 1,
    });
    manager.next("tour");
    expect(runOf(manager, "tour")).toMatchObject({
      status: "transitioning",
      step: { id: "b" },
      index: 1,
    });
  });

  it("prev during the first transition goes back from the requested index", async () => {
    const fake = createFakeDriver();
    const [a, b] = mountedSteps(fake, "a", "b");
    fake.unmount("#b");
    const guide = defineGuide({
      id: "tour",
      steps: [a, b],
    });
    const { manager } = await setup({ guides: [guide], fake });
    manager.start("tour", { from: "b" });
    expect(manager.prev("tour")).toBe(true);
    await flush();
    expect(runOf(manager, "tour")).toMatchObject({
      status: "active",
      index: 0,
    });
  });

  it("ignores unknown guides and missing runs", async () => {
    const { manager } = await threeStepGuide();
    expect(manager.start("nope")).toBe(false);
    expect(manager.next("tour")).toBe(false);
    expect(manager.prev("tour")).toBe(false);
    expect(manager.goTo("tour", "a")).toBe(false);
    expect(manager.end("tour")).toBe(false);
    expect(manager.getLayout("tour")).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('start("nope") refused: unknown guide')
    );
  });

  it("evaluates `when` of entries at start: the total stays stable", async () => {
    const fake = createFakeDriver();
    const [a, b, c] = mountedSteps(fake, "a", "b", "c");
    let showB = false;
    const guide = defineGuide({
      id: "tour",
      steps: [a, { step: b, when: () => showB }, c],
    });
    const { manager } = await setup({ guides: [guide], fake });
    manager.start("tour");
    showB = true;
    await flush();
    expect(runOf(manager, "tour")).toMatchObject({ total: 2 });
    expect(runOf(manager, "tour")?.entries.map((e) => e.step.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("refuses to start without eligible step, or when the guide `when` is false", async () => {
    const fake = createFakeDriver();
    const [a] = mountedSteps(fake, "a");
    const hidden = defineGuide({
      id: "hidden",
      steps: [{ step: a, when: () => false }],
    });
    const ineligible = defineGuide({
      id: "ineligible",
      when: ({ guide, pathname }) => guide.id === "x" && pathname === "",
      steps: [a],
    });
    const { manager } = await setup({ guides: [hidden, ineligible], fake });
    expect(manager.start("hidden")).toBe(false);
    expect(manager.start("ineligible")).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("no eligible step")
    );
  });

  it("starts from a step id, from the start, or refuses an unknown step", async () => {
    const { manager } = await threeStepGuide();
    expect(manager.start("tour", { from: "missing" })).toBe(false);
    expect(manager.start("tour", { from: "b" })).toBe(true);
    await flush();
    expect(runOf(manager, "tour")?.index).toBe(1);
    manager.end("tour");
    await flush();
    expect(manager.start("tour", { from: "start" })).toBe(true);
    await flush();
    expect(runOf(manager, "tour")?.index).toBe(0);
  });

  it("notifies subscribers and returns a stable state between changes", async () => {
    const { manager } = await threeStepGuide();
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);
    expect(manager.getState()).toBe(manager.getState());
    manager.start("tour");
    expect(listener).toHaveBeenCalled();
    unsubscribe();
    listener.mockClear();
    await flush();
    expect(listener).not.toHaveBeenCalled();
  });

  it("exposes the layout of the active step on a separate channel", async () => {
    const { manager, fake } = await threeStepGuide();
    const listener = vi.fn();
    const unsubscribe = manager.subscribeLayout("tour", listener);
    manager.start("tour");
    await flush();
    expect(manager.getLayout("tour")).toEqual({
      rects: [{ x: 10, y: 20, width: 100, height: 40 }],
    });
    expect(listener).toHaveBeenCalledTimes(1);
    const [tracked] = [...fake.tracked];
    const element = tracked?.elements[0] as Element;
    fake.resize(element, { x: 1, y: 2, width: 3, height: 4 });
    expect(manager.getLayout("tour")?.rects).toEqual([
      { x: 1, y: 2, width: 3, height: 4 },
    ]);
    manager.next("tour");
    expect(manager.getLayout("tour")).toBeNull();
    unsubscribe();
    listener.mockClear();
    await flush();
    expect(listener).not.toHaveBeenCalled();
  });

  it("destroy ends the runs, then refuses to start", async () => {
    const { manager, events } = await threeStepGuide();
    manager.start("tour");
    await flush();
    manager.destroy();
    manager.destroy();
    await flush();
    expect(manager.getState().runs).toEqual([]);
    expect(events.at(-1)).toMatchObject({ type: "end", reason: "destroyed" });
    expect(manager.getState().records.tour).toMatchObject({
      status: "in-progress",
      stepId: "a",
    });
    expect(manager.start("tour")).toBe(false);
  });

  it("destroy while a run is ending ends it once", async () => {
    const { manager, events } = await threeStepGuide();
    manager.start("tour");
    await flush();
    manager.end("tour");
    manager.destroy();
    await flush();
    expect(events.filter((event) => event.type === "end")).toEqual([
      { type: "end", guideId: "tour", stepId: "a", reason: "dismissed" },
    ]);
  });

  it("uses the headless driver and localStorage by default", async () => {
    const step = createGuideStep({ id: "a", target: "#a" });
    const manager = createGuideManager({
      guides: [defineGuide({ id: "g", waitTimeout: 5, steps: [step] })],
    });
    await flush();
    expect(manager.getState().hydrated).toBe(true);
    vi.useFakeTimers();
    manager.start("g");
    await vi.advanceTimersByTimeAsync(5);
    expect(manager.getState().runs).toEqual([]);
  });

  it("rejects duplicate guide ids and warns on distinct steps sharing an id", () => {
    const a = createGuideStep({ id: "a" });
    const clone = createGuideStep({ id: "a" });
    const guide = defineGuide({ id: "g", steps: [a] });
    expect(() =>
      createGuideManager({ guides: [guide, guide], storage: memoryAdapter() })
    ).toThrow('duplicate guide id "g"');
    createGuideManager({
      guides: [
        guide,
        defineGuide({ id: "h", steps: [a] }),
        defineGuide({ id: "i", steps: [clone] }),
      ],
      storage: memoryAdapter(),
    });
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Two distinct steps share the id "a"')
    );
  });
});
