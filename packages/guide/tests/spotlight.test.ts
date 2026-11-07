import { describe, expect, it } from "vitest";
import { mergeOverlappingRects } from "../src/geometry.js";
import { spotlightPath } from "../src/spotlight.js";

// Ported from bridge-training (`calculateClipPath`), with `{ x, y }` rects.

const VIEWPORT = { width: 1000, height: 800 };
const OUTER = "M 0,0 L 1000,0 L 1000,800 L 0,800 Z";

const holes = (path: string) => (path.match(/M /g)?.length ?? 0) - 1;

describe("spotlightPath", () => {
  it("is a full veil without rect", () => {
    expect(spotlightPath([], 8, VIEWPORT)).toBe(`path('${OUTER}')`);
  });

  it("drills one evenodd hole per rect, padding applied", () => {
    const path = spotlightPath(
      [{ x: 200, y: 100, width: 50, height: 50 }],
      10,
      VIEWPORT
    );
    expect(path).toBe(
      `path(evenodd, '${OUTER} M 190,90 L 260,90 L 260,160 L 190,160 Z')`
    );
  });

  it("keeps separate rects as separate holes", () => {
    const path = spotlightPath(
      [
        { x: 100, y: 100, width: 50, height: 50 },
        { x: 400, y: 300, width: 80, height: 30 },
      ],
      0,
      VIEWPORT
    );
    expect(path).toContain("M 100,100 L 150,100 L 150,150 L 100,150 Z");
    expect(path).toContain("M 400,300 L 480,300 L 480,330 L 400,330 Z");
    expect(holes(path)).toBe(2);
  });

  it("clamps a hole overflowing the viewport", () => {
    expect(
      spotlightPath([{ x: 950, y: 750, width: 200, height: 200 }], 0, VIEWPORT)
    ).toContain("M 950,750 L 1000,750 L 1000,800 L 950,800 Z");
    expect(
      spotlightPath([{ x: 5, y: 5, width: 20, height: 20 }], 10, VIEWPORT)
    ).toContain("M 0,0 L 35,0 L 35,35 L 0,35 Z");
  });

  it("drops a rect entirely outside of the viewport", () => {
    expect(
      spotlightPath(
        [
          { x: 10, y: 2000, width: 100, height: 40 },
          { x: -300, y: 10, width: 100, height: 40 },
        ],
        8,
        VIEWPORT
      )
    ).toBe(`path('${OUTER}')`);
  });

  it("merges overlapping rects into one hole (union, not XOR)", () => {
    const path = spotlightPath(
      [
        { x: 100, y: 100, width: 100, height: 100 },
        { x: 150, y: 150, width: 100, height: 100 },
      ],
      0,
      VIEWPORT
    );
    expect(path).toContain("M 100,100 L 250,100 L 250,250 L 100,250 Z");
    expect(holes(path)).toBe(1);
  });

  it("merges rects that only overlap once padded", () => {
    const path = spotlightPath(
      [
        { x: 100, y: 100, width: 50, height: 50 },
        { x: 160, y: 100, width: 50, height: 50 },
      ],
      8,
      VIEWPORT
    );
    expect(path).toContain("M 92,92 L 218,92 L 218,158 L 92,158 Z");
    expect(holes(path)).toBe(1);
  });

  it("merges a chain of overlapping rects", () => {
    const path = spotlightPath(
      [
        { x: 100, y: 100, width: 100, height: 100 },
        { x: 180, y: 100, width: 100, height: 100 },
        { x: 260, y: 100, width: 100, height: 100 },
      ],
      0,
      VIEWPORT
    );
    expect(path).toContain("M 100,100 L 360,100 L 360,200 L 100,200 Z");
    expect(holes(path)).toBe(1);
  });

  it("merges a chain revealed only by an earlier merge", () => {
    // a and c do not overlap; b overlaps both, but comes last.
    const merged = mergeOverlappingRects([
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: 0, width: 10, height: 10 },
      { x: 5, y: 0, width: 20, height: 10 },
      { x: 100, y: 100, width: 10, height: 10 },
    ]);
    expect(merged).toEqual([
      { x: 0, y: 0, width: 30, height: 10 },
      { x: 100, y: 100, width: 10, height: 10 },
    ]);
  });

  it("keeps touching rects as two holes", () => {
    const path = spotlightPath(
      [
        { x: 100, y: 100, width: 50, height: 50 },
        { x: 150, y: 100, width: 50, height: 50 },
      ],
      0,
      VIEWPORT
    );
    expect(holes(path)).toBe(2);
  });
});
