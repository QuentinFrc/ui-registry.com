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
});
