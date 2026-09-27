import { inflateRect, mergeOverlappingRects } from "./geometry.js";
import type { Rect, Size } from "./types.js";

const rectPath = (left: number, top: number, right: number, bottom: number) =>
  `M ${left},${top} L ${right},${top} L ${right},${bottom} L ${left},${bottom} Z`;

const clampToViewport = (rect: Rect, viewport: Size): Rect | null => {
  const left = Math.max(0, rect.x);
  const top = Math.max(0, rect.y);
  const right = Math.min(viewport.width, rect.x + rect.width);
  const bottom = Math.min(viewport.height, rect.y + rect.height);
  if (right <= left || bottom <= top) {
    return null;
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
};

/**
 * CSS `clip-path` of a veil covering the viewport, with one hole per target:
 * `path(evenodd, '<viewport> <holes>')`.
 *
 * - Each rect is grown by `padding`, then clamped to the viewport (a hole
 *   entirely outside of it is dropped).
 * - Overlapping holes are merged into their bounding box, including chains
 *   (`evenodd` would otherwise re-darken their intersection).
 * - No hole → full veil: `path('<viewport>')`.
 */
export const spotlightPath = (
  rects: readonly Rect[],
  padding: number,
  viewport: Size
): string => {
  const outer = rectPath(0, 0, viewport.width, viewport.height);
  const holes = mergeOverlappingRects(
    rects.flatMap((rect) => {
      const clamped = clampToViewport(inflateRect(rect, padding), viewport);
      return clamped ? [clamped] : [];
    })
  );
  if (holes.length === 0) {
    return `path('${outer}')`;
  }
  const drilled = holes
    .map((hole) =>
      rectPath(hole.x, hole.y, hole.x + hole.width, hole.y + hole.height)
    )
    .join(" ");
  return `path(evenodd, '${outer} ${drilled}')`;
};
