import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineGuide } from "../src/guide.js";
import { memoryAdapter } from "../src/storage.js";
import type {
  ErrorAction,
  GuideEntry,
  OnError,
  OnErrorContext,
} from "../src/types.js";
import {
  createFakeDriver,
  eventsOf,
  flush,
  mountedSteps,
  runOf,
  setup,
} from "./helpers.js";

const HOOK_TIMEOUT = 50;

type Phase =
  | "beforeLeave"
  | "beforeEnter"
  | "afterEnter"
  | "afterLeave"
  | "route"
  | "timeout";

/** A failure that happens `times` times, then succeeds. */
const failing = (times: number, slow = false) => {
  let calls = 0;
  return () => {
    calls++;
    if (calls > times) {
      return;
    }
    if (slow) {
      return new Promise<void>(() => undefined);
    }
    throw new Error(`boom ${calls}`);
  };
};

/**
 * Guide a → b → c; the `a → b` transition fails in `phase` (`times` times).
 * Hooks of `a` for leave phases, of `b` otherwise.
 */
const errorSetup = async (
  phase: Phase,
  onError: OnError,
  { times = Number.POSITIVE_INFINITY, dismissible = true } = {}
) => {
  const fake = createFakeDriver();
  const [a, b, c] = mountedSteps(fake, "a", "b", "c");
  const entryA: GuideEntry = { step: a };
  const entryB: GuideEntry = { step: b };
  if (phase === "beforeLeave" || phase === "afterLeave") {
    entryA[phase] = failing(times);
  } else if (phase === "beforeEnter" || phase === "afterEnter") {
    entryB[phase] = failing(times);
  } else if (phase === "timeout") {
    entryB.beforeEnter = failing(times, true);
  } else {
    entryB.route = "/b";
  }
  const guide = defineGuide({
    id: "tour",
    hookTimeout: HOOK_TIMEOUT,
    dismissible,
    onError,
    steps: [entryA, entryB, c],
  });
  const result = await setup({ guides: [guide], fake });
  if (phase === "route") {
    const route = failing(times);
    result.manager.setRouter({
      pathname: "/a",
      navigate: (path) => {
        route();
        result.manager.notifyPathname(path);
      },
    });
  }
  result.manager.start("tour");
  await flush();
  result.manager.next("tour");
  await vi.advanceTimersByTimeAsync(HOOK_TIMEOUT);
  await flush();
  return result;
};

const PHASES: Phase[] = [
  "beforeLeave",
  "beforeEnter",
  "afterEnter",
  "afterLeave",
  "route",
  "timeout",
];
const POST_COMMIT: Phase[] = ["afterEnter", "afterLeave"];

describe("manager errors", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe.each(PHASES)("phase %s", (phase) => {
    it("end: ends the run with `error` and records lastError", async () => {
      const { manager, events } = await errorSetup(phase, () => "end");
      expect(manager.getState().runs).toEqual([]);
      expect(eventsOf(events, "error")[0]).toMatchObject({
        phase,
        action: "end",
      });
      expect(eventsOf(events, "end")[0]?.reason).toBe("error");
      expect(manager.getState().records.tour).toMatchObject({
        status: "in-progress",
        lastError: { phase },
      });
    });

    it("skip: moves on in the same direction", async () => {
      const { manager } = await errorSetup(phase, () => "skip");
      expect(runOf(manager, "tour")).toMatchObject({
        status: "active",
        step: { id: "c" },
      });
    });

    it("retry: replays the transition once", async () => {
      const { manager, events } = await errorSetup(phase, () => "retry", {
        times: 1,
      });
      expect(runOf(manager, "tour")).toMatchObject({
        status: "active",
        step: { id: "b" },
      });
      expect(eventsOf(events, "error")[0]?.action).toBe("retry");
    });

    it("retry: a second failure ends the run", async () => {
      const onError = vi.fn<OnError>(() => "retry");
      const { manager, events } = await errorSetup(phase, onError, {
        times: 2,
      });
      await vi.advanceTimersByTimeAsync(HOOK_TIMEOUT);
      await flush();
      expect(manager.getState().runs).toEqual([]);
      expect(onError.mock.calls.map(([ctx]) => ctx.attempt)).toEqual([1, 2]);
      expect(eventsOf(events, "error").map((event) => event.action)).toEqual([
        "retry",
        "end",
      ]);
    });

    it("stay: stays on the current step", async () => {
      const { manager } = await errorSetup(phase, () => "stay");
      expect(runOf(manager, "tour")).toMatchObject({
        status: "active",
        step: { id: POST_COMMIT.includes(phase) ? "b" : "a" },
      });
    });

    it("stay: refused when not dismissible", async () => {
      const { manager } = await errorSetup(phase, () => "stay", {
        dismissible: false,
      });
      expect(manager.getState().runs).toEqual([]);
    });
  });

  it("passes the context to onError", async () => {
    const onError = vi.fn<OnError>(() => "end");
    const { manager } = await errorSetup("beforeEnter", onError);
    const ctx = onError.mock.calls[0]?.[0] as OnErrorContext;
    expect(ctx).toMatchObject({
      phase: "beforeEnter",
      step: { id: "b" },
      entry: { step: { id: "b" } },
      direction: "forward",
      attempt: 1,
      manager,
    });
    expect(ctx.error).toBeInstanceOf(Error);
    expect(ctx.guide.id).toBe("tour");
  });

  it("resolves onError guide > manager > default", async () => {
    const fake = createFakeDriver();
    const [a] = mountedSteps(fake, "a");
    const throwing = { step: a, beforeEnter: failing(1) };
    const managerOnError = vi.fn<OnError>(() => "retry");
    const guideOnError = vi.fn<OnError>(() => "retry");
    const { manager } = await setup({
      guides: [
        defineGuide({
          id: "withOwn",
          onError: guideOnError,
          steps: [throwing],
        }),
        defineGuide({
          id: "inherits",
          steps: [{ ...throwing, beforeEnter: failing(1) }],
        }),
      ],
      fake,
      onError: managerOnError,
    });
    manager.start("withOwn");
    await flush();
    manager.start("inherits", { replace: true });
    await flush();
    expect(guideOnError).toHaveBeenCalledTimes(1);
    expect(managerOnError).toHaveBeenCalledTimes(1);

    const defaults = await setup({
      guides: [
        defineGuide({ id: "g", steps: [{ step: a, beforeEnter: failing(1) }] }),
      ],
      fake,
    });
    defaults.manager.start("g");
    await flush();
    expect(eventsOf(defaults.events, "end")[0]?.reason).toBe("error");
  });

  it("supports an async onError and treats unknown actions as end", async () => {
    const { manager } = await errorSetup("beforeEnter", () =>
      Promise.resolve("nope" as ErrorAction)
    );
    expect(manager.getState().runs).toEqual([]);
  });

  it("refuses stay without current step", async () => {
    const fake = createFakeDriver();
    const [a] = mountedSteps(fake, "a");
    const guide = defineGuide({
      id: "tour",
      onError: () => "stay",
      steps: [{ step: a, beforeEnter: failing(1) }],
    });
    const { manager, events } = await setup({ guides: [guide], fake });
    manager.start("tour");
    await flush();
    expect(eventsOf(events, "error")[0]?.action).toBe("end");
    expect(manager.getState().runs).toEqual([]);
  });

  it("skip backward returns to the current step, or ends without one", async () => {
    const fake = createFakeDriver();
    const [a, b] = mountedSteps(fake, "a", "b");
    const guide = defineGuide({
      id: "tour",
      onError: () => "skip",
      steps: [{ step: a, beforeEnter: failing(Number.POSITIVE_INFINITY) }, b],
    });
    const { manager, events } = await setup({ guides: [guide], fake });
    manager.start("tour", { from: "b" });
    await flush();
    manager.prev("tour");
    await flush();
    expect(runOf(manager, "tour")).toMatchObject({
      status: "active",
      step: { id: "b" },
    });
    manager.end("tour");
    await flush();
    manager.start("tour", { from: "b" });
    manager.prev("tour");
    await flush();
    expect(eventsOf(events, "end").at(-1)?.reason).toBe("error");
  });

  it("skip after a commit keeps going backward", async () => {
    const fake = createFakeDriver();
    const [a, b, c] = mountedSteps(fake, "a", "b", "c");
    const guide = defineGuide({
      id: "tour",
      onError: () => "skip",
      steps: [a, { step: b, afterEnter: failing(1) }, c],
    });
    const { manager } = await setup({ guides: [guide], fake });
    manager.start("tour", { from: "c" });
    await flush();
    manager.prev("tour");
    await flush();
    expect(runOf(manager, "tour")).toMatchObject({
      status: "active",
      step: { id: "a" },
    });
  });

  it("skip forward past the last step completes", async () => {
    const fake = createFakeDriver();
    const [a] = mountedSteps(fake, "a");
    const guide = defineGuide({
      id: "tour",
      onError: () => "skip",
      steps: [{ step: a, beforeEnter: failing(1) }],
    });
    const { manager, events } = await setup({ guides: [guide], fake });
    manager.start("tour");
    await flush();
    expect(eventsOf(events, "end")[0]?.reason).toBe("completed");
  });

  it("ends when onError throws, reporting both errors", async () => {
    const failure = new Error("onError failed");
    const { manager, events } = await errorSetup("beforeEnter", () => {
      throw failure;
    });
    expect(manager.getState().runs).toEqual([]);
    const errors = eventsOf(events, "error");
    expect(errors).toHaveLength(2);
    expect(errors[1]).toMatchObject({ error: failure, action: "end" });
    expect(eventsOf(events, "end")[0]?.reason).toBe("error");
  });

  it("ends when onError exceeds the hook timeout, even if not dismissible", async () => {
    const { manager, events } = await errorSetup(
      "beforeEnter",
      () => new Promise<ErrorAction>(() => undefined),
      { dismissible: false }
    );
    await vi.advanceTimersByTimeAsync(HOOK_TIMEOUT);
    expect(manager.getState().runs).toEqual([]);
    expect(eventsOf(events, "error")[1]?.error).toMatchObject({
      name: "GuideTimeoutError",
    });
  });

  it("drops the error when a newer request arrives during onError", async () => {
    const { manager, events } = await errorSetup(
      "beforeEnter",
      ({ manager: current }) => {
        current.goTo("tour", "c");
        return "end";
      }
    );
    expect(runOf(manager, "tour")?.step?.id).toBe("c");
    expect(eventsOf(events, "error")).toEqual([]);
  });

  it("swallows cleanup errors without calling onError", async () => {
    const fake = createFakeDriver();
    const [a] = mountedSteps(fake, "a");
    const onError = vi.fn<OnError>(() => "end");
    const guide = defineGuide({
      id: "tour",
      onError,
      steps: [{ step: a, beforeLeave: failing(1), afterLeave: failing(1) }],
    });
    const { manager, events } = await setup({ guides: [guide], fake });
    const local = vi.fn(() => {
      throw new Error("local");
    });
    manager.registerLifecycle("a", { beforeLeave: local, afterLeave: local });
    manager.start("tour");
    await flush();
    manager.end("tour");
    await flush();
    expect(onError).not.toHaveBeenCalled();
    expect(eventsOf(events, "error").map((event) => event.phase)).toEqual([
      "cleanup",
      "cleanup",
      "cleanup",
      "cleanup",
    ]);
    expect(eventsOf(events, "end")[0]?.reason).toBe("dismissed");
  });

  it("releases everything after an error", async () => {
    const fake = createFakeDriver();
    const [a, b] = mountedSteps(fake, "a", "b");
    const guide = defineGuide({
      id: "tour",
      steps: [a, { step: b, afterEnter: failing(1) }],
    });
    const { manager } = await setup({
      guides: [guide],
      fake,
      scroll: { lock: true },
    });
    manager.start("tour");
    await flush();
    manager.next("tour");
    await flush();
    expect(manager.getState().runs).toEqual([]);
    expect(manager.getLayout("tour")).toBeNull();
    expect(fake.tracked.size).toBe(0);
    expect(fake.watchers.size).toBe(0);
    expect(fake.keysBound).toBe(false);
    expect(fake.calls).toMatchObject({
      lock: 1,
      unlock: 1,
      capture: 1,
      restore: 1,
    });
  });

  it("keeps the previous in-progress step when ending before the first commit", async () => {
    const fake = createFakeDriver();
    const [a, b] = mountedSteps(fake, "a", "b");
    const guide = defineGuide({
      id: "tour",
      steps: [a, { step: b, beforeEnter: failing(Number.POSITIVE_INFINITY) }],
    });
    const fresh = await setup({ guides: [guide], fake });
    fresh.manager.start("tour", { from: "b" });
    await flush();
    expect(fresh.manager.getState().records.tour).toMatchObject({
      status: "in-progress",
      lastError: { phase: "beforeEnter" },
    });
    expect(fresh.manager.getState().records.tour?.stepId).toBeUndefined();

    const resumed = await setup({
      guides: [guide],
      fake,
      storage: memoryAdapter({
        tour: { status: "in-progress", version: 1, stepId: "a", updatedAt: 1 },
      }),
    });
    resumed.manager.start("tour", { from: "b" });
    await flush();
    expect(resumed.manager.getState().records.tour).toMatchObject({
      status: "in-progress",
      stepId: "a",
      lastError: { phase: "beforeEnter" },
    });
  });
});
