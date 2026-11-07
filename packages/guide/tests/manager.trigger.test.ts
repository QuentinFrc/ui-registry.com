import { describe, expect, it, vi } from "vitest";
import { defineGuide } from "../src/guide.js";
import { memoryAdapter } from "../src/storage.js";
import type { GuideRecord, GuideStorage } from "../src/types.js";
import {
  createFakeDriver,
  eventsOf,
  flush,
  mountedSteps,
  runOf,
  setup,
} from "./helpers.js";

const record = (
  status: GuideRecord["status"],
  extra: Partial<GuideRecord> = {}
): GuideRecord => ({ status, version: 1, updatedAt: 1, ...extra });

const triggerSetup = (
  options: {
    records?: Record<string, GuideRecord>;
    delay?: number;
    when?: () => boolean;
    version?: number;
    storage?: GuideStorage;
  } = {}
) => {
  const fake = createFakeDriver();
  const [a, b, m] = mountedSteps(fake, "a", "b", "m");
  const guides = [
    defineGuide({
      id: "auto",
      version: options.version,
      trigger:
        options.delay === undefined
          ? "visible"
          : { on: "visible", delay: options.delay, threshold: 0.8 },
      when: options.when,
      steps: [a, b],
    }),
    defineGuide({ id: "manual", steps: [m] }),
  ];
  return setup({
    guides,
    fake,
    storage: options.storage ?? memoryAdapter(options.records),
  });
};

describe("manager trigger", () => {
  it("never starts a manual guide by itself", async () => {
    const { fake, manager } = await triggerSetup({
      records: { auto: record("completed") },
    });
    expect(fake.visibility.size).toBe(0);
    expect(manager.getState().runs).toEqual([]);
  });

  it("observes the first step and starts when visible", async () => {
    const { fake, manager, events } = await triggerSetup();
    expect(fake.visibility.size).toBe(1);
    const [request] = [...fake.visibility];
    expect(request?.threshold).toBe(0.5);
    expect(
      request?.resolve().map((el) => (el as never as { name: string }).name)
    ).toEqual(["a"]);
    fake.setVisible(false);
    expect(manager.getState().runs).toEqual([]);
    fake.setVisible(true);
    expect(runOf(manager, "auto")).not.toBeNull();
    expect(eventsOf(events, "start")).toEqual([
      {
        type: "start",
        guideId: "auto",
        stepId: "a",
        resumed: false,
        trigger: "visible",
      },
    ]);
    expect(fake.visibility.size).toBe(0);
  });

  it("waits for `delay` while visible, and cancels when hidden", async () => {
    vi.useFakeTimers();
    const { fake, manager } = await triggerSetup({ delay: 200 });
    expect([...fake.visibility][0]?.threshold).toBe(0.8);
    fake.setVisible(true);
    await vi.advanceTimersByTimeAsync(150);
    fake.setVisible(false);
    await vi.advanceTimersByTimeAsync(100);
    expect(manager.getState().runs).toEqual([]);
    fake.setVisible(true);
    await vi.advanceTimersByTimeAsync(200);
    expect(runOf(manager, "auto")).not.toBeNull();
  });

  it("requires `when` at trigger time", async () => {
    let eligible = false;
    const { fake, manager } = await triggerSetup({ when: () => eligible });
    fake.setVisible(true);
    expect(manager.getState().runs).toEqual([]);
    eligible = true;
    fake.setVisible(true);
    expect(runOf(manager, "auto")).not.toBeNull();
  });

  it("never re-triggers a completed or dismissed guide", async () => {
    for (const status of ["completed", "dismissed"] as const) {
      const { fake } = await triggerSetup({
        records: { auto: record(status) },
      });
      expect(fake.visibility.size).toBe(0);
    }
  });

  it("re-triggers a completed guide of an older version", async () => {
    const { fake } = await triggerSetup({
      version: 2,
      records: { auto: record("completed") },
    });
    expect(fake.visibility.size).toBe(1);
  });

  it("resumes an in-progress guide, observing the record's step", async () => {
    const { fake, manager, events } = await triggerSetup({
      records: { auto: record("in-progress", { stepId: "b" }) },
    });
    const [request] = [...fake.visibility];
    expect(request?.resolve()).toEqual(fake.driver.query("#b"));
    fake.setVisible(true);
    await flush();
    expect(runOf(manager, "auto")).toMatchObject({ index: 1 });
    expect(eventsOf(events, "start")[0]).toMatchObject({ resumed: true });
  });

  it("queues a modal trigger while a modal run is active, then starts it", async () => {
    const { fake, manager } = await triggerSetup();
    manager.start("manual");
    fake.setVisible(true);
    expect(runOf(manager, "auto")).toBeNull();
    expect(fake.visibility.size).toBe(0);
    manager.end("manual");
    await flush();
    expect(runOf(manager, "auto")).not.toBeNull();
  });

  it("drops a queued trigger no longer eligible", async () => {
    let eligible = true;
    const { fake, manager } = await triggerSetup({ when: () => eligible });
    manager.start("manual");
    fake.setVisible(true);
    eligible = false;
    manager.end("manual");
    await flush();
    expect(manager.getState().runs).toEqual([]);
    expect(fake.visibility.size).toBe(1);
  });

  it("removes a queued guide started manually", async () => {
    const { fake, manager } = await triggerSetup();
    manager.start("manual");
    fake.setVisible(true);
    manager.start("auto", { replace: true });
    await flush();
    manager.start("manual", { replace: true });
    await flush();
    manager.end("manual");
    await flush();
    expect(manager.getState().runs).toEqual([]);
  });

  it("does not re-arm after a run, until resetRecord", async () => {
    const { fake, manager } = await triggerSetup();
    fake.setVisible(true);
    await flush();
    manager.end("auto", "completed");
    await flush();
    expect(fake.visibility.size).toBe(0);
    manager.resetRecord("auto");
    expect(fake.visibility.size).toBe(1);
  });

  it("disarms when the record changes elsewhere, and on destroy", async () => {
    let notify: () => void = () => undefined;
    const inner = memoryAdapter();
    const storage: GuideStorage = {
      ...inner,
      subscribe: (fn) => {
        notify = fn;
        return () => undefined;
      },
    };
    const { fake, manager } = await triggerSetup({ storage });
    expect(fake.visibility.size).toBe(1);
    await inner.set("auto", record("dismissed"));
    notify();
    await flush();
    expect(fake.visibility.size).toBe(0);
    await inner.remove("auto");
    notify();
    await flush();
    expect(fake.visibility.size).toBe(1);
    manager.destroy();
    expect(fake.visibility.size).toBe(0);
  });

  it("clears a pending delay on destroy", async () => {
    vi.useFakeTimers();
    const { fake, manager } = await triggerSetup({ delay: 100 });
    fake.setVisible(true);
    manager.destroy();
    await vi.advanceTimersByTimeAsync(100);
    expect(manager.getState().runs).toEqual([]);
  });

  it("observes the first step again after resetRecord of an in-progress guide", async () => {
    const { fake, manager } = await triggerSetup({
      records: { auto: record("in-progress", { stepId: "b" }) },
    });
    expect([...fake.visibility][0]?.resolve()).toEqual(fake.driver.query("#b"));
    manager.resetRecord("auto");
    expect(fake.visibility.size).toBe(1);
    expect([...fake.visibility][0]?.resolve()).toEqual(fake.driver.query("#a"));
  });

  it("notifies the visibility observer when anchors are registered", async () => {
    const { fake, manager } = await triggerSetup();
    const [request] = [...fake.visibility];
    const notify = vi.fn();
    const unsubscribe = request?.subscribe(notify);
    const anchor = fake.driver.query("#b")[0] as Element;
    const cleanup = manager.registerAnchor("a", anchor);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(request?.resolve()).toEqual([anchor]);
    unsubscribe?.();
    cleanup();
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
