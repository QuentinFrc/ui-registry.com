// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  GuideFrame,
  GuideRoot,
  type UseGuideAnchorOptions,
  useGuideAnchor,
  type WithGuideContext,
} from "../../src/react/index.js";
import { createGuideStep } from "../../src/step.js";
import type { GuideManager } from "../../src/types.js";
import {
  createManager,
  RECT,
  rectAttr,
  settle,
  tour,
  warned,
} from "./helpers.js";

const a = createGuideStep({ id: "a" });

const Target = ({
  options,
  renderPortal = true,
}: {
  options: UseGuideAnchorOptions;
  renderPortal?: boolean;
}) => {
  const { ref, portal } = useGuideAnchor(a, options);
  return (
    <>
      <span data-rect={rectAttr(RECT)} ref={ref} />
      {renderPortal ? portal : null}
    </>
  );
};

const App = ({
  manager,
  children,
}: {
  manager: GuideManager;
  children: ReactNode;
}) => (
  <GuideRoot manager={manager}>
    {children}
    <GuideFrame>
      {(frame) => (
        <div {...frame.floatingProps}>
          <frame.Content />
        </div>
      )}
    </GuideFrame>
  </GuideRoot>
);

const start = async (manager: GuideManager) => {
  act(() => {
    manager.start("tour");
  });
  await settle();
};

describe("dev warnings", () => {
  it("warns when content changes identity while its step is active", async () => {
    const { manager } = await createManager({ guides: [tour([a])] });
    const make = (label: string) => () => <p>{label}</p>;
    const First = make("first");
    const view = render(
      <App manager={manager}>
        <Target options={{ content: First }} />
      </App>
    );
    view.rerender(
      <App manager={manager}>
        <Target options={{ content: make("inactive") }} />
      </App>
    );
    expect(warned("changed identity")).toBe(false);
    await start(manager);
    view.rerender(
      <App manager={manager}>
        <Target options={{ content: make("second") }} />
      </App>
    );
    expect(warned("changed identity")).toBe(true);
    // The latest content is still shown.
    expect(document.body.textContent).toContain("second");
  });

  it("warns when the portal is not rendered while its step is active", async () => {
    const { manager } = await createManager({ guides: [tour([a])] });
    const Hint = ({ ctx }: WithGuideContext) => <p>{ctx.step.id}</p>;
    render(
      <App manager={manager}>
        <Target
          options={{ portal: true, content: Hint }}
          renderPortal={false}
        />
      </App>
    );
    await start(manager);
    expect(warned("the returned `portal` is not rendered")).toBe(true);
  });

  it("warns when the step is active without content", async () => {
    const { manager } = await createManager({ guides: [tour([a])] });
    render(
      <App manager={manager}>
        <Target options={{}} />
      </App>
    );
    await start(manager);
    expect(warned('Step "a" is active without content')).toBe(true);
  });

  it("stays silent in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { manager } = await createManager({ guides: [tour([a])] });
    render(
      <App manager={manager}>
        <Target options={{}} />
      </App>
    );
    await start(manager);
    expect(console.warn).not.toHaveBeenCalled();
  });
});
