// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineGuide } from "../src/guide.js";
import {
  type CreateGuideManagerOptions,
  createGuideManager,
} from "../src/manager.js";
import { createGuideStep } from "../src/step.js";
import { memoryAdapter } from "../src/storage.js";
import type { GuideEvent, GuideManager } from "../src/types.js";
import {
  installFrames,
  installObservers,
  mountElement,
  setRect,
  setViewport,
  stubScrollIntoView,
} from "./dom-fakes.js";
import { eventsOf, flush, runOf } from "./helpers.js";

const RECT = { x: 10, y: 20, width: 100, height: 40 };
const EMPTY = { x: 0, y: 0, width: 0, height: 0 };
const VIEW = { x: 0, y: 0, width: 1000, height: 800 };

const managers: GuideManager[] = [];

const create = async (
  options: Omit<CreateGuideManagerOptions, "storage"> &
    Partial<Pick<CreateGuideManagerOptions, "storage">>
) => {
  const events: GuideEvent[] = [];
  const manager = createGuideManager({
    storage: memoryAdapter(),
    onEvent: (event) => events.push(event),
    ...options,
  });
  managers.push(manager);
  await flush();
  return { manager, events };
};

let frames: ReturnType<typeof installFrames>;
let observers: ReturnType<typeof installObservers>;

beforeEach(() => {
  setViewport(1000, 800);
  frames = installFrames();
  observers = installObservers();
});

afterEach(() => {
  for (const manager of managers.splice(0)) {
    manager.destroy();
  }
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("style");
});

const tour = (
  steps: Parameters<typeof defineGuide>[0]["steps"],
  extra: Partial<Parameters<typeof defineGuide>[0]> = {}
) => defineGuide({ id: "tour", steps, ...extra });

describe("manager with the DOM driver: targets", () => {
  it("uses the DOM driver by default and resolves a selector target", async () => {
    const element = mountElement(RECT, { class: "row" });
    const step = createGuideStep({ id: "a", target: ".row" });
    const { manager } = await create({ guides: [tour([step])] });
    manager.start("tour");
    await flush();
    expect(runOf(manager, "tour")).toMatchObject({ status: "active" });
    expect(manager.getLayout("tour")).toEqual({
      rects: [RECT],
      view: VIEW,
      viewport: { width: 1000, height: 800 },
    });
    expect(element.isConnected).toBe(true);
  });

  it("prefers registered anchors, several of them, and filters empty rects", async () => {
    mountElement({ ...RECT, x: 500 }, { class: "fallback" });
    const step = createGuideStep({ id: "a", target: ".fallback" });
    const { manager } = await create({ guides: [tour([step])] });
    const first = mountElement(RECT);
    const hidden = mountElement(EMPTY);
    const second = mountElement({ ...RECT, y: 300 });
    for (const element of [first, hidden, second]) {
      manager.registerAnchor("a", element);
    }
    manager.start("tour");
    await flush();
    expect(manager.getLayout("tour")?.rects).toEqual([
      RECT,
      { ...RECT, y: 300 },
    ]);
  });

  it("resolves function and array targets", async () => {
    const a = mountElement(RECT, { id: "one" });
    mountElement({ ...RECT, y: 200 }, { id: "two" });
    const byFunction = createGuideStep({ id: "fn", target: () => a });
    const byArray = createGuideStep({ id: "arr", target: ["#one", "#two"] });
    const { manager } = await create({ guides: [tour([byFunction, byArray])] });
    manager.start("tour");
    await flush();
    expect(manager.getLayout("tour")?.rects).toEqual([RECT]);
    manager.next("tour");
    await flush();
    expect(manager.getLayout("tour")?.rects).toEqual([
      RECT,
      { ...RECT, y: 200 },
    ]);
  });

  it("resolves an invalid selector to no target, with a dev warning", async () => {
    vi.useFakeTimers();
    const step = createGuideStep({ id: "a", target: ":::" });
    const { manager, events } = await create({
      guides: [tour([step], { waitTimeout: 100 })],
    });
    manager.start("tour");
    await vi.advanceTimersByTimeAsync(100);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Invalid selector ":::"'),
      expect.anything()
    );
    expect(eventsOf(events, "missing")).toHaveLength(1);
    expect(runOf(manager, "tour")).toBeNull();
  });
});

describe("manager with the DOM driver: waiting", () => {
  it("waits for a target added to the DOM", async () => {
    const step = createGuideStep({ id: "a", target: ".late" });
    const { manager } = await create({ guides: [tour([step])] });
    manager.start("tour");
    await flush();
    expect(runOf(manager, "tour")?.status).toBe("transitioning");
    mountElement(RECT, { class: "late" });
    await flush();
    frames.flush();
    await flush();
    expect(runOf(manager, "tour")).toMatchObject({
      status: "active",
      step: { id: "a" },
    });
  });

  it("finds a target at the deadline when no frame ran (background tab)", async () => {
    // Timers only: the fake animation frames stay manual.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const step = createGuideStep({ id: "a", target: ".late" });
    const { manager, events } = await create({
      guides: [tour([step], { waitTimeout: 1000 })],
    });
    manager.start("tour");
    await vi.advanceTimersByTimeAsync(0);
    mountElement(RECT, { class: "late" });
    // Animation frames are paused (`frames.flush()` never called): the
    // mutation is never delivered to the wait.
    await vi.advanceTimersByTimeAsync(999);
    expect(runOf(manager, "tour")?.status).toBe("transitioning");
    await vi.advanceTimersByTimeAsync(1);
    expect(eventsOf(events, "missing")).toHaveLength(0);
    expect(runOf(manager, "tour")?.status).toBe("active");
  });

  it("waits for an anchor registration", async () => {
    const step = createGuideStep({ id: "a" });
    const { manager } = await create({ guides: [tour([step])] });
    manager.start("tour");
    await flush();
    expect(runOf(manager, "tour")?.status).toBe("transitioning");
    manager.registerAnchor("a", mountElement(RECT));
    await flush();
    expect(runOf(manager, "tour")?.status).toBe("active");
  });

  it("waits for a passive target to scroll into the viewport", async () => {
    const element = mountElement({ ...RECT, y: 2000 }, { class: "far" });
    const scroll = stubScrollIntoView(element);
    const step = createGuideStep({ id: "a", target: ".far" });
    const { manager } = await create({
      guides: [tour([step], { mode: "passive" })],
    });
    manager.start("tour");
    await flush();
    frames.flush();
    await flush();
    expect(runOf(manager, "tour")?.status).toBe("transitioning");
    setRect(element, { ...RECT, y: 300 });
    document.dispatchEvent(new Event("scroll"));
    frames.flush();
    await flush();
    expect(runOf(manager, "tour")?.status).toBe("active");
    // Passive steps never scroll.
    expect(scroll).not.toHaveBeenCalled();
  });
});

describe("manager with the DOM driver: tracking", () => {
  it("follows the targets and drops notifications that move nothing", async () => {
    const element = mountElement(RECT, { class: "row" });
    const step = createGuideStep({ id: "a", target: ".row" });
    const { manager } = await create({ guides: [tour([step])] });
    const listener = vi.fn();
    manager.subscribeLayout("tour", listener);
    manager.start("tour");
    await flush();
    expect(listener).toHaveBeenCalledTimes(1);
    const layout = manager.getLayout("tour");

    document.dispatchEvent(new Event("scroll"));
    frames.flush();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(manager.getLayout("tour")).toBe(layout);

    setRect(element, { ...RECT, y: 60 });
    observers.resize.at(-1)?.trigger();
    frames.flush();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(manager.getLayout("tour")?.rects).toEqual([{ ...RECT, y: 60 }]);

    setViewport(800, 600);
    window.dispatchEvent(new Event("resize"));
    frames.flush();
    expect(listener).toHaveBeenCalledTimes(3);
    expect(manager.getLayout("tour")).toMatchObject({
      view: { width: 800, height: 600 },
      viewport: { width: 800, height: 600 },
    });

    const other = mountElement({ ...RECT, x: 300 }, { class: "row" });
    document.dispatchEvent(new Event("scroll"));
    frames.flush();
    expect(manager.getLayout("tour")?.rects).toHaveLength(2);
    other.remove();
    setRect(element, { ...RECT, y: 70 });
    document.dispatchEvent(new Event("scroll"));
    frames.flush();
    expect(manager.getLayout("tour")?.rects).toEqual([{ ...RECT, y: 70 }]);
    setRect(element, { ...RECT, y: 70, width: 50 });
    document.dispatchEvent(new Event("scroll"));
    frames.flush();
    expect(manager.getLayout("tour")?.rects).toEqual([
      { ...RECT, y: 70, width: 50 },
    ]);
  });

  it("goes back to the wait when the anchor unmounts, then recovers", async () => {
    const element = mountElement(RECT, { class: "row" });
    const step = createGuideStep({ id: "a", target: ".row" });
    const { manager } = await create({ guides: [tour([step])] });
    manager.start("tour");
    await flush();
    const observer = observers.resize.at(-1);
    expect(observer?.targets.has(element)).toBe(true);

    element.remove();
    observer?.trigger();
    frames.flush();
    expect(runOf(manager, "tour")?.status).toBe("transitioning");
    expect(manager.getLayout("tour")).toBeNull();
    expect(observer?.disconnected).toBe(true);

    mountElement(RECT, { class: "row" });
    await flush();
    frames.flush();
    await flush();
    expect(runOf(manager, "tour")?.status).toBe("active");
    expect(manager.getLayout("tour")?.rects).toEqual([RECT]);
  });

  it("updates the layout in place when anchors change while active", async () => {
    const step = createGuideStep({ id: "a" });
    const { manager } = await create({ guides: [tour([step])] });
    const first = mountElement(RECT);
    manager.registerAnchor("a", first);
    manager.start("tour");
    await flush();
    const seen: unknown[] = [];
    manager.subscribeLayout("tour", () => seen.push(manager.getLayout("tour")));

    const second = mountElement({ ...RECT, y: 300 });
    const unregister = manager.registerAnchor("a", second);
    expect(seen).toEqual([
      expect.objectContaining({ rects: [RECT, { ...RECT, y: 300 }] }),
    ]);
    expect([...(observers.resize.at(-1)?.targets ?? [])]).toEqual([
      first,
      second,
    ]);
    // A content registration moves nothing: no notification.
    manager.registerContent("a", {});
    expect(seen).toHaveLength(1);
    unregister();
    expect(seen).toEqual([
      expect.anything(),
      expect.objectContaining({ rects: [RECT] }),
    ]);
  });

  it("observes a target re-rendered while active", async () => {
    const element = mountElement(RECT, { class: "row" });
    const step = createGuideStep({ id: "a", target: ".row" });
    const { manager } = await create({ guides: [tour([step])] });
    manager.start("tour");
    await flush();
    const first = observers.resize.at(-1);

    // The node is swapped for a new one matching the same selector.
    element.remove();
    const replacement = mountElement({ ...RECT, y: 100 }, { class: "row" });
    await flush();
    frames.flush();
    expect(runOf(manager, "tour")?.status).toBe("active");
    expect(manager.getLayout("tour")?.rects).toEqual([{ ...RECT, y: 100 }]);
    expect(first?.disconnected).toBe(true);
    const second = observers.resize.at(-1);
    expect([...(second?.targets ?? [])]).toEqual([replacement]);

    // Its size changes are followed.
    setRect(replacement, { ...RECT, y: 100, height: 80 });
    second?.trigger();
    frames.flush();
    expect(manager.getLayout("tour")?.rects).toEqual([
      { ...RECT, y: 100, height: 80 },
    ]);
  });

  it("measures the collision container as the placement view", async () => {
    mountElement(RECT, { class: "row" });
    const container = mountElement({ x: 50, y: 60, width: 500, height: 400 });
    const step = createGuideStep({ id: "a", target: ".row" });
    let current: Element | null = container;
    const { manager } = await create({
      guides: [tour([step])],
      collisionContainer: () => current,
    });
    manager.start("tour");
    await flush();
    expect(manager.getLayout("tour")?.view).toEqual({
      x: 50,
      y: 60,
      width: 500,
      height: 400,
    });
    current = null;
    window.dispatchEvent(new Event("resize"));
    frames.flush();
    expect(manager.getLayout("tour")?.view).toEqual(VIEW);
  });

  it("falls back to the viewport when the collision container throws", async () => {
    mountElement(RECT, { class: "row" });
    const step = createGuideStep({ id: "a", target: ".row" });
    const { manager } = await create({
      guides: [tour([step])],
      collisionContainer: () => {
        throw new Error("boom");
      },
    });
    manager.start("tour");
    await flush();
    expect(manager.getLayout("tour")?.view).toEqual(VIEW);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("collisionContainer"),
      expect.any(Error)
    );
  });
});

describe("manager with the DOM driver: scroll", () => {
  it("scrolls a modal target into view and waits for scrollend", async () => {
    vi.useFakeTimers();
    const element = mountElement({ ...RECT, y: 2000 }, { class: "far" });
    const scroll = stubScrollIntoView(element);
    const step = createGuideStep({ id: "a", target: ".far" });
    const { manager } = await create({
      guides: [tour([step])],
      scroll: { behavior: "smooth", block: "start" },
    });
    manager.start("tour");
    await vi.advanceTimersByTimeAsync(0);
    expect(scroll).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
    expect(runOf(manager, "tour")?.status).toBe("transitioning");
    setRect(element, { ...RECT, y: 0 });
    element.dispatchEvent(new Event("scrollend"));
    await vi.advanceTimersByTimeAsync(0);
    expect(runOf(manager, "tour")?.status).toBe("active");
    expect(manager.getLayout("tour")?.rects).toEqual([{ ...RECT, y: 0 }]);
  });

  it("locks the scroll during a modal run and restores it at the end", async () => {
    mountElement(RECT, { class: "row" });
    const { style } = document.documentElement;
    style.setProperty("overflow", "auto");
    const step = createGuideStep({ id: "a", target: ".row" });
    const { manager } = await create({
      guides: [tour([step])],
      scroll: { lock: true },
    });
    manager.start("tour");
    await flush();
    expect(style.getPropertyValue("overflow")).toBe("hidden");
    expect(style.getPropertyValue("scrollbar-gutter")).toBe("stable");
    manager.end("tour");
    await flush();
    expect(style.getPropertyValue("overflow")).toBe("auto");
    expect(style.getPropertyValue("scrollbar-gutter")).toBe("");
  });

  it("restores the focus at the end of a modal run", async () => {
    mountElement(RECT, { class: "row" });
    const button = document.createElement("button");
    document.body.append(button);
    button.focus();
    const step = createGuideStep({ id: "a", target: ".row" });
    const { manager } = await create({ guides: [tour([step])] });
    manager.start("tour");
    await flush();
    const frame = document.createElement("div");
    frame.tabIndex = -1;
    document.body.append(frame);
    frame.focus();
    manager.end("tour");
    await flush();
    expect(document.activeElement).toBe(button);
  });
});

describe("manager with the DOM driver: keyboard", () => {
  const press = (key: string, target: EventTarget = document.body) => {
    const event = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(event);
    return event;
  };

  it("binds the modal keys on the document", async () => {
    mountElement(RECT, { id: "a" });
    mountElement(RECT, { id: "b" });
    const a = createGuideStep({ id: "a", target: "#a" });
    const b = createGuideStep({ id: "b", target: "#b" });
    const { manager } = await create({ guides: [tour([a, b])] });
    manager.start("tour");
    await flush();
    expect(press("ArrowRight").defaultPrevented).toBe(true);
    await flush();
    expect(runOf(manager, "tour")?.step?.id).toBe("b");
    press("ArrowLeft");
    await flush();
    expect(runOf(manager, "tour")?.step?.id).toBe("a");
    press("Escape");
    await flush();
    expect(runOf(manager, "tour")).toBeNull();
    expect(press("Escape").defaultPrevented).toBe(false);
  });

  it("ends a passive run on Escape only when the focus is in its Frame", async () => {
    mountElement(RECT, { class: "row" });
    const step = createGuideStep({ id: "a", target: ".row" });
    const { manager } = await create({
      guides: [tour([step], { mode: "passive" })],
    });
    manager.start("tour");
    await flush();
    const frame = mountElement(RECT);
    const button = document.createElement("button");
    frame.append(button);
    const unregister = manager.registerFrame("tour", frame);

    expect(press("Escape").defaultPrevented).toBe(false);
    expect(press("ArrowRight", button).defaultPrevented).toBe(false);
    expect(runOf(manager, "tour")).not.toBeNull();
    unregister();
    expect(press("Escape", button).defaultPrevented).toBe(false);
    manager.registerFrame("tour", frame);
    expect(press("Escape", button).defaultPrevented).toBe(true);
    await flush();
    expect(runOf(manager, "tour")).toBeNull();
  });
});

describe("manager with the DOM driver: cleanup", () => {
  it("removes every listener and observer on destroy", async () => {
    const live = new Map<string, number>();
    const count = (target: string, delta: number) => (type: string) => {
      const key = `${target}:${type}`;
      live.set(key, (live.get(key) ?? 0) + delta);
    };
    for (const [name, target] of [
      ["document", document],
      ["window", window],
    ] as const) {
      const add = target.addEventListener.bind(target);
      const remove = target.removeEventListener.bind(target);
      vi.spyOn(target, "addEventListener").mockImplementation(
        (type, ...rest) => {
          count(name, 1)(type);
          add(type, ...rest);
        }
      );
      vi.spyOn(target, "removeEventListener").mockImplementation(
        (type, ...rest) => {
          count(name, -1)(type);
          remove(type, ...rest);
        }
      );
    }
    const mutations = { observed: 0, disconnected: 0 };
    const { observe, disconnect } = MutationObserver.prototype;
    vi.spyOn(MutationObserver.prototype, "observe").mockImplementation(
      function (this: MutationObserver, ...args) {
        mutations.observed += 1;
        observe.apply(this, args);
      }
    );
    vi.spyOn(MutationObserver.prototype, "disconnect").mockImplementation(
      function (this: MutationObserver) {
        mutations.disconnected += 1;
        disconnect.apply(this);
      }
    );

    mountElement(RECT, { class: "row" });
    const step = createGuideStep({ id: "a", target: ".row" });
    const waiting = createGuideStep({ id: "w", target: ".never" });
    const { manager } = await create({
      guides: [
        tour([step]),
        defineGuide({ id: "hint", mode: "passive", steps: [waiting] }),
        defineGuide({ id: "auto", trigger: "visible", steps: [waiting] }),
      ],
      scroll: { lock: true },
    });
    manager.start("tour");
    manager.start("hint");
    await flush();
    expect(runOf(manager, "tour")?.status).toBe("active");
    expect(mutations.observed).toBeGreaterThanOrEqual(3);
    expect([...live.values()].some((value) => value > 0)).toBe(true);

    manager.destroy();
    await flush();
    expect([...live.entries()].filter(([, value]) => value !== 0)).toEqual([]);
    expect(mutations.disconnected).toBe(mutations.observed);
    for (const observer of [...observers.resize, ...observers.intersection]) {
      expect(observer.disconnected).toBe(true);
    }
    expect(frames.pending).toBe(0);
    expect(document.documentElement.getAttribute("style") ?? "").toBe("");
  });
});

describe("manager with the DOM driver: visible trigger", () => {
  const record = { status: "in-progress", version: 1, updatedAt: 1 } as const;

  it("starts once an anchor of the first step is visible enough, after the delay", async () => {
    vi.useFakeTimers();
    const element = mountElement(RECT, { class: "start" });
    const step = createGuideStep({ id: "a", target: ".start" });
    const { manager, events } = await create({
      guides: [
        tour([step], {
          trigger: { on: "visible", threshold: 0.8, delay: 200 },
        }),
      ],
    });
    const observer = observers.intersection.at(-1);
    expect(observer?.options).toEqual({ threshold: 0.8 });
    expect(observer?.targets.has(element)).toBe(true);

    observer?.emit(element, 0.5);
    await vi.advanceTimersByTimeAsync(500);
    expect(runOf(manager, "tour")).toBeNull();

    observer?.emit(element, 0.9);
    await vi.advanceTimersByTimeAsync(100);
    observer?.emit(element, 0.1);
    await vi.advanceTimersByTimeAsync(500);
    expect(runOf(manager, "tour")).toBeNull();

    observer?.emit(element, 1);
    await vi.advanceTimersByTimeAsync(200);
    expect(runOf(manager, "tour")?.status).toBe("active");
    expect(eventsOf(events, "start")).toEqual([
      expect.objectContaining({ trigger: "visible", resumed: false }),
    ]);
    expect(observer?.disconnected).toBe(true);
  });

  it("observes anchors registered and elements mounted later", async () => {
    const step = createGuideStep({ id: "a", target: ".start" });
    const { manager } = await create({
      guides: [tour([step], { trigger: "visible" })],
    });
    const observer = observers.intersection.at(-1);
    expect(observer?.targets.size).toBe(0);

    const mounted = mountElement(RECT, { class: "start" });
    await flush();
    expect(observer?.targets.has(mounted)).toBe(true);

    const anchor = mountElement(RECT);
    const unregister = manager.registerAnchor("a", anchor);
    expect([...(observer?.targets ?? [])]).toEqual([anchor]);
    unregister();
    expect([...(observer?.targets ?? [])]).toEqual([mounted]);

    observer?.emit(mounted, 0.6);
    await flush();
    expect(runOf(manager, "tour")?.status).toBe("active");
  });

  it("observes the in-progress step to resume, and never a completed guide", async () => {
    const first = mountElement(RECT, { class: "first" });
    const second = mountElement(RECT, { class: "second" });
    const a = createGuideStep({ id: "a", target: ".first" });
    const b = createGuideStep({ id: "b", target: ".second" });
    const { manager, events } = await create({
      guides: [
        tour([a, b], { trigger: "visible" }),
        defineGuide({ id: "done", trigger: "visible", steps: [a] }),
      ],
      storage: memoryAdapter({
        tour: { ...record, stepId: "b" },
        done: { status: "completed", version: 1, updatedAt: 1 },
      }),
    });
    expect(observers.intersection).toHaveLength(1);
    const observer = observers.intersection[0];
    expect([...(observer?.targets ?? [])]).toEqual([second]);
    observer?.emit(second, 1);
    await flush();
    expect(runOf(manager, "tour")?.step?.id).toBe("b");
    expect(eventsOf(events, "start")[0]).toMatchObject({ resumed: true });
    expect(first.isConnected).toBe(true);
  });
});
