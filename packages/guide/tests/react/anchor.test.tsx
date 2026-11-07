// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { createContext, type ReactNode, use } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  type FrameContext,
  GuideFrame,
  GuideRoot,
  type UseGuideAnchorOptions,
  useGuideAnchor,
  type WithGuideContext,
} from "../../src/react/index.js";
import { createGuideStep } from "../../src/step.js";
import type { GuideManager, GuideStep, HookContext } from "../../src/types.js";
import {
  createManager,
  FLOATING,
  RECT,
  rectAttr,
  runOf,
  settle,
  tour,
  warned,
} from "./helpers.js";

const a = createGuideStep({ id: "a" });
const b = createGuideStep({ id: "b" });

const Frame = () => (
  <GuideFrame>
    {(frame: FrameContext) => (
      <section
        {...frame.floatingProps}
        data-rect={rectAttr(FLOATING)}
        data-testid={`frame-${frame.guide.id}`}
      >
        <frame.Content />
      </section>
    )}
  </GuideFrame>
);

interface TargetProps {
  children?: ReactNode;
  options?: UseGuideAnchorOptions;
  rect?: string;
  step?: GuideStep;
}

/** A target element anchored on `step` (default `a`). */
const Target = ({ step = a, options, rect, children }: TargetProps) => {
  const { ref, portal } = useGuideAnchor(step, options);
  return (
    <div>
      <button
        data-rect={rect ?? rectAttr(RECT)}
        data-testid={`target-${step.id}`}
        ref={ref}
        type="button"
      >
        {step.id}
      </button>
      {children}
      {portal}
    </div>
  );
};

const Hello = ({ ctx }: WithGuideContext) => (
  <p id={ctx.ids.title}>
    {`hello ${ctx.step.id} ${ctx.index + 1}/${ctx.total}`}
  </p>
);

const App = ({
  manager,
  children,
}: {
  manager: GuideManager;
  children: ReactNode;
}) => (
  <GuideRoot manager={manager}>
    {children}
    <Frame />
  </GuideRoot>
);

const start = async (manager: GuideManager, guideId = "tour") => {
  act(() => {
    manager.start(guideId);
  });
  await settle();
};

describe("useGuideAnchor: content", () => {
  it("renders the content component with its context in the Frame", async () => {
    const { manager } = await createManager({ guides: [tour([a])] });
    render(
      <App manager={manager}>
        <Target options={{ content: Hello }} />
      </App>
    );
    await start(manager);
    const frame = screen.getByTestId("frame-tour");
    expect(frame.textContent).toBe("hello a 1/1");
    expect(frame.getAttribute("aria-labelledby")).toBe(
      frame.querySelector("p")?.id
    );
  });

  it("waits for the content: the step is not active before it registers", async () => {
    const { manager } = await createManager({ guides: [tour([a])] });
    const unregister = manager.registerAnchor(
      "a",
      (() => {
        const element = document.createElement("div");
        element.setAttribute("data-rect", rectAttr(RECT));
        document.body.append(element);
        return element;
      })(),
      { content: true }
    );
    render(<App manager={manager}>{null}</App>);
    await start(manager);
    expect(runOf(manager, "tour")?.status).toBe("transitioning");
    unregister();
    const view = render(
      <GuideRoot manager={manager}>
        <Target options={{ content: Hello }} />
      </GuideRoot>
    );
    await settle();
    expect(runOf(manager, "tour")?.status).toBe("active");
    view.unmount();
  });
});

describe("useGuideAnchor: render", () => {
  it("calls render with the context and keeps the latest version while active", async () => {
    const { manager } = await createManager({ guides: [tour([a, b])] });
    const Counter = ({ count }: { count: number }) => (
      <Target
        options={{
          render: (ctx) => <p>{`${ctx.step.id} count ${count}`}</p>,
        }}
      />
    );
    const view = render(
      <App manager={manager}>
        <Counter count={1} />
        <Target options={{ content: Hello }} step={b} />
      </App>
    );
    await start(manager);
    expect(screen.getByTestId("frame-tour").textContent).toBe("a count 1");
    view.rerender(
      <App manager={manager}>
        <Counter count={2} />
        <Target options={{ content: Hello }} step={b} />
      </App>
    );
    expect(screen.getByTestId("frame-tour").textContent).toBe("a count 2");
  });

  it("does not reach the Frame while its step is not active", async () => {
    const { manager } = await createManager({ guides: [tour([a, b])] });
    const renderB = vi.fn(() => <p>b</p>);
    const view = render(
      <App manager={manager}>
        <Target options={{ content: Hello }} />
        <Target options={{ render: renderB }} step={b} />
      </App>
    );
    await start(manager);
    view.rerender(
      <App manager={manager}>
        <Target options={{ content: Hello }} />
        <Target options={{ render: () => renderB() }} step={b} />
      </App>
    );
    expect(renderB).not.toHaveBeenCalled();
    expect(screen.getByTestId("frame-tour").textContent).toBe("hello a 1/2");
  });
});

describe("useGuideAnchor: portal", () => {
  const Local = createContext("outside");
  const LocalHint = ({ ctx }: WithGuideContext) => (
    <p>{`${use(Local)} ${ctx.step.id}`}</p>
  );

  it("renders the content locally and portals it into the Frame outlet", async () => {
    const { manager } = await createManager({ guides: [tour([a])] });
    const portals: ReactNode[] = [];
    const Anchored = () => {
      const { ref, portal } = useGuideAnchor(a, {
        portal: true,
        content: LocalHint,
      });
      portals.push(portal);
      return (
        <>
          <input data-rect={rectAttr(RECT)} ref={ref} />
          {portal}
        </>
      );
    };
    render(
      <App manager={manager}>
        <Local value="inside">
          <Anchored />
        </Local>
      </App>
    );
    expect(portals.at(-1)).toBeNull();
    await start(manager);
    const outlet = screen
      .getByTestId("frame-tour")
      .querySelector("[data-guide-outlet]");
    expect(outlet?.textContent).toBe("inside a");
    expect(portals.at(-1)).not.toBeNull();
    expect(warned("is not rendered")).toBe(false);

    act(() => {
      manager.end("tour");
    });
    await settle();
    expect(portals.at(-1)).toBeNull();
  });

  it("supports render in portal mode", async () => {
    const { manager } = await createManager({ guides: [tour([a])] });
    render(
      <App manager={manager}>
        <Local value="inside">
          <Target
            options={{
              portal: true,
              render: (ctx) => <LocalHint ctx={ctx} />,
            }}
          />
        </Local>
      </App>
    );
    await start(manager);
    expect(
      screen.getByTestId("frame-tour").querySelector("[data-guide-outlet]")
        ?.textContent
    ).toBe("inside a");
  });
});

describe("useGuideAnchor: anchors", () => {
  it("registers every element the ref is set on", async () => {
    const { manager } = await createManager({ guides: [tour([a])] });
    const Double = ({ both }: { both: boolean }) => {
      const { ref } = useGuideAnchor(a, { content: Hello });
      return (
        <>
          <span data-rect={rectAttr(RECT)} ref={ref} />
          {both ? (
            <span data-rect={rectAttr({ ...RECT, y: 400 })} ref={ref} />
          ) : null}
        </>
      );
    };
    const view = render(
      <App manager={manager}>
        <Double both />
      </App>
    );
    await start(manager);
    expect(manager.getLayout("tour")?.rects).toEqual([
      RECT,
      { ...RECT, y: 400 },
    ]);
    view.rerender(
      <App manager={manager}>
        <Double both={false} />
      </App>
    );
    await settle();
    expect(manager.getLayout("tour")?.rects).toEqual([RECT]);
  });

  it("registers only the anchor without content (empty outlet)", async () => {
    const { manager } = await createManager({ guides: [tour([a])] });
    render(
      <App manager={manager}>
        <Target />
      </App>
    );
    await start(manager);
    expect(runOf(manager, "tour")?.status).toBe("active");
    expect(screen.getByTestId("frame-tour").textContent).toBe("");
    expect(warned('Step "a" is active without content')).toBe(true);
  });

  it("registers nothing while disabled", async () => {
    const { manager } = await createManager({ guides: [tour([a])] });
    const beforeEnter = vi.fn();
    const Toggle = ({ enabled }: { enabled: boolean }) => (
      <Target
        options={{ content: Hello, enabled, lifecycle: { beforeEnter } }}
      />
    );
    const view = render(
      <App manager={manager}>
        <Toggle enabled={false} />
      </App>
    );
    await start(manager);
    expect(runOf(manager, "tour")?.status).toBe("transitioning");
    expect(manager.getContent("a")).toBeUndefined();
    view.rerender(
      <App manager={manager}>
        <Toggle enabled />
      </App>
    );
    await settle();
    expect(runOf(manager, "tour")?.status).toBe("active");
    expect(beforeEnter).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("frame-tour").textContent).toBe("hello a 1/1");
  });
});

describe("useGuideAnchor: lifecycle", () => {
  it("registers local hooks and calls their latest version", async () => {
    const { manager } = await createManager({ guides: [tour([a, b])] });
    const calls: string[] = [];
    const hook =
      (name: string) =>
      ({ from, to, direction }: HookContext) => {
        calls.push(`${name} ${from?.id ?? "-"}>${to.id} ${direction}`);
      };
    const Hooked = ({ version }: { version: number }) => (
      <Target
        options={{
          content: Hello,
          lifecycle: {
            beforeEnter: hook(`v${version}.beforeEnter`),
            afterEnter: hook(`v${version}.afterEnter`),
            beforeLeave: hook(`v${version}.beforeLeave`),
            afterLeave: hook(`v${version}.afterLeave`),
          },
        }}
      />
    );
    const view = render(
      <App manager={manager}>
        <Hooked version={1} />
        <Target options={{ content: Hello }} step={b} />
      </App>
    );
    await start(manager);
    view.rerender(
      <App manager={manager}>
        <Hooked version={2} />
        <Target options={{ content: Hello }} step={b} />
      </App>
    );
    act(() => {
      manager.next("tour");
    });
    await settle();
    expect(calls).toEqual([
      "v1.beforeEnter ->a forward",
      "v1.afterEnter ->a forward",
      "v2.beforeLeave a>b forward",
      "v2.afterLeave a>b forward",
    ]);
  });

  it("re-registers when the set of hooks changes, and unregisters on unmount", async () => {
    const { manager } = await createManager({ guides: [tour([a])] });
    const register = vi.spyOn(manager, "registerLifecycle");
    const afterEnter = vi.fn();
    const view = render(
      <GuideRoot manager={manager}>
        <Target options={{ lifecycle: { beforeEnter: vi.fn() } }} />
      </GuideRoot>
    );
    view.rerender(
      <GuideRoot manager={manager}>
        <Target options={{ lifecycle: { beforeEnter: vi.fn() } }} />
      </GuideRoot>
    );
    expect(register).toHaveBeenCalledTimes(1);
    view.rerender(
      <GuideRoot manager={manager}>
        <Target options={{ lifecycle: { afterEnter } }} />
      </GuideRoot>
    );
    expect(register).toHaveBeenCalledTimes(2);
    expect(Object.keys(register.mock.calls[1]?.[1] ?? {})).toEqual([
      "afterEnter",
    ]);
    view.rerender(
      <GuideRoot manager={manager}>
        <Target options={{ lifecycle: {} }} />
      </GuideRoot>
    );
    await start(manager);
    expect(afterEnter).not.toHaveBeenCalled();
  });
});
