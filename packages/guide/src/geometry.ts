import type { Rect } from "./types.js";

/** Whether two rects share a non-empty area (touching edges do not overlap). */
export const rectsOverlap = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

/** Bounding box of two rects. */
export const unionRect = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
};

/** Largest rect by area; the first one wins a tie. `null` when empty. */
export const largestRect = (rects: readonly Rect[]): Rect | null => {
  let largest: Rect | null = null;
  let largestArea = -1;
  for (const rect of rects) {
    const area = rect.width * rect.height;
    if (area > largestArea) {
      largestArea = area;
      largest = rect;
    }
  }
  return largest;
};

/** Grows a rect by `padding` on every side. */
export const inflateRect = (rect: Rect, padding: number): Rect => ({
  x: rect.x - padding,
  y: rect.y - padding,
  width: rect.width + padding * 2,
  height: rect.height + padding * 2,
});

/**
 * Merges overlapping rects into their bounding box, repeating until no
 * overlap remains: a chain `a ∩ b`, `b ∩ c` ends up as one rect.
 */
export const mergeOverlappingRects = (rects: readonly Rect[]): Rect[] => {
  const merged = [...rects];
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < merged.length && !changed; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        const a = merged[i] as Rect;
        const b = merged[j] as Rect;
        if (rectsOverlap(a, b)) {
          merged.splice(j, 1);
          merged.splice(i, 1, unionRect(a, b));
          changed = true;
          break;
        }
      }
    }
  }
  return merged;
};
