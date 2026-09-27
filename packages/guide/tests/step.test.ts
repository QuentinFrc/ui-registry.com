import { describe, expect, it } from "vitest";
import { createGuideStep, resolveStepTarget } from "../src/step.js";
import { fakeElement } from "./helpers.js";

const a = fakeElement("a");
const b = fakeElement("b");

const query = (selector: string): readonly Element[] => {
  if (selector === "::invalid") {
    throw new SyntaxError("invalid selector");
  }
  return selector === ".a" ? [a] : [b];
};

describe("createGuideStep", () => {
  it("applies defaults", () => {
    const step = createGuideStep({ id: "s" });
    expect(step).toEqual({
      id: "s",
      side: "bottom",
      align: "center",
      sideOffset: undefined,
      spotlightPadding: undefined,
      target: null,
    });
  });

  it("keeps explicit options", () => {
    const step = createGuideStep({
      id: "s",
      side: "left",
      align: "end",
      sideOffset: 4,
      spotlightPadding: 2,
      target: ".a",
    });
    expect(step).toMatchObject({
      side: "left",
      align: "end",
      sideOffset: 4,
      spotlightPadding: 2,
      target: ".a",
    });
  });

  it("returns a frozen object, including a target array", () => {
    const selectors = [".a", ".b"];
    const step = createGuideStep({ id: "s", target: selectors });
    expect(Object.isFrozen(step)).toBe(true);
    expect(Object.isFrozen(step.target)).toBe(true);
    selectors.push(".c");
    expect(step.target).toEqual([".a", ".b"]);
  });

  it("normalizes a null target", () => {
    expect(createGuideStep({ id: "s", target: null }).target).toBeNull();
  });

  it("rejects an empty id", () => {
    expect(() => createGuideStep({ id: "" })).toThrow("non-empty");
  });
});

describe("resolveStepTarget", () => {
  it("resolves null to no target", () => {
    expect(resolveStepTarget(null, query)).toEqual([]);
  });

  it("resolves a selector", () => {
    expect(resolveStepTarget(".a", query)).toEqual([a]);
  });

  it("resolves an array of selectors", () => {
    expect(resolveStepTarget([".a", ".b"], query)).toEqual([a, b]);
  });

  it("resolves an invalid selector to no target with a warning", () => {
    expect(resolveStepTarget("::invalid", query)).toEqual([]);
    expect(resolveStepTarget([".a", "::invalid"], query)).toEqual([a]);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Invalid selector"),
      expect.any(SyntaxError)
    );
  });

  it("resolves a function returning an element, an array or nothing", () => {
    expect(resolveStepTarget(() => a, query)).toEqual([a]);
    expect(resolveStepTarget(() => [a, b], query)).toEqual([a, b]);
    expect(resolveStepTarget(() => null, query)).toEqual([]);
    expect(resolveStepTarget(() => undefined, query)).toEqual([]);
  });

  it("resolves a throwing function to no target", () => {
    const target = () => {
      throw new Error("boom");
    };
    expect(resolveStepTarget(target, query)).toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });
});
