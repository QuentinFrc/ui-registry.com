import { largestRect, rectsOverlap } from "./geometry.js";
import type { Align, PlacementStrategy, Rect, Side, Size } from "./types.js";

type PlacementInput = Parameters<PlacementStrategy>[0];

interface Point {
  x: number;
  y: number;
}

/** Requested side first, then the opposite, then the perpendiculars. */
const FALLBACK_ORDER: Record<Side, readonly Side[]> = {
  top: ["top", "bottom", "right", "left"],
  bottom: ["bottom", "top", "right", "left"],
  left: ["left", "right", "bottom", "top"],
  right: ["right", "left", "bottom", "top"],
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/** Start of the floating element on the cross axis. */
const alignOn = (
  start: number,
  length: number,
  size: number,
  align: Align
): number => {
  if (align === "start") {
    return start;
  }
  if (align === "end") {
    return start + length - size;
  }
  return start + (length - size) / 2;
};

/** Keeps the floating element inside the view, `margin` away from its edges. */
const clampToView = (
  point: Point,
  floating: Size,
  view: Rect,
  margin: number
): Point => ({
  x: clamp(
    point.x,
    view.x + margin,
    view.x + view.width - margin - floating.width
  ),
  y: clamp(
    point.y,
    view.y + margin,
    view.y + view.height - margin - floating.height
  ),
});

/** Position on one side of the anchor, clamped to the view. */
const placeOnSide = (
  anchor: Rect,
  side: Side,
  { floating, align, sideOffset, margin, view }: PlacementInput
): Point => {
  const alongX = alignOn(anchor.x, anchor.width, floating.width, align);
  const alongY = alignOn(anchor.y, anchor.height, floating.height, align);
  let point: Point;
  if (side === "top") {
    point = { x: alongX, y: anchor.y - sideOffset - floating.height };
  } else if (side === "bottom") {
    point = { x: alongX, y: anchor.y + anchor.height + sideOffset };
  } else if (side === "left") {
    point = { x: anchor.x - sideOffset - floating.width, y: alongY };
  } else {
    point = { x: anchor.x + anchor.width + sideOffset, y: alongY };
  }
  return clampToView(point, floating, view, margin);
};

/**
 * Default placement strategy (ported from bridge-training):
 *
 * 1. The anchor is the largest target rect. Without target, the floating
 *    element is centered in the view.
 * 2. Without obstacle, the requested side is kept.
 * 3. Otherwise, the first side of "requested → opposite → perpendiculars"
 *    whose position does not overlap any obstacle (the padded spotlights, in
 *    modal) wins. When every side collides, the requested side is kept.
 * 4. Every position is clamped in the view, `margin` away from its edges.
 *
 * Returns the **effective** side (the one actually used), so that arrows and
 * animations (`data-side`) follow the fallback.
 */
export const defaultPlacement: PlacementStrategy = (input) => {
  const { targets, floating, side, align, margin, view, obstacles } = input;
  const anchor = largestRect(targets);
  if (!anchor) {
    const centered = clampToView(
      {
        x: view.x + (view.width - floating.width) / 2,
        y: view.y + (view.height - floating.height) / 2,
      },
      floating,
      view,
      margin
    );
    return { ...centered, side, align };
  }
  if (obstacles.length > 0) {
    for (const candidate of FALLBACK_ORDER[side]) {
      const point = placeOnSide(anchor, candidate, input);
      const box = { ...point, ...floating };
      if (!obstacles.some((obstacle) => rectsOverlap(box, obstacle))) {
        return { ...point, side: candidate, align };
      }
    }
  }
  return { ...placeOnSide(anchor, side, input), side, align };
};
