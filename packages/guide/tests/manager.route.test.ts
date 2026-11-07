import { describe, expect, it, vi } from "vitest";
import { defineGuide, onPage } from "../src/guide.js";
import type { GuideManager, GuideRouter, HookContext } from "../src/types.js";
import {
  createFakeDriver,
  eventsOf,
  flush,
  mountedSteps,
  runOf,
  setup,
} from "./helpers.js";

/** A router whose navigation lands asynchronously, like the app router. */
const createRouter = (manager: GuideManager, pathname: string) => {
  const router: GuideRouter & { navigate: ReturnType<typeof vi.fn> } = {
    pathname,
    navigate: vi.fn((path: string) => {
      queueMicrotask(() => manager.setRouter({ ...router, pathname: path }));
    }),
  };
  return router;
};

const routeSetup = (waitTimeout = 100) => {
  const fake = createFakeDriver();
  const [a, b, c] = mountedSteps(fake, "a", "b", "c");
  const guide = defineGuide({
    id: "tour",
    waitTimeout,
    steps: [
      ...onPage("/groups", [a]),
      ...onPage("/deals", [b]),
      ...onPage((path) => path.startsWith("/deals/"), [c]),
    ],
  });
  return setup({ guides: [guide], fake });
};

describe("manager route", () => {
  it("does not navigate when the route already matches", async () => {
    const { manager } = await routeSetup();
    const router = createRouter(manager, "/groups");
    manager.setRouter(router);
    manager.start("tour");
    await flush();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(runOf(manager, "tour")?.status).toBe("active");
  });

  it("navigates, waits for the pathname, and navigates only once", async () => {
    const { manager } = await routeSetup();
    const router = createRouter(manager, "/groups");
    manager.setRouter(router);
    manager.start("tour");
    await flush();
    manager.next("tour");
    await flush();
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith("/deals");
    expect(runOf(manager, "tour")).toMatchObject({
      status: "active",
      step: { id: "b" },
    });
  });

  it("accepts a pathname pushed with notifyPathname", async () => {
    const { manager } = await routeSetup();
    manager.setRouter({ pathname: "/other", navigate: () => undefined });
    manager.start("tour");
    await flush();
    expect(runOf(manager, "tour")?.status).toBe("transitioning");
    manager.notifyPathname("/groups?tab=1");
    await flush();
    expect(runOf(manager, "tour")?.status).toBe("active");
  });

  it("fails with phase route when the pathname never matches", async () => {
    vi.useFakeTimers();
    const { manager, events } = await routeSetup(100);
    manager.setRouter({ pathname: "/other", navigate: () => undefined });
    manager.start("tour");
    await vi.advanceTimersByTimeAsync(100);
    expect(eventsOf(events, "error")[0]).toMatchObject({
      phase: "route",
      stepId: "a",
      action: "end",
    });
    expect(manager.getState().records.tour).toMatchObject({
      status: "in-progress",
      lastError: { phase: "route" },
    });
  });

  it("fails with phase route without router", async () => {
    const { manager, events } = await routeSetup();
    manager.notifyPathname("/elsewhere");
    manager.start("tour");
    await flush();
    expect(eventsOf(events, "error")[0]?.phase).toBe("route");
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("no router configured")
    );
  });

  it("fails with phase route when navigate throws", async () => {
    const { manager, events } = await routeSetup();
    manager.setRouter({
      pathname: "/x",
      navigate: () => {
        throw new Error("blocked");
      },
    });
    manager.start("tour");
    await flush();
    expect(eventsOf(events, "error")[0]).toMatchObject({ phase: "route" });
  });

  it("matches a route function but cannot navigate to it", async () => {
    const { manager, events } = await routeSetup();
    manager.setRouter({ pathname: "/deals/42", navigate: () => undefined });
    manager.start("tour", { from: "c" });
    await flush();
    expect(runOf(manager, "tour")?.step?.id).toBe("c");
    manager.end("tour");
    await flush();
    manager.setRouter({ pathname: "/groups", navigate: () => undefined });
    manager.start("tour", { from: "c" });
    await flush();
    expect(eventsOf(events, "error")[0]).toMatchObject({ phase: "route" });
  });

  it("exposes navigate and pathname to hooks", async () => {
    const fake = createFakeDriver();
    const [a] = mountedSteps(fake, "a");
    const seen: string[] = [];
    let ctx: HookContext | undefined;
    const guide = defineGuide({
      id: "tour",
      steps: [
        {
          step: a,
          beforeEnter: async (hookCtx) => {
            ctx = hookCtx;
            seen.push(hookCtx.pathname);
            await hookCtx.navigate("/settings");
            await hookCtx.navigate("/settings");
          },
        },
      ],
    });
    const { manager } = await setup({ guides: [guide], fake });
    const router = createRouter(manager, "/home");
    manager.setRouter(router);
    manager.start("tour");
    await flush();
    expect(seen).toEqual(["/home"]);
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(runOf(manager, "tour")?.status).toBe("active");
    manager.setRouter(null);
    await expect(ctx?.navigate("/nowhere")).rejects.toThrow("No router");
  });

  it("bounds a navigation whose promise never settles", async () => {
    vi.useFakeTimers();
    const { manager, events } = await routeSetup(100);
    manager.setRouter({
      pathname: "/other",
      navigate: () => new Promise<void>(() => undefined),
    });
    manager.start("tour");
    await vi.advanceTimersByTimeAsync(100);
    expect(eventsOf(events, "error")[0]).toMatchObject({
      phase: "route",
      action: "end",
    });
  });

  it("does not wait for the navigate promise once the pathname matches", async () => {
    const { manager } = await routeSetup();
    manager.setRouter({
      pathname: "/other",
      navigate: (path) => {
        manager.notifyPathname(path);
        return new Promise<void>(() => undefined);
      },
    });
    manager.start("tour");
    await flush();
    expect(runOf(manager, "tour")?.status).toBe("active");
  });

  it("fails with phase route when navigate rejects asynchronously", async () => {
    const { manager, events } = await routeSetup();
    manager.setRouter({
      pathname: "/x",
      navigate: () => Promise.reject(new Error("blocked")),
    });
    manager.start("tour");
    await flush();
    expect(eventsOf(events, "error")[0]).toMatchObject({
      phase: "route",
      error: new Error("blocked"),
    });
  });

  it("reports a navigation timeout inside a hook with the hook's phase", async () => {
    vi.useFakeTimers();
    const fake = createFakeDriver();
    const [a] = mountedSteps(fake, "a");
    const guide = defineGuide({
      id: "tour",
      waitTimeout: 50,
      steps: [
        {
          step: a,
          beforeEnter: ({ navigate }) => navigate("/never"),
        },
      ],
    });
    const { manager, events } = await setup({ guides: [guide], fake });
    manager.setRouter({ pathname: "/", navigate: () => undefined });
    manager.start("tour");
    await vi.advanceTimersByTimeAsync(50);
    expect(eventsOf(events, "error")[0]).toMatchObject({
      phase: "beforeEnter",
    });
  });
});
