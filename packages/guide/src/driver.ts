/**
 * Internal environment interface of the manager. Type-only module.
 *
 * Every DOM concern goes through a driver injected in the manager, so that the
 * core stays pure logic (testable in `node` with a fake driver):
 * - lot 1 ships a headless driver (no DOM: nothing resolves, nothing moves),
 * - lot 2 plugs the real DOM driver (MutationObserver, ResizeObserver,
 *   IntersectionObserver, `scrollend`, key listeners on `document`).
 *
 * @internal Not part of the public API; may change between lots.
 */
import type { Rect, ScrollOptions } from "./types.js";

export interface KeyIntent {
  /** `KeyboardEvent.key`. Only `Escape`, `ArrowLeft` and `ArrowRight` are handled. */
  key: string;
  /** Event target, used to know whether the focus is inside a passive Frame. */
  target: unknown;
}

export interface VisibilityRequest {
  /** Called with `true` when one of the elements becomes visible, `false` when none is. */
  onChange: (visible: boolean) => void;
  /** Elements to observe, re-resolved by the driver whenever anchors change. */
  resolve: () => readonly Element[];
  /** Ratio, default 0.5. */
  threshold: number;
}

export type ResolvedScrollOptions = Required<ScrollOptions>;

export interface GuideDriver {
  /** Remembers the focused element; returns the restore. */
  captureFocus(): () => void;
  /** Whether `node` is `container` or one of its descendants. */
  contains(container: Element, node: unknown): boolean;
  /** Whether the element intersects the viewport (passive steps never scroll). */
  isInViewport(element: Element): boolean;
  /** Listens to key presses; the handler returns `true` when it handled the key. */
  listenKeys(handler: (intent: KeyIntent) => boolean): () => void;
  /** Locks the page scroll; returns the release. */
  lockScroll(): () => void;
  /** Viewport-relative bounding rect. */
  measure(element: Element): Rect;
  /** Hook point of the `visible` trigger (IntersectionObserver in lot 2). */
  observeVisibility(request: VisibilityRequest): () => void;
  /**
   * `querySelectorAll` on the document. May throw on an invalid selector
   * (the core catches it and resolves to "no target").
   */
  query(selector: string): readonly Element[];
  /** Brings the targets into view and resolves when scrolling settled. */
  scrollIntoView(
    elements: readonly Element[],
    options: ResolvedScrollOptions,
    signal: AbortSignal
  ): Promise<void>;
  /** Tracks the targets of an active step (resize, scroll); returns the cleanup. */
  track(elements: readonly Element[], onChange: () => void): () => void;
  /**
   * Notifies when targets may have appeared, changed size or visibility
   * (DOM mutations, scroll, resize). Used while waiting for a step.
   */
  watch(onChange: () => void): () => void;
}
