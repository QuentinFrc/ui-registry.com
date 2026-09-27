import { describe, expect, it } from "vitest";
import { defaultPlacement } from "../src/placement.js";
import type { PlacementStrategy, Rect } from "../src/types.js";

// Ported from bridge-training (`tour-position.test.ts`, `tour-multi.test.ts`),
// with `{ top, left }` → `{ x, y }` and views as rects.

type Input = Parameters<PlacementStrategy>[0];

const VIEW: Rect = { x: 0, y: 0, width: 1000, height: 800 };
const FLOATING = { width: 320, height: 120 };
const MARGIN = 20;
const SIDE_OFFSET = 16;
const ANCHOR: Rect = { x: 400, y: 300, width: 200, height: 100 };

const place = (input: Partial<Input> = {}) =>
  defaultPlacement({
    targets: [ANCHOR],
    floating: FLOATING,
    side: "bottom",
    align: "center",
    sideOffset: SIDE_OFFSET,
    margin: MARGIN,
    view: VIEW,
    obstacles: [],
    ...input,
  });

describe("defaultPlacement: sides", () => {
  it("places above the anchor, centered", () => {
    // 300 - 16 - 120 = 164 ; centered on 400..600 → 500 - 160 = 340.
    expect(place({ side: "top" })).toEqual({
      x: 340,
      y: 164,
      side: "top",
      align: "center",
    });
  });

  it("places below the anchor", () => {
    expect(place({ side: "bottom" })).toMatchObject({ x: 340, y: 416 });
  });

  it("places on the left, vertically centered", () => {
    // 400 - 16 - 320 = 64 ; centered on 300..400 → 350 - 60 = 290.
    expect(place({ side: "left" })).toMatchObject({ x: 64, y: 290 });
  });

  it("places on the right", () => {
    expect(place({ side: "right" })).toMatchObject({ x: 616, y: 290 });
  });
});

describe("defaultPlacement: alignments", () => {
  it("aligns the leading edges with start", () => {
    expect(place({ align: "start" })).toMatchObject({ x: 400 });
    expect(place({ side: "right", align: "start" })).toMatchObject({ y: 300 });
  });

  it("aligns the trailing edges with end", () => {
    // 600 - 320 = 280 ; 400 - 120 = 280.
    expect(place({ align: "end" })).toMatchObject({ x: 280, align: "end" });
    expect(place({ side: "left", align: "end" })).toMatchObject({ y: 280 });
  });

  it("clamps the cross axis when the alignment pushes it out", () => {
    // anchor right = 990, end → 670 ; max = 1000 - 20 - 320 = 660.
    expect(
      place({
        targets: [{ x: 790, y: 300, width: 200, height: 100 }],
        align: "end",
      })
    ).toMatchObject({ x: 660 });
  });
});

describe("defaultPlacement: clamp in the view", () => {
  it("clamps to the top margin", () => {
    expect(
      place({ targets: [{ ...ANCHOR, y: 100 }], side: "top" })
    ).toMatchObject({ y: MARGIN, side: "top" });
  });

  it("clamps to the bottom margin", () => {
    // 750 + 16 = 766 ; max = 800 - 20 - 120 = 660.
    expect(place({ targets: [{ ...ANCHOR, y: 650 }] })).toMatchObject({
      y: 660,
    });
  });

  it("clamps to the left margin", () => {
    expect(
      place({ targets: [{ ...ANCHOR, x: 10 }], side: "left" })
    ).toMatchObject({ x: MARGIN });
  });

  it("clamps to the right margin", () => {
    expect(
      place({ targets: [{ ...ANCHOR, x: 790 }], side: "right" })
    ).toMatchObject({ x: 660 });
  });

  it("overlaps an anchor filling the view rather than leaving it", () => {
    const position = place({
      targets: [{ x: 10, y: 10, width: 980, height: 780 }],
      side: "top",
    });
    expect(position.y).toBe(MARGIN);
    expect(position.y + FLOATING.height).toBeGreaterThan(10);
  });

  it("sticks to the start margins when the floating is larger than the view", () => {
    expect(
      place({ floating: { width: 2000, height: 2000 }, side: "top" })
    ).toMatchObject({ x: MARGIN, y: MARGIN });
  });
});

describe("defaultPlacement: collision container", () => {
  it("clamps to a smaller view", () => {
    // 480 + 16 = 496 ; max = 100 + 400 - 20 - 120 = 360.
    expect(
      place({
        targets: [{ ...ANCHOR, y: 380 }],
        view: { x: 100, y: 100, width: 800, height: 400 },
      })
    ).toMatchObject({ y: 360 });
  });

  it("respects the container's top edge", () => {
    expect(
      place({
        targets: [{ ...ANCHOR, y: 210 }],
        side: "top",
        view: { x: 0, y: 200, width: 1000, height: 600 },
      })
    ).toMatchObject({ y: 220 });
  });
});

describe("defaultPlacement: anchor", () => {
  it("anchors on the largest target", () => {
    const small = { x: 0, y: 0, width: 30, height: 30 };
    const tall = { x: 0, y: 0, width: 10, height: 200 };
    const wide = { x: 100, y: 500, width: 500, height: 50 };
    // Centered under `wide`: 350 - 160 = 190 ; 550 + 16 = 566.
    expect(place({ targets: [small, tall, wide] })).toMatchObject({
      x: 190,
      y: 566,
    });
  });

  it("keeps the first target on an area tie", () => {
    const first = { x: 100, y: 100, width: 10, height: 10 };
    const second = { x: 500, y: 500, width: 10, height: 10 };
    expect(place({ targets: [first, second], align: "start" })).toMatchObject({
      x: 100,
      y: 126,
    });
  });

  it("centers in the view without target, keeping the requested side", () => {
    expect(place({ targets: [], side: "left", align: "end" })).toEqual({
      x: 340,
      y: 340,
      side: "left",
      align: "end",
    });
    expect(
      place({
        targets: [],
        view: { x: 100, y: 50, width: 400, height: 300 },
      })
    ).toMatchObject({ x: 140, y: 140 });
  });
});

describe("defaultPlacement: obstacles and effective side", () => {
  const floating = { width: 200, height: 100 };

  it("keeps the requested side when nothing collides", () => {
    const major = { x: 400, y: 100, width: 200, height: 50 };
    expect(
      place({ targets: [major], floating, obstacles: [major] })
    ).toMatchObject({ y: 166, side: "bottom" });
  });

  it("falls back to the opposite side and reports it", () => {
    const major = { x: 400, y: 300, width: 200, height: 50 };
    const below = { x: 200, y: 350, width: 600, height: 200 };
    expect(
      place({ targets: [major], floating, obstacles: [major, below] })
    ).toEqual({ x: 400, y: 184, side: "top", align: "center" });
  });

  it("falls back to a perpendicular side when both axes collide", () => {
    const major = { x: 400, y: 300, width: 200, height: 100 };
    const above = { x: 0, y: 0, width: 1000, height: 280 };
    const below = { x: 0, y: 420, width: 1000, height: 380 };
    expect(
      place({ targets: [major], floating, obstacles: [major, above, below] })
    ).toMatchObject({ x: 616, side: "right" });
  });

  it("uses the last perpendicular when every other side collides", () => {
    const major = { x: 400, y: 300, width: 200, height: 100 };
    const blockers = [
      { x: 0, y: 0, width: 1000, height: 280 },
      { x: 0, y: 420, width: 1000, height: 380 },
      { x: 610, y: 0, width: 390, height: 800 },
    ];
    expect(
      place({ targets: [major], floating, obstacles: [major, ...blockers] })
    ).toMatchObject({ x: 184, side: "left" });
  });

  it("keeps the requested side (clamped) when every side collides", () => {
    const everywhere = { x: 0, y: 0, width: 1000, height: 800 };
    expect(place({ floating, obstacles: [everywhere], side: "top" })).toEqual({
      x: 400,
      y: 184,
      side: "top",
      align: "center",
    });
  });

  it("does not treat touching edges as a collision", () => {
    // Floating below: 416..516 ; obstacle starts at 516.
    const touching = { x: 0, y: 516, width: 1000, height: 50 };
    expect(place({ floating, obstacles: [touching] })).toMatchObject({
      y: 416,
      side: "bottom",
    });
  });
});
