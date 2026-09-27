import type {
  GuideDriver,
  KeyIntent,
  ResolvedScrollOptions,
  VisibilityRequest,
} from "./driver.js";
import { largestRect } from "./geometry.js";
import type { Rect, Size } from "./types.js";

/** Scroll settle fallback when `scrollend` never fires (unsupported, no scroll). */
export const SCROLL_END_FALLBACK = 500;

const HANDLED_KEYS = new Set(["Escape", "ArrowLeft", "ArrowRight"]);
const EDITABLE =
  "input, textarea, select, [contenteditable]:not([contenteditable='false'])";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const noop = (): void => undefined;

type Listenable = Pick<EventTarget, "addEventListener" | "removeEventListener">;

const listen = (
  target: Listenable,
  type: string,
  handler: (event: Event) => void,
  options: AddEventListenerOptions = {}
): (() => void) => {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
};

/** Coalesces notifications to one call per animation frame. */
const frameScheduler = (callback: () => void) => {
  let frame = 0;
  return {
    schedule: () => {
      if (frame === 0) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          callback();
        });
      }
    },
    cancel: () => {
      cancelAnimationFrame(frame);
      frame = 0;
    },
  };
};

const runAll = (cleanups: readonly (() => void)[]) => () => {
  for (const cleanup of cleanups) {
    cleanup();
  }
};

const toRect = (element: Element): Rect => {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { x: left, y: top, width, height };
};

const viewportSize = (): Size => {
  const root = document.documentElement;
  return {
    width: root.clientWidth || window.innerWidth,
    height: root.clientHeight || window.innerHeight,
  };
};

/** Listens to page scroll (captured: nested scrollers too) and viewport changes. */
const listenViewport = (notify: () => void): (() => void) => {
  const passive = { passive: true } as const;
  const cleanups = [
    listen(document, "scroll", notify, { capture: true, passive: true }),
    listen(window, "resize", notify, passive),
  ];
  const { visualViewport } = window;
  if (visualViewport) {
    cleanups.push(
      listen(visualViewport, "resize", notify, passive),
      listen(visualViewport, "scroll", notify, passive)
    );
  }
  return runAll(cleanups);
};

const observeChildList = (notify: () => void): (() => void) => {
  const observer = new MutationObserver(notify);
  observer.observe(document, { childList: true, subtree: true });
  return () => observer.disconnect();
};

const resolveBehavior = (
  behavior: ResolvedScrollOptions["behavior"]
): ScrollBehavior => {
  if (behavior !== "auto") {
    return behavior;
  }
  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_MOTION).matches;
  return reduced ? "instant" : "smooth";
};

const contains = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

const CLIPPING = new Set(["auto", "scroll", "hidden", "clip"]);

/** Inside the viewport and every clipping (scrolling) ancestor. */
const isFullyVisible = (element: Element, rect: Rect): boolean => {
  if (!contains({ x: 0, y: 0, ...viewportSize() }, rect)) {
    return false;
  }
  for (
    let ancestor = element.parentElement;
    ancestor && ancestor !== document.documentElement;
    ancestor = ancestor.parentElement
  ) {
    const { overflowX, overflowY } = getComputedStyle(ancestor);
    const clips = CLIPPING.has(overflowX) || CLIPPING.has(overflowY);
    if (clips && !contains(toRect(ancestor), rect)) {
      return false;
    }
  }
  return true;
};

/** Resolves on the next `scrollend` (captured on `document`), or after the fallback. */
const waitScrollEnd = (signal: AbortSignal): Promise<void> =>
  new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      stopListening();
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, SCROLL_END_FALLBACK);
    const stopListening = listen(document, "scrollend", done, {
      capture: true,
    });
    signal.addEventListener("abort", done, { once: true });
  });

const scrollIntoView = async (
  elements: readonly Element[],
  options: ResolvedScrollOptions,
  signal: AbortSignal
): Promise<void> => {
  const rects = elements.map(toRect);
  const major = largestRect(rects);
  if (!major || signal.aborted) {
    return;
  }
  const element = elements[rects.indexOf(major)] as Element;
  if (isFullyVisible(element, major)) {
    return;
  }
  const behavior = resolveBehavior(options.behavior);
  const settled = behavior === "smooth" ? waitScrollEnd(signal) : null;
  element.scrollIntoView({ behavior, block: options.block, inline: "nearest" });
  await settled;
};

/** Saves the inline value (and priority) of a property; returns its restore. */
const overrideStyle = (
  style: CSSStyleDeclaration,
  property: string,
  value: string
): (() => void) => {
  const previous = style.getPropertyValue(property);
  const priority = style.getPropertyPriority(property);
  style.setProperty(property, value);
  return () => {
    if (previous) {
      style.setProperty(property, previous, priority);
    } else {
      style.removeProperty(property);
    }
  };
};

const lockScroll = (): (() => void) => {
  const scroller = document.scrollingElement ?? document.documentElement;
  const { style } = scroller as HTMLElement;
  // Restored in reverse order.
  const restoreGutter = overrideStyle(style, "scrollbar-gutter", "stable");
  const restoreOverflow = overrideStyle(style, "overflow", "hidden");
  return () => {
    restoreOverflow();
    restoreGutter();
  };
};

const captureFocus = (): (() => void) => {
  const previous = document.activeElement as HTMLElement | null;
  return () => {
    if (previous?.isConnected && typeof previous.focus === "function") {
      previous.focus({ preventScroll: true });
    }
  };
};

const isEditable = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(EDITABLE) !== null;

const hasModifier = (event: KeyboardEvent): boolean =>
  event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;

const listenKeys = (handler: (intent: KeyIntent) => boolean) =>
  listen(document, "keydown", (event) => {
    const keyboard = event as KeyboardEvent;
    if (
      keyboard.defaultPrevented ||
      keyboard.isComposing ||
      !HANDLED_KEYS.has(keyboard.key)
    ) {
      return;
    }
    // Arrows keep their meaning in fields and with modifiers.
    if (
      keyboard.key !== "Escape" &&
      (hasModifier(keyboard) || isEditable(keyboard.target))
    ) {
      return;
    }
    if (handler({ key: keyboard.key, target: keyboard.target })) {
      keyboard.preventDefault();
    }
  });

const watch = (onChange: () => void): (() => void) => {
  const scheduler = frameScheduler(onChange);
  return runAll([
    observeChildList(scheduler.schedule),
    listenViewport(scheduler.schedule),
    scheduler.cancel,
  ]);
};

const track = (
  elements: readonly Element[],
  onChange: () => void
): (() => void) => {
  const scheduler = frameScheduler(onChange);
  // Child list mutations: layout shifts, removed or re-rendered targets.
  const cleanups = [
    observeChildList(scheduler.schedule),
    listenViewport(scheduler.schedule),
    scheduler.cancel,
  ];
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(scheduler.schedule);
    for (const element of elements) {
      observer.observe(element);
    }
    cleanups.push(() => observer.disconnect());
  }
  return runAll(cleanups);
};

const observeVisibility = ({
  resolve,
  subscribe,
  threshold,
  onChange,
}: VisibilityRequest): (() => void) => {
  if (typeof IntersectionObserver === "undefined") {
    return noop;
  }
  const visible = new Set<Element>();
  let observed = new Set<Element>();
  let reported = false;
  const report = () => {
    const now = visible.size > 0;
    if (now !== reported) {
      reported = now;
      onChange(now);
    }
  };
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          visible.add(entry.target);
        } else {
          visible.delete(entry.target);
        }
      }
      report();
    },
    { threshold }
  );
  const sync = () => {
    const next = new Set(resolve());
    for (const element of observed) {
      if (!next.has(element)) {
        observer.unobserve(element);
        visible.delete(element);
      }
    }
    for (const element of next) {
      if (!observed.has(element)) {
        observer.observe(element);
      }
    }
    observed = next;
    report();
  };
  const cleanups = [
    () => observer.disconnect(),
    observeChildList(sync),
    subscribe(sync),
  ];
  sync();
  return runAll(cleanups);
};

/**
 * Driver backed by the real DOM. Default of the manager when `window` exists.
 *
 * - Waiting: `MutationObserver` (`childList` on `document`), captured scroll
 *   and viewport changes, coalesced per animation frame.
 * - Tracking: `ResizeObserver` on the targets, `MutationObserver`
 *   (`childList`), captured scroll, `resize`, `visualViewport`, coalesced per
 *   animation frame. No attribute observation.
 * - Scroll: `scrollIntoView` of the largest target when it is not fully
 *   visible; `"auto"` respects `prefers-reduced-motion`; a smooth scroll
 *   settles on `scrollend` (captured on `document`) or after 500 ms.
 * - Keys: one `keydown` listener on `document`.
 * - `visible` trigger: `IntersectionObserver`.
 *
 * @internal
 */
export const createDomDriver = (): GuideDriver => ({
  query: (selector) => [...document.querySelectorAll(selector)],
  measure: toRect,
  viewport: viewportSize,
  isInViewport: (element) => {
    const rect = toRect(element);
    const { width, height } = viewportSize();
    return (
      rect.x < width &&
      rect.y < height &&
      rect.x + rect.width > 0 &&
      rect.y + rect.height > 0
    );
  },
  contains: (container, node) =>
    node instanceof Node && container.contains(node),
  watch,
  scrollIntoView,
  lockScroll,
  captureFocus,
  listenKeys,
  track,
  observeVisibility,
});

/** DOM driver in a browser, headless driver elsewhere (server, workers). */
export const hasDom = (): boolean =>
  typeof window !== "undefined" && typeof document !== "undefined";
