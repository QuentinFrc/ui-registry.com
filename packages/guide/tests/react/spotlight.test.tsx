// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { defineGuide } from "../../src/guide.js";
import { useGuideSpotlight } from "../../src/react/index.js";
import { spotlightPath } from "../../src/spotlight.js";
import { createGuideStep } from "../../src/step.js";
import {
  createManager,
  frames,
  observers,
  RECT,
  rectAttr,
  settle,
  tour,
  wrapper,
} from "./helpers.js";

const VIEWPORT = { width: 1000, height: 800 };

const mountTarget = (id: string) => {
  const element = document.createElement("div");
  element.id = id;
  element.setAttribute("data-rect", rectAttr(RECT));
  document.body.append(element);
  return element;
};

describe("useGuideSpotlight", () => {
  it("is inactive without a modal run", async () => {
    mountTarget("a");
    const step = createGuideStep({ id: "a", target: "#a" });
    const { manager } = await createManager({
      guides: [defineGuide({ id: "hint", mode: "passive", steps: [step] })],
    });
    const { result } = renderHook(() => useGuideSpotlight(), {
      wrapper: wrapper(manager),
    });
    expect(result.current).toEqual({
      active: false,
      clipPath: "none",
      rects: [],
      run: null,
    });
    act(() => {
      manager.start("hint");
    });
    await settle();
    expect(result.current.active).toBe(false);
  });

  it("follows the modal run: full veil while transitioning, holes once active", async () => {
    const target = mountTarget("a");
    mountTarget("b");
    const a = createGuideStep({ id: "a", target: "#a", spotlightPadding: 4 });
    const b = createGuideStep({ id: "b", target: "#b" });
    const { manager } = await createManager({ guides: [tour([a, b])] });
    const { result } = renderHook(() => useGuideSpotlight(), {
      wrapper: wrapper(manager),
    });
    act(() => {
      manager.start("tour");
    });
    expect(result.current).toMatchObject({
      active: true,
      clipPath: "none",
      rects: [],
      run: { status: "transitioning" },
    });
    await settle();
    expect(result.current).toMatchObject({
      active: true,
      clipPath: spotlightPath([RECT], 4, VIEWPORT),
      rects: [RECT],
      run: { status: "active" },
    });

    const moved = { ...RECT, y: 300 };
    target.setAttribute("data-rect", rectAttr(moved));
    act(() => {
      for (const observer of observers.resize) {
        observer.trigger();
      }
    });
    act(() => {
      // Coalesced per animation frame.
      frames.flush();
    });
    expect(result.current.rects).toEqual([moved]);

    act(() => {
      manager.next("tour");
    });
    await settle();
    expect(result.current.clipPath).toBe(spotlightPath([RECT], 8, VIEWPORT));

    act(() => {
      manager.end("tour");
    });
    await settle();
    expect(result.current.active).toBe(false);
  });
});
