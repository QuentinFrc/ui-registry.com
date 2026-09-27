// @vitest-environment jsdom
import { act, render, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GuideRoot, useGuide, useGuideRun } from "../../src/react/index.js";
import { createGuideStep } from "../../src/step.js";
import type { GuideRouter, GuideState } from "../../src/types.js";
import {
  createManager,
  RECT,
  rectAttr,
  runOf,
  settle,
  tour,
  wrapper,
} from "./helpers.js";

const mountTarget = (id: string) => {
  const element = document.createElement("div");
  element.id = id;
  element.setAttribute("data-rect", rectAttr(RECT));
  document.body.append(element);
  return element;
};

describe("GuideRoot", () => {
  it("pushes the router and its pathname into the manager", async () => {
    mountTarget("a");
    mountTarget("b");
    const a = createGuideStep({ id: "a", target: "#a" });
    const b = createGuideStep({ id: "b", target: "#b" });
    const { manager } = await createManager({
      guides: [
        tour([
          { step: a, route: "/a" },
          { step: b, route: "/b" },
        ]),
      ],
    });
    const setRouter = vi.spyOn(manager, "setRouter");
    const first = vi.fn<GuideRouter["navigate"]>();
    const second = vi.fn<GuideRouter["navigate"]>();
    const { rerender, unmount } = render(
      <GuideRoot manager={manager} router={{ pathname: "/a", navigate: first }}>
        <span />
      </GuideRoot>
    );
    expect(setRouter).toHaveBeenCalledTimes(1);
    act(() => {
      manager.start("tour");
    });
    await settle();
    expect(runOf(manager, "tour")).toMatchObject({
      status: "active",
      step: { id: "a" },
    });

    // A new adapter object on each render: the latest one navigates, the
    // router is not pushed again.
    rerender(
      <GuideRoot
        manager={manager}
        router={{ pathname: "/a", navigate: second }}
      >
        <span />
      </GuideRoot>
    );
    expect(setRouter).toHaveBeenCalledTimes(1);
    act(() => {
      manager.next("tour");
    });
    await settle();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("/b");
    expect(runOf(manager, "tour")?.status).toBe("transitioning");
    const proxy = setRouter.mock.calls[0]?.[0] as GuideRouter;
    expect(proxy.pathname).toBe("/a");

    rerender(
      <GuideRoot
        manager={manager}
        router={{ pathname: "/b", navigate: second }}
      >
        <span />
      </GuideRoot>
    );
    await settle();
    expect(runOf(manager, "tour")).toMatchObject({
      status: "active",
      step: { id: "b" },
    });
    expect(proxy.pathname).toBe("/b");

    unmount();
    expect(setRouter).toHaveBeenLastCalledWith(null);
  });

  it("does not touch the router without one, and removes it when it goes", async () => {
    const { manager } = await createManager({ guides: [] });
    const setRouter = vi.spyOn(manager, "setRouter");
    const notifyPathname = vi.spyOn(manager, "notifyPathname");
    const { rerender, unmount } = render(<GuideRoot manager={manager} />);
    expect(setRouter).not.toHaveBeenCalled();
    rerender(
      <GuideRoot
        manager={manager}
        router={{ pathname: "/x", navigate: () => undefined }}
      />
    );
    expect(setRouter).toHaveBeenCalledTimes(1);
    expect(notifyPathname).toHaveBeenLastCalledWith("/x");
    rerender(<GuideRoot manager={manager} router={null} />);
    expect(setRouter).toHaveBeenLastCalledWith(null);
    unmount();
    expect(setRouter).toHaveBeenCalledTimes(2);
  });

  it("throws when a hook is used outside of it", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useGuide())).toThrow(
      "useGuide must be used within <GuideRoot>."
    );
  });
});

describe("useGuide", () => {
  it("returns the state and the manager's actions", async () => {
    mountTarget("a");
    const a = createGuideStep({ id: "a", target: "#a" });
    const { manager } = await createManager({ guides: [tour([a])] });
    const { result } = renderHook(() => useGuide(), {
      wrapper: wrapper(manager),
    });
    expect(result.current.state).toBe(manager.getState());
    expect(result.current.state.hydrated).toBe(true);

    let started = false;
    act(() => {
      started = result.current.start("tour");
    });
    expect(started).toBe(true);
    await settle();
    expect(result.current.state.runs[0]).toMatchObject({ status: "active" });

    const spies = {
      next: vi.spyOn(manager, "next"),
      prev: vi.spyOn(manager, "prev"),
      goTo: vi.spyOn(manager, "goTo"),
      end: vi.spyOn(manager, "end"),
      resetRecord: vi.spyOn(manager, "resetRecord"),
    };
    act(() => {
      result.current.prev("tour");
      result.current.goTo("tour", "a");
      result.current.next("tour");
    });
    await settle();
    act(() => {
      result.current.end("tour", "completed");
    });
    await settle();
    act(() => {
      result.current.resetRecord("tour");
    });
    expect(spies.prev).toHaveBeenCalledWith("tour");
    expect(spies.goTo).toHaveBeenCalledWith("tour", "a");
    expect(spies.next).toHaveBeenCalledWith("tour");
    expect(spies.end).toHaveBeenCalledWith("tour", "completed");
    expect(spies.resetRecord).toHaveBeenCalledWith("tour");
    expect(result.current.state.runs).toEqual([]);
  });

  it("selects a slice and re-renders only when it changes", async () => {
    mountTarget("a");
    const a = createGuideStep({ id: "a", target: "#a" });
    const { manager } = await createManager({ guides: [tour([a])] });
    let renders = 0;
    const { result } = renderHook(
      () => {
        renders += 1;
        return useGuide((state: GuideState) => state.runs.length);
      },
      { wrapper: wrapper(manager) }
    );
    expect(result.current.state).toBe(0);
    const before = renders;
    act(() => {
      manager.start("tour");
    });
    await settle();
    expect(result.current.state).toBe(1);
    // transitioning → active re-builds the state, not the selected count.
    expect(renders).toBe(before + 1);
  });

  it("accepts a selector deriving a new object", async () => {
    const { manager } = await createManager({ guides: [] });
    const { result, rerender } = renderHook(
      () => useGuide((state) => ({ hydrated: state.hydrated })),
      { wrapper: wrapper(manager) }
    );
    expect(result.current.state).toEqual({ hydrated: true });
    const first = result.current.state;
    rerender();
    expect(result.current.state).toEqual(first);
  });
});

describe("useGuideRun", () => {
  it("returns the run of a guide, or null", async () => {
    mountTarget("a");
    const a = createGuideStep({ id: "a", target: "#a" });
    const { manager } = await createManager({ guides: [tour([a])] });
    const { result } = renderHook(() => useGuideRun("tour"), {
      wrapper: wrapper(manager),
    });
    expect(result.current).toBeNull();
    act(() => {
      manager.start("tour");
    });
    expect(result.current).toMatchObject({ status: "transitioning" });
    await settle();
    expect(result.current).toMatchObject({
      status: "active",
      step: { id: "a" },
      index: 0,
      total: 1,
    });
    act(() => {
      manager.end("tour");
    });
    await settle();
    expect(result.current).toBeNull();
  });
});
