import { act, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, vi } from "vitest";
import { defineGuide } from "../../src/guide.js";
import {
  type CreateGuideManagerOptions,
  createGuideManager,
} from "../../src/manager.js";
import { GuideRoot } from "../../src/react/index.js";
import { memoryAdapter } from "../../src/storage.js";
import type { GuideEvent, GuideManager, Rect } from "../../src/types.js";
import { installFrames, installObservers, setViewport } from "../dom-fakes.js";
import { flush } from "../helpers.js";

export const RECT: Rect = { x: 100, y: 100, width: 200, height: 40 };
export const FLOATING: Rect = { x: 0, y: 0, width: 120, height: 60 };

/** `data-rect="x,y,width,height"`, read by the stubbed `getBoundingClientRect`. */
export const rectAttr = ({ x, y, width, height }: Rect): string =>
  `${x},${y},${width},${height}`;

const readRect = (element: Element): Rect => {
  const [x = 0, y = 0, width = 0, height = 0] = (
    element.getAttribute("data-rect") ?? ""
  )
    .split(",")
    .map(Number);
  return { x, y, width, height };
};

const managers: GuideManager[] = [];
export let observers: ReturnType<typeof installObservers>;
export let frames: ReturnType<typeof installFrames>;

beforeEach(() => {
  setViewport(1000, 800);
  frames = installFrames();
  observers = installObservers();
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const { x, y, width, height } = readRect(this);
      return {
        x,
        y,
        left: x,
        top: y,
        width,
        height,
        right: x + width,
        bottom: y + height,
        toJSON: () => ({}),
      } as DOMRect;
    }
  );
});

afterEach(() => {
  cleanup();
  for (const manager of managers.splice(0)) {
    manager.destroy();
  }
  document.body.innerHTML = "";
});

/** Lets the manager's transitions settle, inside `act`. */
export const settle = async (rounds = 6): Promise<void> => {
  await act(async () => {
    await flush(rounds);
  });
};

export const createManager = async (
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

export const tour = (
  steps: Parameters<typeof defineGuide>[0]["steps"],
  extra: Partial<Parameters<typeof defineGuide>[0]> = {}
) => defineGuide({ id: "tour", steps, ...extra });

export const wrapper =
  (manager: GuideManager) =>
  ({ children }: { children?: ReactNode }) => (
    <GuideRoot manager={manager}>{children}</GuideRoot>
  );

export const runOf = (manager: GuideManager, guideId: string) =>
  manager.getState().runs.find((run) => run.guide.id === guideId) ?? null;

export const warned = (fragment: string): boolean =>
  vi
    .mocked(console.warn)
    .mock.calls.some((call) => String(call[0]).includes(fragment));
