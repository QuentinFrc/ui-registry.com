import { describe, expect, it } from "vitest";
import { defineGuide } from "../src/guide.js";
import { defaultPlacement } from "../src/placement.js";
import { createGuideStep } from "../src/step.js";
import type { PlacementStrategy } from "../src/types.js";
import { createFakeDriver, fakeElement, flush, setup } from "./helpers.js";

const steps = () => {
  const fake = createFakeDriver();
  fake.mount("#a", fakeElement("a"));
  fake.mount("#b", fakeElement("b"));
  const a = createGuideStep({ id: "a", target: "#a" });
  const b = createGuideStep({
    id: "b",
    target: "#b",
    side: "left",
    align: "start",
    sideOffset: 4,
    spotlightPadding: 2,
  });
  return { fake, a, b };
};

describe("manager presentation", () => {
  it("is null for an unknown guide or a run without a current step", async () => {
    const { fake, a } = steps();
    const guide = defineGuide({ id: "tour", steps: [a] });
    const { manager } = await setup({ guides: [guide], fake });
    expect(manager.getPresentation("nope")).toBeNull();
    manager.start("tour");
    expect(manager.getPresentation("tour")).toBeNull();
  });

  it("resolves the current step with the manager defaults", async () => {
    const { fake, a } = steps();
    const guide = defineGuide({ id: "tour", steps: [a] });
    const { manager } = await setup({ guides: [guide], fake });
    manager.start("tour");
    await flush();
    expect(manager.getPresentation("tour")).toEqual({
      side: "bottom",
      align: "center",
      sideOffset: 16,
      spotlightPadding: 8,
      margin: 20,
      placement: defaultPlacement,
    });
  });

  it("applies entry > step > manager", async () => {
    const { fake, a, b } = steps();
    const placement: PlacementStrategy = () => ({
      x: 0,
      y: 0,
      side: "top",
      align: "center",
    });
    const guide = defineGuide({
      id: "tour",
      steps: [a, { step: b, side: "right" }],
    });
    const { manager } = await setup({
      guides: [guide],
      fake,
      placement,
      viewportMargin: 5,
      sideOffset: 30,
      spotlightPadding: 12,
    });
    manager.start("tour");
    await flush();
    expect(manager.getPresentation("tour")).toMatchObject({
      side: "bottom",
      sideOffset: 30,
      spotlightPadding: 12,
      margin: 5,
      placement,
    });
    manager.next("tour");
    await flush();
    expect(manager.getPresentation("tour")).toEqual({
      side: "right",
      align: "start",
      sideOffset: 4,
      spotlightPadding: 2,
      margin: 5,
      placement,
    });
  });
});
