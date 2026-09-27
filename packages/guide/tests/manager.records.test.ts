import { describe, expect, it, vi } from "vitest";
import { defineGuide } from "../src/guide.js";
import { memoryAdapter } from "../src/storage.js";
import type { GuideEvent, GuideRecord, GuideStorage } from "../src/types.js";
import {
  createFakeDriver,
  eventsOf,
  flush,
  mountedSteps,
  runOf,
  setup,
} from "./helpers.js";

const inProgress = (stepId: string, version = 1): GuideRecord => ({
  status: "in-progress",
  version,
  stepId,
  updatedAt: 1,
});

const deferred = <T>() => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const recordsSetup = (storage: GuideStorage, version?: number) => {
  const fake = createFakeDriver();
  const [a, b, c] = mountedSteps(fake, "a", "b", "c");
  const guide = defineGuide({ id: "tour", version, steps: [a, b, c] });
  return setup({ guides: [guide], fake, storage });
};

describe("manager records", () => {
  it("hydrates records from the storage", async () => {
    const pending = deferred<GuideRecord | null>();
    const storage: GuideStorage = {
      ...memoryAdapter(),
      get: () => pending.promise,
    };
    const fake = createFakeDriver();
    const [a] = mountedSteps(fake, "a");
    const { createGuideManager } = await import("../src/manager.js");
    const manager = createGuideManager({
      guides: [defineGuide({ id: "tour", steps: [a] })],
      storage,
      driver: fake.driver,
    });
    expect(manager.getState()).toMatchObject({
      hydrated: false,
      records: { tour: null },
    });
    pending.resolve(inProgress("a"));
    await flush();
    expect(manager.getState()).toMatchObject({
      hydrated: true,
      records: { tour: inProgress("a") },
    });
  });

  it("resumes from an in-progress record", async () => {
    const { manager, events } = await recordsSetup(
      memoryAdapter({ tour: inProgress("b") })
    );
    manager.start("tour");
    await flush();
    expect(runOf(manager, "tour")?.index).toBe(1);
    expect(eventsOf(events, "start")[0]).toMatchObject({
      stepId: "b",
      resumed: true,
    });
  });

  it("starts over when the record's step is gone or the record is finished", async () => {
    const gone = await recordsSetup(memoryAdapter({ tour: inProgress("zzz") }));
    gone.manager.start("tour", { from: "resume" });
    expect(runOf(gone.manager, "tour")?.index).toBe(0);
    const done = await recordsSetup(
      memoryAdapter({
        tour: { status: "completed", version: 1, updatedAt: 1 },
      })
    );
    done.manager.start("tour");
    expect(runOf(done.manager, "tour")?.index).toBe(0);
  });

  it("ignores records of an older version without deleting them", async () => {
    const storage = memoryAdapter({ tour: inProgress("b", 1) });
    const { manager } = await recordsSetup(storage, 2);
    expect(manager.getState().records.tour).toBeNull();
    expect(await storage.get("tour")).toEqual(inProgress("b", 1));
    const newer = await recordsSetup(
      memoryAdapter({ tour: inProgress("b", 3) }),
      2
    );
    expect(newer.manager.getState().records.tour).toMatchObject({
      version: 3,
    });
  });

  it("writes optimistically at each commit", async () => {
    vi.useFakeTimers({ now: 1000 });
    const storage = memoryAdapter();
    const { manager } = await recordsSetup(storage);
    manager.start("tour");
    await flush();
    const expected = {
      status: "in-progress",
      version: 1,
      stepId: "a",
      updatedAt: 1000,
    };
    expect(manager.getState().records.tour).toEqual(expected);
    expect(await storage.get("tour")).toEqual(expected);
  });

  it("rolls back a failed write and reports it without interrupting the run", async () => {
    const onError = vi.fn(() => "end" as const);
    const storage: GuideStorage = {
      ...memoryAdapter({ tour: inProgress("c") }),
      set: () => Promise.reject(new Error("quota")),
    };
    const fake = createFakeDriver();
    const [a, b, c] = mountedSteps(fake, "a", "b", "c");
    const { manager, events } = await setup({
      guides: [defineGuide({ id: "tour", onError, steps: [a, b, c] })],
      fake,
      storage,
    });
    manager.start("tour", { from: "a" });
    await flush();
    expect(runOf(manager, "tour")?.status).toBe("active");
    expect(manager.getState().records.tour).toEqual(inProgress("c"));
    expect(eventsOf(events, "error")[0]).toMatchObject({
      phase: "storage",
      stepId: "a",
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it("keeps a newer write when an older one fails", async () => {
    const writes: ReturnType<typeof deferred<void>>[] = [];
    const storage: GuideStorage = {
      ...memoryAdapter(),
      set: () => {
        const write = deferred<void>();
        writes.push(write);
        return write.promise;
      },
    };
    const { manager } = await recordsSetup(storage);
    manager.start("tour");
    await flush();
    manager.next("tour");
    await flush();
    writes[0]?.reject(new Error("late failure"));
    await flush();
    expect(manager.getState().records.tour?.stepId).toBe("b");
  });

  it("resets a record, and rolls back a failed reset", async () => {
    const storage = memoryAdapter({ tour: inProgress("b") });
    const { manager } = await recordsSetup(storage);
    manager.resetRecord("tour");
    manager.resetRecord("unknown");
    expect(manager.getState().records.tour).toBeNull();
    await flush();
    expect(await storage.get("tour")).toBeNull();

    const failing = await recordsSetup({
      ...memoryAdapter({ tour: inProgress("b") }),
      remove: () => {
        throw new Error("denied");
      },
    });
    failing.manager.resetRecord("tour");
    await flush();
    expect(failing.manager.getState().records.tour).toEqual(inProgress("b"));
    expect(eventsOf(failing.events, "error")[0]).toMatchObject({
      phase: "storage",
      stepId: null,
    });
  });

  it("reports hydration failures and keeps a null record", async () => {
    const { manager, events } = await recordsSetup({
      ...memoryAdapter(),
      get: () => Promise.reject(new Error("offline")),
    });
    expect(manager.getState()).toMatchObject({
      hydrated: true,
      records: { tour: null },
    });
    expect(eventsOf(events, "error")[0]).toMatchObject({
      phase: "storage",
      stepId: null,
    });
  });

  it("keeps local writes made during a hydration", async () => {
    const pending = deferred<GuideRecord | null>();
    const storage: GuideStorage = {
      ...memoryAdapter(),
      get: () => pending.promise,
    };
    const fake = createFakeDriver();
    const [a] = mountedSteps(fake, "a");
    const { createGuideManager } = await import("../src/manager.js");
    const manager = createGuideManager({
      guides: [defineGuide({ id: "tour", steps: [a] })],
      storage,
      driver: fake.driver,
    });
    manager.start("tour");
    await flush();
    pending.resolve(null);
    await flush();
    expect(manager.getState().records.tour?.stepId).toBe("a");
  });

  it("re-reads on storage notifications and unsubscribes on destroy", async () => {
    const inner = memoryAdapter();
    let notify: () => void = () => undefined;
    const unsubscribe = vi.fn();
    const { manager } = await recordsSetup({
      ...inner,
      subscribe: (fn) => {
        notify = fn;
        return unsubscribe;
      },
    });
    await inner.set("tour", inProgress("c"));
    notify();
    await flush();
    expect(manager.getState().records.tour).toEqual(inProgress("c"));
    manager.destroy();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("skips the hydration result after destroy", async () => {
    const pending = deferred<GuideRecord | null>();
    const fake = createFakeDriver();
    const [a] = mountedSteps(fake, "a");
    const { createGuideManager } = await import("../src/manager.js");
    const manager = createGuideManager({
      guides: [defineGuide({ id: "tour", steps: [a] })],
      storage: { ...memoryAdapter(), get: () => pending.promise },
      driver: fake.driver,
    });
    manager.destroy();
    pending.resolve(inProgress("a"));
    await flush();
    expect(manager.getState().hydrated).toBe(false);
  });

  it("does not downgrade a finished record when a restart fails before its first step", async () => {
    vi.useFakeTimers();
    for (const status of ["completed", "dismissed"] as const) {
      const fake = createFakeDriver();
      const [a] = mountedSteps(fake, "a");
      fake.unmount("#a");
      const finished: GuideRecord = { status, version: 1, updatedAt: 1 };
      const { manager } = await setup({
        guides: [
          defineGuide({
            id: "tour",
            onMissing: "end",
            waitTimeout: 10,
            steps: [a],
          }),
        ],
        fake,
        storage: memoryAdapter({ tour: finished }),
      });
      manager.start("tour", { from: "start" });
      await vi.advanceTimersByTimeAsync(10);
      expect(manager.getState().runs).toEqual([]);
      expect(manager.getState().records.tour).toEqual(finished);
    }
  });

  it("discards an older hydration finishing after a newer one", async () => {
    const reads: ReturnType<typeof deferred<GuideRecord | null>>[] = [];
    let notify: () => void = () => undefined;
    const storage: GuideStorage = {
      ...memoryAdapter(),
      get: () => {
        const read = deferred<GuideRecord | null>();
        reads.push(read);
        return read.promise;
      },
      subscribe: (fn) => {
        notify = fn;
        return () => undefined;
      },
    };
    const fake = createFakeDriver();
    const [a] = mountedSteps(fake, "a");
    const { createGuideManager } = await import("../src/manager.js");
    const manager = createGuideManager({
      guides: [defineGuide({ id: "tour", steps: [a] })],
      storage,
      driver: fake.driver,
    });
    notify();
    reads[1]?.resolve(inProgress("a"));
    await flush();
    reads[0]?.resolve(null);
    await flush();
    expect(manager.getState()).toMatchObject({
      hydrated: true,
      records: { tour: inProgress("a") },
    });
  });

  describe("start before the hydration", () => {
    const pendingSetup = async () => {
      const pending = deferred<GuideRecord | null>();
      const fake = createFakeDriver();
      const [a, b] = mountedSteps(fake, "a", "b");
      const events: GuideEvent[] = [];
      const { createGuideManager } = await import("../src/manager.js");
      const manager = createGuideManager({
        guides: [defineGuide({ id: "tour", steps: [a, b] })],
        storage: { ...memoryAdapter(), get: () => pending.promise },
        driver: fake.driver,
        onEvent: (event) => events.push(event),
      });
      return { manager, pending, events };
    };

    it("resumes from the hydrated record", async () => {
      const { manager, pending, events } = await pendingSetup();
      expect(manager.start("tour")).toBe(true);
      expect(runOf(manager, "tour")).toMatchObject({
        status: "transitioning",
        step: null,
      });
      await flush();
      expect(eventsOf(events, "start")).toEqual([]);
      pending.resolve(inProgress("b"));
      await flush();
      expect(runOf(manager, "tour")).toMatchObject({
        status: "active",
        step: { id: "b" },
      });
      expect(eventsOf(events, "start")[0]).toMatchObject({
        stepId: "b",
        resumed: true,
      });
    });

    it("does not wait for an explicit `from`", async () => {
      const { manager } = await pendingSetup();
      manager.start("tour", { from: "start" });
      await flush();
      expect(runOf(manager, "tour")?.step?.id).toBe("a");
    });

    it("does not begin a run ended or moved before the hydration, but announces a moved one", async () => {
      const { manager, pending, events } = await pendingSetup();
      manager.start("tour");
      manager.end("tour");
      await flush();
      manager.start("tour");
      manager.next("tour");
      pending.resolve(inProgress("a"));
      await flush();
      expect(eventsOf(events, "start")).toEqual([
        {
          type: "start",
          guideId: "tour",
          stepId: "b",
          resumed: false,
          trigger: "manual",
        },
      ]);
      expect(runOf(manager, "tour")?.step?.id).toBe("b");
    });
  });
  describe("end('dismissed') without a run", () => {
    it("records the guide as dismissed, keeping an in-progress step", async () => {
      const { manager, events } = await recordsSetup(
        memoryAdapter({ tour: inProgress("b") })
      );
      expect(manager.end("tour")).toBe(true);
      expect(manager.getState().records.tour).toMatchObject({
        status: "dismissed",
        version: 1,
        stepId: "b",
      });
      expect(runOf(manager, "tour")).toBeNull();
      expect(eventsOf(events, "end")).toEqual([
        { type: "end", guideId: "tour", stepId: "b", reason: "dismissed" },
      ]);
      manager.start("tour");
      await flush();
      expect(runOf(manager, "tour")?.step?.id).toBe("a");
    });

    it("records no step without an in-progress record", async () => {
      const { manager, events } = await recordsSetup(
        memoryAdapter({
          tour: { status: "completed", version: 1, updatedAt: 1 },
        })
      );
      expect(manager.end("tour", "dismissed")).toBe(true);
      const record = manager.getState().records.tour;
      expect(record?.status).toBe("dismissed");
      expect(record).not.toHaveProperty("stepId");
      expect(eventsOf(events, "end")[0]?.stepId).toBeNull();
    });

    it("is refused when the guide is not dismissible", async () => {
      const fake = createFakeDriver();
      const [a] = mountedSteps(fake, "a");
      const { manager, events } = await setup({
        guides: [
          defineGuide({ id: "locked", dismissible: false, steps: [a] }),
          defineGuide({ id: "managed", steps: [a] }),
        ],
        fake,
        dismissible: false,
      });
      expect(manager.end("locked")).toBe(false);
      expect(manager.end("managed")).toBe(false);
      expect(manager.getState().records).toEqual({
        locked: null,
        managed: null,
      });
      expect(eventsOf(events, "end")).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('end("locked", "dismissed") refused')
      );
    });

    it("resolves `dismissible` guide > manager", async () => {
      const fake = createFakeDriver();
      const [a] = mountedSteps(fake, "a");
      const { manager } = await setup({
        guides: [defineGuide({ id: "open", dismissible: true, steps: [a] })],
        fake,
        dismissible: false,
      });
      expect(manager.end("open")).toBe(true);
      expect(manager.getState().records.open?.status).toBe("dismissed");
    });

    it("is ignored while a run of the guide is still ending", async () => {
      const fake = createFakeDriver();
      const [a] = mountedSteps(fake, "a");
      const cleanup = deferred<void>();
      const { manager, events } = await setup({
        guides: [
          defineGuide({
            id: "tour",
            steps: [{ step: a, beforeLeave: () => cleanup.promise }],
          }),
        ],
        fake,
      });
      manager.start("tour");
      await flush();
      expect(runOf(manager, "tour")?.status).toBe("active");
      expect(manager.end("tour", "completed")).toBe(true);
      // The Finish click is still cleaning up: a late Skip / veil click.
      expect(manager.end("tour", "dismissed")).toBe(false);
      cleanup.resolve();
      await flush();
      expect(manager.getState().records.tour?.status).toBe("completed");
      expect(eventsOf(events, "end")).toEqual([
        { type: "end", guideId: "tour", stepId: "a", reason: "completed" },
      ]);
    });
  });
});
