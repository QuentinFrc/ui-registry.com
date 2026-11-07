import { describe, expect, it } from "vitest";
import { defineGuide } from "../src/guide.js";
import {
  createFakeDriver,
  flush,
  mountedSteps,
  runOf,
  setup,
} from "./helpers.js";

const dismissibleSetup = (levels: {
  manager?: boolean;
  guide?: boolean;
  entry?: boolean;
}) => {
  const fake = createFakeDriver();
  const [a, b] = mountedSteps(fake, "a", "b");
  const guide = defineGuide({
    id: "tour",
    dismissible: levels.guide,
    steps: [{ step: a, dismissible: levels.entry }, b],
  });
  return setup({ guides: [guide], fake, dismissible: levels.manager });
};

describe("manager dismissible", () => {
  it("resolves entry > guide > manager > default", async () => {
    const cases: [Parameters<typeof dismissibleSetup>[0], boolean][] = [
      [{}, true],
      [{ manager: false }, false],
      [{ manager: false, guide: true }, true],
      [{ manager: true, guide: true, entry: false }, false],
    ];
    for (const [levels, expected] of cases) {
      const { manager } = await dismissibleSetup(levels);
      manager.start("tour");
      expect(runOf(manager, "tour")?.dismissible).toBe(expected);
    }
  });

  it("is resolved for the current entry", async () => {
    const { manager } = await dismissibleSetup({ entry: false });
    manager.start("tour");
    await flush();
    expect(runOf(manager, "tour")?.dismissible).toBe(false);
    manager.next("tour");
    await flush();
    expect(runOf(manager, "tour")?.dismissible).toBe(true);
  });

  it("refuses end('dismissed') and Escape, allows end('completed')", async () => {
    const { manager, fake } = await dismissibleSetup({ guide: false });
    manager.start("tour");
    await flush();
    expect(manager.end("tour")).toBe(false);
    expect(manager.end("tour", "dismissed")).toBe(false);
    expect(fake.press("Escape")).toBe(false);
    expect(runOf(manager, "tour")).not.toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("refused: not dismissible")
    );
    expect(manager.end("tour", "completed")).toBe(true);
    await flush();
    expect(manager.getState().records.tour).toMatchObject({
      status: "completed",
    });
  });

  it("records the step on dismiss, or none before the first commit", async () => {
    const { manager } = await dismissibleSetup({});
    manager.start("tour");
    await flush();
    manager.end("tour");
    await flush();
    expect(manager.getState().records.tour).toMatchObject({
      status: "dismissed",
      stepId: "a",
    });
    manager.start("tour");
    manager.end("tour");
    await flush();
    expect(manager.getState().records.tour?.status).toBe("dismissed");
    expect(manager.getState().records.tour?.stepId).toBeUndefined();
  });
});
