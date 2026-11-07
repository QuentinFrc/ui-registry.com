import { describe, expect, it } from "vitest";
import { defineGuide } from "../src/guide.js";
import {
  createFakeDriver,
  fakeElement,
  flush,
  mountedSteps,
  runOf,
  setup,
} from "./helpers.js";

const keyboardSetup = (keyboard?: boolean) => {
  const fake = createFakeDriver();
  const [a, b, h, i] = mountedSteps(fake, "a", "b", "h", "i");
  const guides = [
    defineGuide({ id: "tour", steps: [a, b] }),
    defineGuide({ id: "hint", mode: "passive", steps: [h] }),
    defineGuide({ id: "hint2", mode: "passive", steps: [i] }),
  ];
  return setup({ guides, fake, keyboard });
};

describe("manager keyboard", () => {
  it("is idle without runs", async () => {
    const { fake, manager } = await keyboardSetup();
    expect(fake.keysBound).toBe(false);
    manager.start("tour");
    manager.start("hint");
    expect(fake.keysBound).toBe(true);
    manager.end("tour");
    await flush();
    expect(fake.keysBound).toBe(true);
    manager.end("hint");
    await flush();
    expect(fake.keysBound).toBe(false);
    expect(fake.press("Escape")).toBe(false);
  });

  it("handles Escape and arrows globally in modal", async () => {
    const { fake, manager } = await keyboardSetup();
    manager.start("tour");
    await flush();
    expect(fake.press("ArrowRight")).toBe(true);
    await flush();
    expect(runOf(manager, "tour")?.index).toBe(1);
    expect(fake.press("ArrowLeft")).toBe(true);
    await flush();
    expect(runOf(manager, "tour")?.index).toBe(0);
    expect(fake.press("ArrowLeft")).toBe(false);
    expect(fake.press("Enter")).toBe(false);
    expect(fake.press("Escape")).toBe(true);
    await flush();
    expect(manager.getState().records.tour?.status).toBe("dismissed");
  });

  it("never binds with `keyboard: false`", async () => {
    const { fake, manager } = await keyboardSetup(false);
    manager.start("tour");
    await flush();
    expect(fake.keysBound).toBe(false);
  });

  it("handles only Escape in passive, when the focus is inside the run's Frame", async () => {
    const { fake, manager } = await keyboardSetup();
    manager.start("hint");
    manager.start("hint2");
    await flush();
    const frame = fakeElement("frame");
    const inside = fakeElement("button", { parent: frame as never });
    const outside = fakeElement("elsewhere");
    expect(fake.press("Escape", inside)).toBe(false);
    const cleanup = manager.registerFrame("hint", frame);
    expect(fake.press("ArrowRight", inside)).toBe(false);
    expect(fake.press("Escape", outside)).toBe(false);
    expect(fake.press("Escape", inside)).toBe(true);
    expect(fake.press("Escape", inside)).toBe(false);
    await flush();
    expect(runOf(manager, "hint")).toBeNull();
    expect(fake.press("Escape", inside)).toBe(false);
    cleanup();
    cleanup();
  });

  it("keeps a newer Frame on a stale cleanup", async () => {
    const { fake, manager } = await keyboardSetup();
    manager.start("hint");
    await flush();
    const first = fakeElement("first");
    const second = fakeElement("second");
    const cleanupFirst = manager.registerFrame("hint", first);
    manager.registerFrame("hint", second);
    cleanupFirst();
    expect(fake.press("Escape", second)).toBe(true);
  });

  it("routes keys to the modal run while passive runs are suspended", async () => {
    const { fake, manager } = await keyboardSetup();
    manager.start("hint");
    const frame = fakeElement("frame");
    manager.registerFrame("hint", frame);
    manager.start("tour");
    await flush();
    expect(fake.press("Escape", frame)).toBe(true);
    await flush();
    expect(runOf(manager, "tour")).toBeNull();
    expect(runOf(manager, "hint")).not.toBeNull();
  });
});
