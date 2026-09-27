// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDomDriver,
  hasDom,
  SCROLL_END_FALLBACK,
} from "../src/dom-driver.js";
import type { KeyIntent, ResolvedScrollOptions } from "../src/driver.js";
import {
  installFrames,
  installObservers,
  installReducedMotion,
  mountElement,
  setRect,
  setViewport,
  stubScrollIntoView,
} from "./dom-fakes.js";
import { flush } from "./helpers.js";

const RECT = { x: 10, y: 20, width: 100, height: 40 };
const BELOW = { x: 10, y: 2000, width: 100, height: 40 };
const SMOOTH: ResolvedScrollOptions = {
  behavior: "smooth",
  block: "center",
  lock: false,
};

const signal = () => new AbortController().signal;

beforeEach(() => {
  setViewport(1000, 800);
});

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("style");
});

describe("dom driver: environment", () => {
  it("detects the DOM", () => {
    expect(hasDom()).toBe(true);
    vi.stubGlobal("document", undefined);
    expect(hasDom()).toBe(false);
    vi.unstubAllGlobals();
    vi.stubGlobal("window", undefined);
    expect(hasDom()).toBe(false);
  });

  it("measures the layout viewport, or the window without layout", () => {
    const driver = createDomDriver();
    expect(driver.viewport()).toEqual({ width: 1000, height: 800 });
    setViewport(0, 0);
    expect(driver.viewport()).toEqual({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  });
});

describe("dom driver: targets", () => {
  it("queries every element of a selector, throws on an invalid one", () => {
    const driver = createDomDriver();
    const a = mountElement(RECT, { class: "row" });
    const b = mountElement(RECT, { class: "row" });
    expect(driver.query(".row")).toEqual([a, b]);
    expect(driver.query(".none")).toEqual([]);
    expect(() => driver.query(":::")).toThrow();
  });

  it("measures viewport-relative rects", () => {
    const driver = createDomDriver();
    const element = mountElement(RECT);
    expect(driver.measure(element)).toEqual(RECT);
  });

  it("knows whether an element intersects the viewport", () => {
    const driver = createDomDriver();
    const element = mountElement(RECT);
    expect(driver.isInViewport(element)).toBe(true);
    for (const rect of [
      BELOW,
      { x: 1000, y: 10, width: 10, height: 10 },
      { x: -20, y: 10, width: 20, height: 10 },
      { x: 10, y: -20, width: 10, height: 20 },
    ]) {
      setRect(element, rect);
      expect(driver.isInViewport(element)).toBe(false);
    }
    setRect(element, { x: -5, y: -5, width: 10, height: 10 });
    expect(driver.isInViewport(element)).toBe(true);
  });

  it("checks containment of DOM nodes only", () => {
    const driver = createDomDriver();
    const frame = mountElement(RECT);
    const inner = mountElement(RECT, {}, frame);
    const outer = mountElement(RECT);
    expect(driver.contains(frame, inner)).toBe(true);
    expect(driver.contains(frame, frame)).toBe(true);
    expect(driver.contains(frame, outer)).toBe(false);
    expect(driver.contains(frame, null)).toBe(false);
    expect(driver.contains(frame, { name: "fake" })).toBe(false);
  });
});

describe("dom driver: waiting", () => {
  it("notifies on child list mutations, scroll and resize, once per frame", async () => {
    const frames = installFrames();
    const driver = createDomDriver();
    const onChange = vi.fn();
    const stop = driver.watch(onChange);

    mountElement(RECT);
    await flush();
    document.body.append(document.createElement("span"));
    await flush();
    expect(frames.pending).toBe(1);
    frames.flush();
    expect(onChange).toHaveBeenCalledTimes(1);

    const scroller = mountElement(RECT);
    await flush();
    frames.flush();
    scroller.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("resize"));
    frames.flush();
    expect(onChange).toHaveBeenCalledTimes(3);

    // Attribute changes are not observed.
    scroller.setAttribute("class", "shown");
    await flush();
    expect(frames.pending).toBe(0);

    window.dispatchEvent(new Event("resize"));
    stop();
    expect(frames.pending).toBe(0);
    mountElement(RECT);
    window.dispatchEvent(new Event("resize"));
    await flush();
    frames.flush();
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("listens to the visual viewport when available", () => {
    const frames = installFrames();
    const visualViewport = new EventTarget();
    vi.stubGlobal("visualViewport", visualViewport);
    const driver = createDomDriver();
    const onChange = vi.fn();
    const stop = driver.watch(onChange);
    visualViewport.dispatchEvent(new Event("resize"));
    frames.flush();
    visualViewport.dispatchEvent(new Event("scroll"));
    frames.flush();
    expect(onChange).toHaveBeenCalledTimes(2);
    stop();
    visualViewport.dispatchEvent(new Event("resize"));
    frames.flush();
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe("dom driver: tracking", () => {
  it("observes the targets' size, scroll and resize, coalesced per frame", () => {
    const frames = installFrames();
    const observers = installObservers();
    const driver = createDomDriver();
    const a = mountElement(RECT);
    const b = mountElement(RECT);
    const onChange = vi.fn();
    const stop = driver.track([a, b], onChange);
    const [observer] = observers.resize;
    expect([...(observer?.targets ?? [])]).toEqual([a, b]);

    observer?.trigger();
    observer?.trigger();
    document.dispatchEvent(new Event("scroll"));
    frames.flush();
    expect(onChange).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event("resize"));
    stop();
    frames.flush();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(observer?.disconnected).toBe(true);
    document.dispatchEvent(new Event("scroll"));
    frames.flush();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("notifies on child list mutations (layout shifts, removed targets)", async () => {
    const frames = installFrames();
    const driver = createDomDriver();
    const onChange = vi.fn();
    const stop = driver.track([mountElement(RECT)], onChange);
    document.body.prepend(document.createElement("header"));
    await flush();
    frames.flush();
    expect(onChange).toHaveBeenCalledTimes(1);
    stop();
    document.body.prepend(document.createElement("header"));
    await flush();
    expect(frames.pending).toBe(0);
  });

  it("tracks scroll and resize without ResizeObserver", () => {
    const frames = installFrames();
    const driver = createDomDriver();
    const onChange = vi.fn();
    const stop = driver.track([mountElement(RECT)], onChange);
    window.dispatchEvent(new Event("resize"));
    frames.flush();
    expect(onChange).toHaveBeenCalledTimes(1);
    stop();
  });
});

describe("dom driver: scroll into view", () => {
  it("does not scroll a target already fully visible", async () => {
    const driver = createDomDriver();
    const element = mountElement(RECT);
    const scroll = stubScrollIntoView(element);
    await driver.scrollIntoView([element], SMOOTH, signal());
    await driver.scrollIntoView([], SMOOTH, signal());
    expect(scroll).not.toHaveBeenCalled();
  });

  it("scrolls the largest target, and does nothing once aborted", async () => {
    const driver = createDomDriver();
    const small = mountElement({ x: 0, y: 900, width: 10, height: 10 });
    const large = mountElement({ x: 0, y: 1200, width: 100, height: 100 });
    const smallScroll = stubScrollIntoView(small);
    const largeScroll = stubScrollIntoView(large);
    const controller = new AbortController();
    controller.abort();
    await driver.scrollIntoView([small, large], SMOOTH, controller.signal);
    expect(largeScroll).not.toHaveBeenCalled();

    await driver.scrollIntoView(
      [small, large],
      { ...SMOOTH, behavior: "instant", block: "start" },
      signal()
    );
    expect(smallScroll).not.toHaveBeenCalled();
    expect(largeScroll).toHaveBeenCalledWith({
      behavior: "instant",
      block: "start",
      inline: "nearest",
    });
  });

  it("scrolls a target clipped by a scrolling ancestor", async () => {
    const driver = createDomDriver();
    const panel = mountElement({ x: 0, y: 0, width: 300, height: 200 });
    panel.style.overflowY = "auto";
    const visible = mountElement(
      { x: 0, y: 10, width: 100, height: 40 },
      {},
      panel
    );
    const clipped = mountElement(
      { x: 0, y: 400, width: 100, height: 40 },
      {},
      panel
    );
    const plain = mountElement({ x: 0, y: 0, width: 50, height: 50 });
    const nested = mountElement(
      { x: 0, y: 100, width: 10, height: 10 },
      {},
      plain
    );
    const scrolls = [visible, clipped, nested].map(stubScrollIntoView);
    const instant = { ...SMOOTH, behavior: "instant" } as const;
    await driver.scrollIntoView([visible], instant, signal());
    await driver.scrollIntoView([clipped], instant, signal());
    // An ancestor that does not clip (overflow visible) is ignored.
    await driver.scrollIntoView([nested], instant, signal());
    expect(scrolls.map((scroll) => scroll.mock.calls.length)).toEqual([
      0, 1, 0,
    ]);
  });

  it("waits for scrollend captured on the document (nested scrollers)", async () => {
    vi.useFakeTimers();
    const driver = createDomDriver();
    const element = mountElement(BELOW);
    const scroll = stubScrollIntoView(element);
    const settled = vi.fn();
    driver.scrollIntoView([element], SMOOTH, signal()).then(settled);
    expect(scroll).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
    await vi.advanceTimersByTimeAsync(100);
    expect(settled).not.toHaveBeenCalled();
    // `scrollend` does not bubble from an element: only a capture sees it.
    mountElement(RECT).dispatchEvent(new Event("scrollend"));
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toHaveBeenCalled();
  });

  it("falls back after 500 ms without scrollend, and settles on abort", async () => {
    vi.useFakeTimers();
    const driver = createDomDriver();
    const element = mountElement(BELOW);
    stubScrollIntoView(element);
    const settled = vi.fn();
    driver.scrollIntoView([element], SMOOTH, signal()).then(settled);
    await vi.advanceTimersByTimeAsync(SCROLL_END_FALLBACK - 1);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toHaveBeenCalled();

    const controller = new AbortController();
    const aborted = vi.fn();
    driver.scrollIntoView([element], SMOOTH, controller.signal).then(aborted);
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(aborted).toHaveBeenCalled();
  });

  it("resolves `auto` with prefers-reduced-motion", async () => {
    const driver = createDomDriver();
    const element = mountElement(BELOW);
    const scroll = stubScrollIntoView(element);
    const auto = { ...SMOOTH, behavior: "auto" } as const;

    const matchMedia = installReducedMotion(true);
    await driver.scrollIntoView([element], auto, signal());
    expect(matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
    expect(scroll).toHaveBeenLastCalledWith(
      expect.objectContaining({ behavior: "instant" })
    );

    vi.useFakeTimers();
    installReducedMotion(false);
    driver.scrollIntoView([element], auto, signal());
    expect(scroll).toHaveBeenLastCalledWith(
      expect.objectContaining({ behavior: "smooth" })
    );

    // Without matchMedia: smooth.
    vi.stubGlobal("matchMedia", undefined);
    driver.scrollIntoView([element], auto, signal());
    expect(scroll).toHaveBeenLastCalledWith(
      expect.objectContaining({ behavior: "smooth" })
    );
    await vi.advanceTimersByTimeAsync(SCROLL_END_FALLBACK);
  });
});

describe("dom driver: scroll lock", () => {
  it("locks the scroller and restores the inline values", () => {
    const driver = createDomDriver();
    const { style } = document.documentElement;
    style.setProperty("overflow", "scroll", "important");
    const release = driver.lockScroll();
    expect(style.getPropertyValue("overflow")).toBe("hidden");
    expect(style.getPropertyValue("scrollbar-gutter")).toBe("stable");
    release();
    expect(style.getPropertyValue("overflow")).toBe("scroll");
    expect(style.getPropertyPriority("overflow")).toBe("important");
    expect(style.getPropertyValue("scrollbar-gutter")).toBe("");
  });

  it("uses the document's scrolling element when there is one", () => {
    const driver = createDomDriver();
    const scroller = mountElement(RECT);
    Object.defineProperty(document, "scrollingElement", {
      configurable: true,
      value: scroller,
    });
    try {
      const release = driver.lockScroll();
      expect(scroller.style.overflow).toBe("hidden");
      release();
      expect(scroller.getAttribute("style")).toBe("");
    } finally {
      Reflect.deleteProperty(document, "scrollingElement");
    }
  });
});

describe("dom driver: focus", () => {
  it("restores the focus to the element focused at capture", () => {
    const driver = createDomDriver();
    const button = document.createElement("button");
    const other = document.createElement("button");
    document.body.append(button, other);
    button.focus();
    const restore = driver.captureFocus();
    other.focus();
    restore();
    expect(document.activeElement).toBe(button);
  });

  it("skips a disconnected element", () => {
    const driver = createDomDriver();
    const button = document.createElement("button");
    document.body.append(button);
    button.focus();
    const restore = driver.captureFocus();
    button.remove();
    expect(() => restore()).not.toThrow();
  });

  it("skips an element without focus()", () => {
    const driver = createDomDriver();
    vi.spyOn(document, "activeElement", "get").mockReturnValue(
      document.createElementNS("http://www.w3.org/1998/Math/MathML", "math")
    );
    const restoreMath = driver.captureFocus();
    vi.spyOn(document, "activeElement", "get").mockReturnValue(null);
    const restoreNone = driver.captureFocus();
    expect(() => {
      restoreMath();
      restoreNone();
    }).not.toThrow();
  });
});

describe("dom driver: keyboard", () => {
  const press = (
    key: string,
    init: KeyboardEventInit = {},
    target: EventTarget = document.body
  ) => {
    const event = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    target.dispatchEvent(event);
    return event;
  };

  it("hands the handled keys to the handler and prevents their default", () => {
    const driver = createDomDriver();
    const handler = vi.fn((_intent: KeyIntent) => true);
    const stop = driver.listenKeys(handler);
    expect(press("Escape").defaultPrevented).toBe(true);
    expect(handler).toHaveBeenCalledWith({
      key: "Escape",
      target: document.body,
    });
    expect(press("ArrowRight").defaultPrevented).toBe(true);
    expect(press("Enter").defaultPrevented).toBe(false);
    expect(handler).toHaveBeenCalledTimes(2);
    stop();
    press("Escape");
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("keeps the default when the handler ignores the key", () => {
    const driver = createDomDriver();
    const stop = driver.listenKeys(() => false);
    expect(press("ArrowLeft").defaultPrevented).toBe(false);
    stop();
  });

  it("ignores prevented, composing, modified and in-field arrows", () => {
    const driver = createDomDriver();
    const handler = vi.fn((_intent: KeyIntent) => true);
    const stop = driver.listenKeys(handler);
    const input = document.createElement("input");
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    const inner = document.createElement("span");
    editable.append(inner);
    const readonly = document.createElement("div");
    readonly.setAttribute("contenteditable", "false");
    document.body.append(input, editable, readonly);

    const prevented = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    prevented.preventDefault();
    document.body.dispatchEvent(prevented);
    press("Escape", { isComposing: true });
    for (const modifier of ["altKey", "ctrlKey", "metaKey", "shiftKey"]) {
      press("ArrowRight", { [modifier]: true });
    }
    press("ArrowRight", {}, input);
    press("ArrowLeft", {}, inner);
    expect(handler).not.toHaveBeenCalled();

    // Escape still works in a field; arrows outside of an editable host too.
    press("Escape", {}, input);
    press("ArrowLeft", {}, readonly);
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true })
    );
    expect(handler.mock.calls.map(([intent]) => intent.key)).toEqual([
      "Escape",
      "ArrowLeft",
      "ArrowRight",
    ]);
    stop();
  });
});

describe("dom driver: visibility", () => {
  const request = (
    resolve: () => readonly Element[],
    onChange = vi.fn(),
    threshold = 0.5
  ) => {
    const notifiers = new Set<() => void>();
    return {
      onChange,
      notify: () => {
        for (const notify of [...notifiers]) {
          notify();
        }
      },
      notifiers,
      request: {
        resolve,
        threshold,
        onChange,
        subscribe: (notify: () => void) => {
          notifiers.add(notify);
          return () => notifiers.delete(notify);
        },
      },
    };
  };

  it("does nothing without IntersectionObserver", () => {
    const driver = createDomDriver();
    const { request: visibility, notifiers } = request(() => []);
    const stop = driver.observeVisibility(visibility);
    expect(notifiers.size).toBe(0);
    stop();
  });

  it("reports when one of the elements crosses the threshold", () => {
    const observers = installObservers();
    const driver = createDomDriver();
    const a = mountElement(RECT);
    const b = mountElement(RECT);
    const { request: visibility, onChange } = request(() => [a, b]);
    const stop = driver.observeVisibility(visibility);
    const [observer] = observers.intersection;
    expect(observer?.options).toEqual({ threshold: 0.5 });
    expect([...(observer?.targets ?? [])]).toEqual([a, b]);

    observer?.emit(a, 0.3);
    expect(onChange).not.toHaveBeenCalled();
    observer?.emit(a, 0.5);
    expect(onChange).toHaveBeenLastCalledWith(true);
    observer?.emit(b, 1);
    expect(onChange).toHaveBeenCalledTimes(1);
    observer?.emit(a, 0);
    observer?.emit(b, 0.2);
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(onChange).toHaveBeenCalledTimes(2);
    stop();
    expect(observer?.disconnected).toBe(true);
  });

  it("follows the resolved elements on mutations and registrations", async () => {
    const observers = installObservers();
    const driver = createDomDriver();
    let elements: Element[] = [];
    const {
      request: visibility,
      onChange,
      notify,
      notifiers,
    } = request(() => elements, vi.fn(), 0);
    const stop = driver.observeVisibility(visibility);
    const [observer] = observers.intersection;
    expect(observer?.targets.size).toBe(0);

    const a = mountElement(RECT, { class: "target" });
    elements = [a];
    await flush();
    expect([...(observer?.targets ?? [])]).toEqual([a]);
    observer?.emit(a, 0.1);
    expect(onChange).toHaveBeenLastCalledWith(true);
    // Unchanged elements stay observed and visible.
    notify();
    expect([...(observer?.targets ?? [])]).toEqual([a]);
    expect(onChange).toHaveBeenCalledTimes(1);

    // Registration change: `a` is not a target anymore.
    const b = document.createElement("div");
    elements = [b];
    notify();
    expect([...(observer?.targets ?? [])]).toEqual([b]);
    expect(onChange).toHaveBeenLastCalledWith(false);

    stop();
    expect(notifiers.size).toBe(0);
    elements = [a];
    mountElement(RECT);
    await flush();
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
