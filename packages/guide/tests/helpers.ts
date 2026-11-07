import type {
  GuideDriver,
  KeyIntent,
  VisibilityRequest,
} from "../src/driver.js";
import {
  type CreateGuideManagerOptions,
  createGuideManager,
} from "../src/manager.js";
import { createGuideStep } from "../src/step.js";
import { memoryAdapter } from "../src/storage.js";
import type {
  GuideEvent,
  GuideManager,
  GuideStep,
  Rect,
} from "../src/types.js";

const realSetImmediate = globalThis.setImmediate;

/** Drains pending promise jobs (works with fake timers). */
export const flush = async (rounds = 3): Promise<void> => {
  for (let round = 0; round < rounds; round++) {
    await new Promise<void>((resolve) => realSetImmediate(resolve));
  }
};

export interface FakeElement {
  inViewport: boolean;
  name: string;
  parent: FakeElement | null;
  rect: Rect;
}

export const DEFAULT_RECT: Rect = { x: 10, y: 20, width: 100, height: 40 };
export const VIEWPORT = { width: 1000, height: 800 };
export const EMPTY_RECT: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const fakeElement = (
  name: string,
  overrides: Partial<FakeElement> = {}
): Element =>
  ({
    name,
    rect: DEFAULT_RECT,
    inViewport: true,
    parent: null,
    ...overrides,
  }) as unknown as Element;

export const asFake = (element: Element): FakeElement =>
  element as unknown as FakeElement;

export interface TrackRequest {
  elements: readonly Element[];
  onChange: () => void;
}

export const createFakeDriver = () => {
  const selectors = new Map<string, Element[]>();
  const watchers = new Set<() => void>();
  const tracked = new Set<TrackRequest>();
  const visibility = new Set<VisibilityRequest>();
  const calls = {
    capture: 0,
    restore: 0,
    lock: 0,
    unlock: 0,
    scroll: [] as (readonly Element[])[],
  };
  let keyHandler: ((intent: KeyIntent) => boolean) | null = null;
  let scroll: () => Promise<void> = () => Promise.resolve();

  const notify = () => {
    for (const watcher of [...watchers]) {
      watcher();
    }
  };

  const driver: GuideDriver = {
    query: (selector) => {
      if (selector.startsWith("!")) {
        throw new SyntaxError(`Invalid selector ${selector}`);
      }
      return selectors.get(selector) ?? [];
    },
    measure: (element) => asFake(element).rect,
    viewport: () => VIEWPORT,
    isInViewport: (element) => asFake(element).inViewport,
    contains: (container, node) => {
      let current = node as FakeElement | null;
      while (current) {
        if (current === asFake(container)) {
          return true;
        }
        current = current.parent;
      }
      return false;
    },
    watch: (onChange) => {
      watchers.add(onChange);
      return () => watchers.delete(onChange);
    },
    scrollIntoView: (elements) => {
      calls.scroll.push(elements);
      return scroll();
    },
    lockScroll: () => {
      calls.lock++;
      return () => {
        calls.unlock++;
      };
    },
    captureFocus: () => {
      calls.capture++;
      return () => {
        calls.restore++;
      };
    },
    listenKeys: (handler) => {
      keyHandler = handler;
      return () => {
        keyHandler = null;
      };
    },
    track: (elements, onChange) => {
      const request = { elements, onChange };
      tracked.add(request);
      return () => tracked.delete(request);
    },
    observeVisibility: (request) => {
      visibility.add(request);
      return () => visibility.delete(request);
    },
  };

  return {
    driver,
    calls,
    tracked,
    visibility,
    watchers,
    /** Mounts elements for a selector and notifies waiters. */
    mount(selector: string, ...elements: Element[]) {
      selectors.set(selector, elements);
      notify();
    },
    unmount(selector: string) {
      selectors.delete(selector);
      notify();
    },
    notify,
    /** Changes a rect and notifies waiters and trackers. */
    resize(element: Element, rect: Rect) {
      asFake(element).rect = rect;
      notify();
      for (const request of [...tracked]) {
        request.onChange();
      }
    },
    press(key: string, target: unknown = null): boolean {
      return keyHandler ? keyHandler({ key, target }) : false;
    },
    get keysBound() {
      return keyHandler !== null;
    },
    setScroll(fn: () => Promise<void>) {
      scroll = fn;
    },
    /** Reports visibility to every observer. */
    setVisible(visible: boolean) {
      for (const request of [...visibility]) {
        request.onChange(visible);
      }
    },
  };
};

export type FakeDriver = ReturnType<typeof createFakeDriver>;

/** Steps `#id` with a mounted element each. */
export const mountedSteps = <const T extends readonly string[]>(
  fake: FakeDriver,
  ...ids: T
): { [K in keyof T]: GuideStep } =>
  ids.map((id) => {
    fake.mount(`#${id}`, fakeElement(id));
    return createGuideStep({ id, target: `#${id}` });
  }) as { [K in keyof T]: GuideStep };

export interface Setup {
  events: GuideEvent[];
  fake: FakeDriver;
  manager: GuideManager;
}

export const setup = async (
  options: Partial<CreateGuideManagerOptions> & {
    guides: CreateGuideManagerOptions["guides"];
    fake?: FakeDriver;
  }
): Promise<Setup> => {
  const fake = options.fake ?? createFakeDriver();
  const events: GuideEvent[] = [];
  const manager = createGuideManager({
    storage: memoryAdapter(),
    driver: fake.driver,
    onEvent: (event) => events.push(event),
    ...options,
  });
  await flush();
  return { manager, fake, events };
};

export const runOf = (manager: GuideManager, guideId: string) =>
  manager.getState().runs.find((run) => run.guide.id === guideId) ?? null;

export const eventsOf = <T extends GuideEvent["type"]>(
  events: GuideEvent[],
  type: T
) =>
  events.filter(
    (event): event is GuideEvent & { type: T } => event.type === type
  );
