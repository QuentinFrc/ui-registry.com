import { describe, expect, it } from "vitest";
import { defineGuide } from "../src/guide.js";
import {
  DEFAULTS,
  defaultOnError,
  resolveEntryOptions,
  resolveGuideHookTimeout,
  resolveManagerDefaults,
  resolveOnError,
} from "../src/options.js";
import { createGuideStep } from "../src/step.js";
import type { OnErrorContext } from "../src/types.js";

const step = createGuideStep({ id: "s" });
const stepWithOffsets = createGuideStep({
  id: "t",
  side: "left",
  align: "start",
  sideOffset: 1,
  spotlightPadding: 2,
});

describe("resolveManagerDefaults", () => {
  it("applies defaults", () => {
    expect(resolveManagerDefaults({})).toEqual({
      dismissible: true,
      onMissing: "skip",
      waitTimeout: 3000,
      hookTimeout: 10_000,
      sideOffset: 16,
      spotlightPadding: 8,
      viewportMargin: 20,
      keyboard: true,
      scroll: { behavior: "auto", block: "center", lock: false },
      onError: undefined,
    });
    expect(DEFAULTS.waitTimeout).toBe(3000);
  });

  it("keeps explicit options", () => {
    const onError = () => "stay" as const;
    expect(
      resolveManagerDefaults({
        dismissible: false,
        onMissing: "end",
        waitTimeout: 1,
        hookTimeout: 2,
        sideOffset: 3,
        spotlightPadding: 4,
        viewportMargin: 5,
        keyboard: false,
        scroll: { behavior: "smooth", block: "start", lock: true },
        onError,
      })
    ).toEqual({
      dismissible: false,
      onMissing: "end",
      waitTimeout: 1,
      hookTimeout: 2,
      sideOffset: 3,
      spotlightPadding: 4,
      viewportMargin: 5,
      keyboard: false,
      scroll: { behavior: "smooth", block: "start", lock: true },
      onError,
    });
  });
});

describe("resolveEntryOptions: entry > guide > manager > default", () => {
  const manager = resolveManagerDefaults({
    dismissible: false,
    onMissing: "end",
    waitTimeout: 100,
    hookTimeout: 200,
  });

  it("falls back to the manager, then the defaults", () => {
    const guide = defineGuide({ id: "g", steps: [step] });
    expect(
      resolveEntryOptions({ step }, guide, resolveManagerDefaults({}))
    ).toEqual({
      dismissible: true,
      onMissing: "skip",
      waitTimeout: 3000,
      hookTimeout: 10_000,
      side: "bottom",
      align: "center",
      sideOffset: 16,
      spotlightPadding: 8,
    });
    expect(resolveEntryOptions({ step }, guide, manager)).toMatchObject({
      dismissible: false,
      onMissing: "end",
      waitTimeout: 100,
      hookTimeout: 200,
    });
  });

  it("prefers the guide over the manager", () => {
    const guide = defineGuide({
      id: "g",
      dismissible: true,
      onMissing: "skip",
      waitTimeout: 10,
      hookTimeout: 20,
      steps: [step],
    });
    expect(resolveEntryOptions({ step }, guide, manager)).toMatchObject({
      dismissible: true,
      onMissing: "skip",
      waitTimeout: 10,
      hookTimeout: 20,
    });
  });

  it("prefers the entry over the guide, and the step over the manager", () => {
    const guide = defineGuide({
      id: "g",
      dismissible: true,
      onMissing: "skip",
      waitTimeout: 10,
      hookTimeout: 20,
      steps: [stepWithOffsets],
    });
    expect(
      resolveEntryOptions(
        {
          step: stepWithOffsets,
          dismissible: false,
          onMissing: "end",
          waitTimeout: 1,
          hookTimeout: 2,
          side: "top",
          align: "end",
        },
        guide,
        manager
      )
    ).toEqual({
      dismissible: false,
      onMissing: "end",
      waitTimeout: 1,
      hookTimeout: 2,
      side: "top",
      align: "end",
      sideOffset: 1,
      spotlightPadding: 2,
    });
    expect(
      resolveEntryOptions({ step: stepWithOffsets }, guide, manager)
    ).toMatchObject({ side: "left", align: "start" });
  });
});

describe("resolveOnError: guide > manager > default", () => {
  it("resolves each level", async () => {
    const managerOnError = () => "skip" as const;
    const guideOnError = () => "stay" as const;
    const bare = defineGuide({ id: "g", steps: [step] });
    const withOnError = defineGuide({
      id: "h",
      onError: guideOnError,
      steps: [step],
    });
    expect(resolveOnError(bare, resolveManagerDefaults({}))).toBe(
      defaultOnError
    );
    expect(
      resolveOnError(bare, resolveManagerDefaults({ onError: managerOnError }))
    ).toBe(managerOnError);
    expect(
      resolveOnError(
        withOnError,
        resolveManagerDefaults({ onError: managerOnError })
      )
    ).toBe(guideOnError);
    expect(await defaultOnError({} as OnErrorContext)).toBe("end");
  });
});

describe("resolveGuideHookTimeout", () => {
  it("resolves guide > manager", () => {
    const manager = resolveManagerDefaults({ hookTimeout: 5 });
    expect(
      resolveGuideHookTimeout(defineGuide({ id: "g", steps: [step] }), manager)
    ).toBe(5);
    expect(
      resolveGuideHookTimeout(
        defineGuide({ id: "g", hookTimeout: 7, steps: [step] }),
        manager
      )
    ).toBe(7);
  });
});
