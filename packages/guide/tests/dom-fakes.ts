/**
 * Explicit fakes for the DOM APIs jsdom lacks or cannot compute (layout,
 * observers, animation frames, media queries). No global polyfill: each suite
 * installs what it needs, `vi.unstubAllGlobals()` (setup) removes it.
 */
import { type Mock, vi } from "vitest";
import type { Rect } from "../src/types.js";

/** Stubs `getBoundingClientRect` of an element. */
export const setRect = (element: Element, rect: Rect): void => {
  element.getBoundingClientRect = () =>
    ({
      x: rect.x,
      y: rect.y,
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
      right: rect.x + rect.width,
      bottom: rect.y + rect.height,
      toJSON: () => rect,
    }) as DOMRect;
};

/** Appends an element with a rect to `document.body`. */
export const mountElement = (
  rect: Rect,
  attributes: Record<string, string> = {},
  parent: Element = document.body
): HTMLElement => {
  const element = document.createElement("div");
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  setRect(element, rect);
  parent.append(element);
  return element;
};

/** Sets the layout viewport size (`clientWidth` / `clientHeight`). */
export const setViewport = (width: number, height: number): void => {
  const root = document.documentElement;
  Object.defineProperty(root, "clientWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(root, "clientHeight", {
    configurable: true,
    value: height,
  });
};

/** Manual `requestAnimationFrame`: frames run on `flush()`. */
export const installFrames = () => {
  const callbacks = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    id += 1;
    callbacks.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
    callbacks.delete(handle);
  });
  return {
    get pending() {
      return callbacks.size;
    },
    flush() {
      const queued = [...callbacks.values()];
      callbacks.clear();
      for (const callback of queued) {
        callback(0);
      }
    },
  };
};

export class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly callback: ResizeObserverCallback;
  readonly targets = new Set<Element>();
  disconnected = false;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  observe(target: Element) {
    this.targets.add(target);
  }

  unobserve(target: Element) {
    this.targets.delete(target);
  }

  disconnect() {
    this.disconnected = true;
    this.targets.clear();
  }

  /** Reports a size change of the observed targets. */
  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

export class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly callback: IntersectionObserverCallback;
  readonly options: IntersectionObserverInit | undefined;
  readonly targets = new Set<Element>();
  disconnected = false;

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    this.callback = callback;
    this.options = options;
    FakeIntersectionObserver.instances.push(this);
  }

  observe(target: Element) {
    this.targets.add(target);
  }

  unobserve(target: Element) {
    this.targets.delete(target);
  }

  disconnect() {
    this.disconnected = true;
    this.targets.clear();
  }

  /** Reports the intersection ratio of an observed target. */
  emit(target: Element, ratio: number) {
    this.callback(
      [
        {
          target,
          isIntersecting: ratio > 0,
          intersectionRatio: ratio,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver
    );
  }
}

/** Installs the fake observers; returns their instance lists. */
export const installObservers = () => {
  FakeResizeObserver.instances = [];
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  return {
    resize: FakeResizeObserver.instances,
    intersection: FakeIntersectionObserver.instances,
  };
};

/** Stubs `matchMedia` with a fixed `prefers-reduced-motion` answer. */
export const installReducedMotion = (reduced: boolean) => {
  const matchMedia = vi.fn((query: string) => ({
    matches: reduced && query.includes("reduce"),
    media: query,
  }));
  vi.stubGlobal("matchMedia", matchMedia);
  return matchMedia;
};

/** Stubs `scrollIntoView` on an element. */
export const stubScrollIntoView = (element: Element): Mock<() => void> => {
  const scroll = vi.fn<() => void>();
  element.scrollIntoView = scroll;
  return scroll;
};
