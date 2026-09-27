// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { defineGuide } from "../../src/guide.js";
import {
  type FrameContext,
  GuideFrame,
  type GuideFrameProps,
  GuideRoot,
  useGuideAnchor,
  type WithGuideContext,
} from "../../src/react/index.js";
import { createGuideStep } from "../../src/step.js";
import type { GuideManager, GuideStep, Rect } from "../../src/types.js";
import {
  createManager,
  FLOATING,
  observers,
  RECT,
  rectAttr,
  runOf,
  settle,
  tour,
} from "./helpers.js";

const a = createGuideStep({ id: "a" });
const b = createGuideStep({ id: "b" });

const Title = ({ ctx }: WithGuideContext) => (
  <h2 id={ctx.ids.title}>{`${ctx.guide.id}:${ctx.step.id}`}</h2>
);

const Target = ({ step, rect = RECT }: { step: GuideStep; rect?: Rect }) => {
  const { ref } = useGuideAnchor(step, { content: Title });
  return (
    <button data-rect={rectAttr(rect)} ref={ref} type="button">
      {step.id}
    </button>
  );
};

const frames: FrameContext[] = [];

const Frame = (props: Omit<GuideFrameProps, "children">) => (
  <GuideFrame {...props}>
    {(frame) => {
      frames.push(frame);
      return (
        <section
          {...frame.floatingProps}
          data-rect={rectAttr(FLOATING)}
          data-testid={`frame-${frame.guide.id}`}
        >
          <frame.Content />
          <footer>{`${frame.index + 1}/${frame.total}`}</footer>
        </section>
      );
    }}
  </GuideFrame>
);

const App = ({
  manager,
  children,
}: {
  manager: GuideManager;
  children?: ReactNode;
}) => <GuideRoot manager={manager}>{children}</GuideRoot>;

const start = async (manager: GuideManager, guideId = "tour") => {
  act(() => {
    manager.start(guideId);
  });
  await settle();
};

const hint = (steps: GuideStep[]) =>
  defineGuide({ id: "hint", mode: "passive", steps });

describe("GuideFrame", () => {
  it("renders nothing without an active run", async () => {
    const { manager } = await createManager({ guides: [tour([a])] });
    const { container } = render(
      <App manager={manager}>
        <Frame />
      </App>
    );
    expect(container.innerHTML).toBe("");
    act(() => {
      manager.start("tour");
    });
    // Transitioning (no target yet): hidden.
    expect(container.innerHTML).toBe("");
  });

  it("renders one Frame per active run, and hides suspended runs by default", async () => {
    const { manager } = await createManager({
      guides: [tour([a]), hint([b])],
    });
    render(
      <App manager={manager}>
        <Target step={a} />
        <Target step={b} />
        <Frame />
      </App>
    );
    await start(manager, "hint");
    expect(screen.getByTestId("frame-hint").textContent).toBe("hint:b1/1");
    await start(manager);
    expect(runOf(manager, "hint")?.status).toBe("suspended");
    expect(screen.queryByTestId("frame-hint")).toBeNull();
    expect(screen.getByTestId("frame-tour").textContent).toBe("tour:a1/1");
    act(() => {
      manager.end("tour");
    });
    await settle();
    expect(screen.getByTestId("frame-hint")).toBeDefined();
  });

  it("narrows the runs with select", async () => {
    const { manager } = await createManager({
      guides: [tour([a]), hint([b])],
    });
    render(
      <App manager={manager}>
        <Target step={a} />
        <Target step={b} />
        <Frame select={(run) => run.guide.mode === "passive"} />
      </App>
    );
    await start(manager);
    expect(screen.queryByTestId("frame-tour")).toBeNull();
    await start(manager, "hint");
    expect(runOf(manager, "hint")?.status).toBe("suspended");
    expect(screen.queryByTestId("frame-hint")).toBeNull();
    act(() => {
      manager.end("tour");
    });
    await settle();
    expect(screen.getByTestId("frame-hint").getAttribute("data-mode")).toBe(
      "passive"
    );
  });

  it("portals the Frames into a container", async () => {
    const { manager } = await createManager({ guides: [tour([a])] });
    const container = document.createElement("div");
    document.body.append(container);
    render(
      <App manager={manager}>
        <Target step={a} />
        <Frame container={container} />
      </App>
    );
    await start(manager);
    expect(
      container.querySelector("[data-testid='frame-tour']")
    ).not.toBeNull();
  });

  it("is placed after the first measure, with its floating props", async () => {
    frames.length = 0;
    const { manager } = await createManager({ guides: [tour([a])] });
    render(
      <App manager={manager}>
        <Target step={a} />
        <Frame />
      </App>
    );
    await start(manager);
    expect(frames[0]?.placed).toBe(false);
    expect(frames[0]?.floatingProps.style).toEqual({
      position: "fixed",
      top: 0,
      left: 0,
      visibility: "hidden",
    });
    const frame = frames.at(-1) as FrameContext;
    expect(frame.placed).toBe(true);
    const { ref: _ref, ...props } = frame.floatingProps;
    expect(props).toEqual({
      // Centered below the target: x = 100 + (200 - 120) / 2, y = 100 + 40 + 16.
      style: { position: "fixed", top: 156, left: 140 },
      role: "dialog",
      "aria-modal": true,
      "aria-labelledby": frame.ids.title,
      "aria-describedby": frame.ids.description,
      "data-side": "bottom",
      "data-align": "center",
      "data-mode": "modal",
      tabIndex: -1,
    });
    expect(frame).toMatchObject({
      index: 0,
      total: 1,
      isFirst: true,
      isLast: true,
      mode: "modal",
      dismissible: true,
      run: runOf(manager, "tour"),
    });
    const element = screen.getByTestId("frame-tour");
    expect(element.style.top).toBe("156px");
    expect(element.getAttribute("aria-labelledby")).toBe(
      element.querySelector("h2")?.id
    );
  });

  it("exposes the effective side and follows the layout and its own size", async () => {
    const { manager } = await createManager({ guides: [tour([a])] });
    render(
      <App manager={manager}>
        <Target rect={{ ...RECT, y: 740 }} step={a} />
        <Frame />
      </App>
    );
    await start(manager);
    const element = screen.getByTestId("frame-tour");
    // No room below the (padded) spotlight: falls back on top.
    expect(element.getAttribute("data-side")).toBe("top");
    expect(element.style.top).toBe(`${740 - 16 - FLOATING.height}px`);

    element.setAttribute(
      "data-rect",
      rectAttr({ ...FLOATING, height: FLOATING.height * 2 })
    );
    act(() => {
      for (const observer of observers.resize) {
        if (observer.targets.has(element)) {
          observer.trigger();
        }
      }
    });
    expect(element.style.top).toBe(`${740 - 16 - FLOATING.height * 2}px`);
  });

  it("is placed from its layout size, not from its transformed rect", async () => {
    const { manager } = await createManager({ guides: [tour([a])] });
    const measure = Element.prototype.getBoundingClientRect;
    // An entry animation scaling the Frame in: its rect is half its size.
    vi.mocked(measure).mockImplementation(function (this: Element) {
      const [x = 0, y = 0, width = 0, height = 0] = (
        this.getAttribute("data-rect") ?? ""
      )
        .split(",")
        .map(Number);
      const scale = this.getAttribute("role") === "dialog" ? 0.5 : 1;
      return {
        x,
        y,
        left: x,
        top: y,
        width: width * scale,
        height: height * scale,
        right: x + width * scale,
        bottom: y + height * scale,
        toJSON: () => ({}),
      } as DOMRect;
    });
    render(
      <App manager={manager}>
        <Target step={a} />
        <Frame />
      </App>
    );
    await start(manager);
    // Centered on the target with its full width: 100 + (200 - 120) / 2.
    expect(screen.getByTestId("frame-tour").style.left).toBe("140px");
  });

  it("follows a floating element replaced while its step is active", async () => {
    const { manager } = await createManager({ guides: [hint([b])] });
    const Swapping = ({ variant }: { variant: string }) => (
      <GuideFrame>
        {(frame) => (
          <section
            {...frame.floatingProps}
            data-rect={rectAttr(
              variant === "wide" ? { ...FLOATING, width: 200 } : FLOATING
            )}
            data-testid={`frame-${variant}`}
            key={variant}
          />
        )}
      </GuideFrame>
    );
    const view = render(
      <App manager={manager}>
        <Target step={b} />
        <Swapping variant="narrow" />
      </App>
    );
    await start(manager, "hint");
    expect(screen.getByTestId("frame-narrow").style.left).toBe("140px");
    view.rerender(
      <App manager={manager}>
        <Target step={b} />
        <Swapping variant="wide" />
      </App>
    );
    const wide = screen.getByTestId("frame-wide");
    // Re-measured: 100 + (200 - 200) / 2.
    expect(wide.style.left).toBe("100px");
    // Registered as the run's Frame: Escape inside it ends the run.
    fireEvent.keyDown(wide, { key: "Escape" });
    await settle();
    expect(runOf(manager, "hint")).toBeNull();
  });

  it("works without ResizeObserver", async () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const { manager } = await createManager({ guides: [tour([a])] });
    render(
      <App manager={manager}>
        <Target step={a} />
        <Frame />
      </App>
    );
    await start(manager);
    expect(screen.getByTestId("frame-tour").style.visibility).toBe("");
  });

  it("drives the run from the context", async () => {
    const { manager } = await createManager({ guides: [tour([a, b])] });
    const Controls = () => (
      <GuideFrame>
        {(frame) => (
          <div {...frame.floatingProps}>
            <button onClick={frame.prev} type="button">
              prev
            </button>
            <button onClick={frame.next} type="button">
              next
            </button>
            <button onClick={() => frame.end("completed")} type="button">
              done
            </button>
            <span>{`${frame.isFirst}/${frame.isLast}`}</span>
          </div>
        )}
      </GuideFrame>
    );
    render(
      <App manager={manager}>
        <Target step={a} />
        <Target step={b} />
        <Controls />
      </App>
    );
    await start(manager);
    expect(screen.getByText("true/false")).toBeDefined();
    fireEvent.click(screen.getByText("next"));
    await settle();
    expect(screen.getByText("false/true")).toBeDefined();
    fireEvent.click(screen.getByText("prev"));
    await settle();
    expect(runOf(manager, "tour")?.step?.id).toBe("a");
    fireEvent.click(screen.getByText("done"));
    await settle();
    expect(runOf(manager, "tour")).toBeNull();
    expect(manager.getState().records.tour?.status).toBe("completed");
  });

  it("throws when frame.Content is rendered outside of its Frame", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    frames.length = 0;
    const { manager } = await createManager({ guides: [tour([a])] });
    render(
      <App manager={manager}>
        <Target step={a} />
        <Frame />
      </App>
    );
    await start(manager);
    const Content = frames.at(-1)?.Content as ComponentType;
    expect(() =>
      render(
        <App manager={manager}>
          <Content />
        </App>
      )
    ).toThrow("frame.Content must be rendered within <GuideFrame>.");
  });
});

describe("GuideFrame: focus", () => {
  it("takes the focus in modal and gives it back at the end", async () => {
    const { manager } = await createManager({ guides: [tour([a, b])] });
    render(
      <App manager={manager}>
        <input data-testid="field" />
        <Target step={a} />
        <Target step={b} />
        <Frame />
      </App>
    );
    const field = screen.getByTestId("field");
    field.focus();
    await start(manager);
    expect(document.activeElement).toBe(screen.getByTestId("frame-tour"));
    field.focus();
    act(() => {
      manager.next("tour");
    });
    await settle();
    expect(document.activeElement).toBe(screen.getByTestId("frame-tour"));
    act(() => {
      manager.end("tour");
    });
    await settle();
    expect(document.activeElement).toBe(field);
  });

  it("never steals the focus in passive; Escape inside its Frame ends it", async () => {
    const { manager } = await createManager({ guides: [hint([b])] });
    render(
      <App manager={manager}>
        <input data-testid="field" />
        <Target step={b} />
        <Frame />
      </App>
    );
    const field = screen.getByTestId("field");
    field.focus();
    await start(manager, "hint");
    const frame = screen.getByTestId("frame-hint");
    expect(frame.getAttribute("aria-modal")).toBe("false");
    expect(document.activeElement).toBe(field);
    fireEvent.keyDown(field, { key: "Escape" });
    await settle();
    expect(runOf(manager, "hint")).not.toBeNull();
    fireEvent.keyDown(frame, { key: "Escape" });
    await settle();
    expect(runOf(manager, "hint")).toBeNull();
  });
});
