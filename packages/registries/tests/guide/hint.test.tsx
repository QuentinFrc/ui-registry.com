import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  createGuideManager,
  createGuideStep,
  defineGuide,
  type GuideManager,
  type GuideStep,
  memoryAdapter,
  type Rect,
} from "@ui-registry/guide";
import {
  GuideRoot,
  useGuideAnchor,
  type WithGuideContext,
} from "@ui-registry/guide/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Hint,
  HintDescription,
  HintTitle,
} from "../../guide/registry/base-nova/guide/hint";

const SMALL: Rect = { x: 100, y: 100, width: 40, height: 20 };
const LARGE: Rect = { x: 300, y: 200, width: 200, height: 40 };
const POPOVER: Rect = { x: 0, y: 0, width: 240, height: 120 };

const rectAttr = ({ x, y, width, height }: Rect) =>
  `${x},${y},${width},${height}`;

const readRect = (element: Element): Rect => {
  // The popover is measured like the targets.
  if (element.getAttribute("data-slot") === "hint-popover") {
    return POPOVER;
  }
  const [x = 0, y = 0, width = 0, height = 0] = (
    element.getAttribute("data-rect") ?? ""
  )
    .split(",")
    .map(Number);
  return { x, y, width, height };
};

class NoopObserver {
  observe() {
    // Layout is read from `data-rect`; nothing to observe.
  }
  unobserve() {
    // See `observe`.
  }
  disconnect() {
    // See `observe`.
  }
}

const managers: GuideManager[] = [];

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", NoopObserver);
  vi.stubGlobal("IntersectionObserver", NoopObserver);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 0)
  );
  vi.stubGlobal("cancelAnimationFrame", (handle: number) =>
    clearTimeout(handle)
  );
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
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
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(
    function (this: HTMLElement) {
      return readRect(this).width;
    }
  );
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      return readRect(this).height;
    }
  );
});

afterEach(() => {
  cleanup();
  for (const manager of managers.splice(0)) {
    manager.destroy();
  }
});

/** Lets the manager's transitions and the layout frames settle. */
const settle = async () => {
  await act(async () => {
    for (let round = 0; round < 10; round += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
};

const first = createGuideStep({ id: "hint.first" });
const second = createGuideStep({ id: "hint.second" });
const tourStep = createGuideStep({ id: "tour.only" });

const Content = ({ ctx }: WithGuideContext) => (
  <>
    <HintTitle ctx={ctx}>{`Title ${ctx.step.id}`}</HintTitle>
    <HintDescription ctx={ctx}>{`About ${ctx.step.id}`}</HintDescription>
  </>
);

const Target = ({ step, rect }: { step: GuideStep; rect: Rect }) => {
  const { ref } = useGuideAnchor(step, { content: Content });
  return (
    <button data-rect={rectAttr(rect)} ref={ref} type="button">
      {`target ${step.id}`}
    </button>
  );
};

const setup = async ({
  steps = [first],
  dismissible,
  children,
}: {
  steps?: GuideStep[];
  dismissible?: boolean;
  children?: ReactNode;
} = {}) => {
  const storage = memoryAdapter();
  const manager = createGuideManager({
    storage,
    guides: [
      defineGuide({ id: "hint", mode: "passive", steps, dismissible }),
      defineGuide({ id: "tour", steps: [tourStep] }),
    ],
  });
  managers.push(manager);
  render(
    <GuideRoot manager={manager}>
      <Target rect={LARGE} step={first} />
      <Target rect={SMALL} step={first} />
      <Target rect={SMALL} step={second} />
      <Target rect={SMALL} step={tourStep} />
      {children}
      <Hint />
    </GuideRoot>
  );
  await settle();
  act(() => {
    manager.start("hint");
  });
  await settle();
  return { manager, storage };
};

const beacon = () => screen.getByRole("button", { name: "Show tip" });
const popover = () => screen.queryByRole("dialog");

/** Opens the popover and lets it be measured and placed. */
const open = async () => {
  fireEvent.click(beacon());
  await settle();
};

describe("Hint", () => {
  it("draws a beacon on the largest target without taking the focus", async () => {
    await setup();
    const button = beacon();
    expect(button.style.position).toBe("fixed");
    // Top-right corner of the largest target.
    expect(button.style.top).toBe(`${LARGE.y}px`);
    expect(button.style.left).toBe(`${LARGE.x + LARGE.width}px`);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    expect(button.hasAttribute("aria-controls")).toBe(false);
    expect(popover()).toBeNull();
    expect(document.activeElement).toBe(document.body);
  });

  it("opens the step's content in a popover on click, focused and labelled", async () => {
    await setup();
    await open();
    const dialog = popover() as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(beacon().getAttribute("aria-expanded")).toBe("true");
    expect(beacon().getAttribute("aria-controls")).toBe(dialog.id);
    expect(dialog.getAttribute("aria-modal")).toBe("false");
    expect(dialog.getAttribute("data-mode")).toBe("passive");
    expect(
      document.getElementById(dialog.getAttribute("aria-labelledby") ?? "")
        ?.textContent
    ).toBe("Title hint.first");
    expect(
      document.getElementById(dialog.getAttribute("aria-describedby") ?? "")
        ?.textContent
    ).toBe("About hint.first");
    expect(dialog.style.visibility).toBe("");
    expect(document.activeElement).toBe(dialog);
    // A single step: no counter, Got it.
    expect(screen.queryByText("1/1")).toBeNull();
    expect(screen.getByRole("button", { name: "Got it" })).toBeDefined();
  });

  it("closes the popover on a second click or a press outside, keeping the run", async () => {
    const { manager } = await setup();
    await open();
    fireEvent.click(beacon());
    await settle();
    expect(popover()).toBeNull();

    await open();
    fireEvent.pointerDown(popover() as HTMLElement);
    expect(popover()).not.toBeNull();
    fireEvent.pointerDown(document.body);
    await settle();
    expect(popover()).toBeNull();
    expect(beacon().getAttribute("aria-expanded")).toBe("false");
    expect(manager.getState().runs).toHaveLength(1);
  });

  it("keeps the popover open and focused on the next step, then completes", async () => {
    const { manager, storage } = await setup({ steps: [first, second] });
    await open();
    expect(screen.getByText("1/2")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await settle();

    const dialog = popover() as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(screen.getByText("Title hint.second")).toBeDefined();
    expect(screen.getByText("2/2")).toBeDefined();
    expect(document.activeElement).toBe(dialog);
    expect(beacon().style.left).toBe(`${SMALL.x + SMALL.width}px`);

    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    await settle();
    expect(manager.getState().runs).toHaveLength(0);
    expect(await storage.get("hint")).toMatchObject({ status: "completed" });
  });

  it("dismisses with the close button", async () => {
    const { manager, storage } = await setup();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss tip" }));
    await settle();
    expect(manager.getState().runs).toHaveLength(0);
    expect(await storage.get("hint")).toMatchObject({
      status: "dismissed",
      stepId: "hint.first",
    });
  });

  it("dismisses with Escape in the popover or on the beacon", async () => {
    const inPopover = await setup();
    await open();
    fireEvent.keyDown(popover() as HTMLElement, { key: "Escape" });
    await settle();
    expect(inPopover.manager.getState().runs).toHaveLength(0);
    cleanup();

    const onBeacon = await setup();
    fireEvent.keyDown(beacon(), { key: "Escape" });
    await settle();
    expect(onBeacon.manager.getState().runs).toHaveLength(0);
    expect(await onBeacon.storage.get("hint")).toMatchObject({
      status: "dismissed",
    });
  });

  it("ignores Escape outside the hint", async () => {
    const { manager } = await setup();
    fireEvent.keyDown(document.body, { key: "Escape" });
    await settle();
    expect(manager.getState().runs).toHaveLength(1);
  });

  it("hides the close button and ignores Escape when not dismissible", async () => {
    const { manager } = await setup({ dismissible: false });
    fireEvent.keyDown(beacon(), { key: "Escape" });
    await open();
    expect(screen.queryByRole("button", { name: "Dismiss tip" })).toBeNull();
    fireEvent.keyDown(popover() as HTMLElement, { key: "Escape" });
    await settle();
    expect(manager.getState().runs).toHaveLength(1);
  });

  it("is hidden during a modal run and comes back closed, without taking the focus", async () => {
    const { manager } = await setup();
    await open();
    act(() => {
      manager.start("tour");
    });
    await settle();
    expect(screen.queryByRole("button", { name: "Show tip" })).toBeNull();
    expect(popover()).toBeNull();

    act(() => {
      manager.end("tour", "completed");
    });
    await settle();
    expect(beacon().getAttribute("aria-expanded")).toBe("false");
    expect(popover()).toBeNull();
    expect(document.activeElement).not.toBe(beacon());
  });

  it("takes labels and classes", async () => {
    const manager = createGuideManager({
      storage: memoryAdapter(),
      guides: [defineGuide({ id: "hint", mode: "passive", steps: [first] })],
    });
    managers.push(manager);
    render(
      <GuideRoot manager={manager}>
        <Target rect={LARGE} step={first} />
        <Hint beaconClassName="beacon-extra" labels={{ open: "Voir" }} />
      </GuideRoot>
    );
    await settle();
    act(() => {
      manager.start("hint");
    });
    await settle();
    const button = screen.getByRole("button", { name: "Voir" });
    expect(button.className).toContain("beacon-extra");
  });
});
