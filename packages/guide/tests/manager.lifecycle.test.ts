import { describe, expect, it, vi } from "vitest";
import { defineGuide } from "../src/guide.js";
import type { HookContext, StepLifecycle } from "../src/types.js";
import {
  createFakeDriver,
  fakeElement,
  flush,
  mountedSteps,
  runOf,
  setup,
} from "./helpers.js";

const recorder = () => {
  const log: string[] = [];
  const contexts: HookContext[] = [];
  const hooks = (prefix: string): Required<StepLifecycle> => ({
    beforeLeave: (ctx) => {
      log.push(`${prefix}.beforeLeave`);
      contexts.push(ctx);
    },
    beforeEnter: (ctx) => {
      log.push(`${prefix}.beforeEnter`);
      contexts.push(ctx);
    },
    afterLeave: (ctx) => {
      log.push(`${prefix}.afterLeave`);
      contexts.push(ctx);
    },
    afterEnter: (ctx) => {
      log.push(`${prefix}.afterEnter`);
      contexts.push(ctx);
    },
  });
  return { log, contexts, hooks };
};

const lifecycleSetup = async () => {
  const fake = createFakeDriver();
  const [a, b] = mountedSteps(fake, "a", "b");
  const { log, contexts, hooks } = recorder();
  const guide = defineGuide({
    id: "tour",
    steps: [
      { step: a, ...hooks("entry:a") },
      { step: b, ...hooks("entry:b") },
    ],
  });
  const result = await setup({ guides: [guide], fake });
  result.manager.registerLifecycle("a", hooks("local:a"));
  result.manager.registerLifecycle("b", hooks("local:b"));
  return { ...result, log, contexts, guide, a, b };
};

describe("manager lifecycle", () => {
  it("runs the start hooks: entry beforeEnter, local beforeEnter, then afterEnter entry/local", async () => {
    const { manager, log } = await lifecycleSetup();
    manager.start("tour");
    await flush();
    expect(log).toEqual([
      "entry:a.beforeEnter",
      "local:a.beforeEnter",
      "entry:a.afterEnter",
      "local:a.afterEnter",
    ]);
  });

  it("runs the exact order of a forward transition", async () => {
    const { manager, log } = await lifecycleSetup();
    manager.start("tour");
    await flush();
    log.length = 0;
    manager.next("tour");
    await flush();
    expect(log).toEqual([
      "entry:a.beforeLeave",
      "local:a.beforeLeave",
      "entry:b.beforeEnter",
      "local:b.beforeEnter",
      "local:a.afterLeave",
      "entry:a.afterLeave",
      "entry:b.afterEnter",
      "local:b.afterEnter",
    ]);
  });

  it("commits between beforeEnter (local) and afterLeave", async () => {
    const fake = createFakeDriver();
    const [a, b] = mountedSteps(fake, "a", "b");
    const seen: (string | undefined)[] = [];
    const guide = defineGuide({ id: "tour", steps: [a, b] });
    const { manager } = await setup({ guides: [guide], fake });
    const current = () => runOf(manager, "tour")?.step?.id;
    manager.registerLifecycle("b", {
      beforeEnter: () => {
        seen.push(`beforeEnter:${current()}`);
      },
      afterEnter: () => {
        seen.push(`afterEnter:${current()}`);
      },
    });
    manager.start("tour");
    await flush();
    manager.next("tour");
    await flush();
    expect(seen).toEqual(["beforeEnter:a", "afterEnter:b"]);
  });

  it("passes from/to/direction to hooks", async () => {
    const { manager, contexts, a, b, guide } = await lifecycleSetup();
    manager.start("tour");
    await flush();
    expect(contexts[0]).toMatchObject({
      guide,
      from: null,
      to: a,
      direction: "forward",
      pathname: "",
      manager,
    });
    contexts.length = 0;
    manager.next("tour");
    await flush();
    expect(contexts[0]).toMatchObject({ from: a, to: b, direction: "forward" });
    contexts.length = 0;
    manager.prev("tour");
    await flush();
    expect(contexts[0]).toMatchObject({
      from: b,
      to: a,
      direction: "backward",
    });
    contexts.length = 0;
    manager.goTo("tour", "b");
    await flush();
    expect(contexts[0]).toMatchObject({ from: a, to: b, direction: "jump" });
    expect(contexts[0]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("resumes with a jump direction", async () => {
    const { manager, contexts } = await lifecycleSetup();
    manager.start("tour", { from: "b" });
    await flush();
    expect(contexts[0]?.direction).toBe("jump");
  });

  it("calls several local lifecycles in registration order and stops after cleanup", async () => {
    const fake = createFakeDriver();
    const [a] = mountedSteps(fake, "a");
    const guide = defineGuide({ id: "tour", steps: [a] });
    const { manager } = await setup({ guides: [guide], fake });
    const first = vi.fn();
    const second = vi.fn();
    const cleanupFirst = manager.registerLifecycle("a", {
      beforeEnter: first,
    });
    const cleanup = manager.registerLifecycle("a", { beforeEnter: second });
    manager.start("tour");
    await flush();
    expect(first).toHaveBeenCalledBefore(second);
    cleanup();
    cleanup();
    manager.end("tour");
    await flush();
    manager.start("tour");
    await flush();
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(1);
    cleanupFirst();
    manager.end("tour");
    await flush();
    manager.start("tour");
    await flush();
    expect(first).toHaveBeenCalledTimes(2);
  });

  it("waitFor resolves with a step, a selector, or false on timeout", async () => {
    vi.useFakeTimers();
    const fake = createFakeDriver();
    const [a, b] = mountedSteps(fake, "a", "b");
    fake.unmount("#b");
    const results: boolean[] = [];
    const guide = defineGuide({
      id: "tour",
      waitTimeout: 50,
      steps: [
        {
          step: a,
          beforeEnter: async ({ waitFor }) => {
            results.push(await waitFor(a));
            results.push(await waitFor("#late"));
            results.push(await waitFor(b, 10));
          },
        },
      ],
    });
    const { manager } = await setup({ guides: [guide], fake });
    manager.start("tour");
    await flush();
    fake.mount("#late", fakeElement("late"));
    await flush();
    await vi.advanceTimersByTimeAsync(10);
    expect(results).toEqual([true, true, false]);
    expect(runOf(manager, "tour")?.status).toBe("active");
  });
});
