// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { createContext, StrictMode, use } from "react";
import { describe, expect, it } from "vitest";
import {
  GuideFrame,
  GuideRoot,
  useGuideAnchor,
  type WithGuideContext,
} from "../../src/react/index.js";
import { createGuideStep } from "../../src/step.js";
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
const Local = createContext("outside");

const Hint = ({ ctx }: WithGuideContext) => (
  <p id={ctx.ids.title}>{`${use(Local)} ${ctx.step.id}`}</p>
);

const Target = ({ step, portal }: { step: typeof a; portal: boolean }) => {
  const anchor = useGuideAnchor(step, { content: Hint, portal });
  return (
    <>
      <button data-rect={rectAttr(RECT)} ref={anchor.ref} type="button">
        {step.id}
      </button>
      {anchor.portal}
    </>
  );
};

describe("StrictMode", () => {
  it("anchors, portals, places and focuses as in production", async () => {
    const { manager } = await createManager({ guides: [tour([a, b])] });
    render(
      <StrictMode>
        <GuideRoot manager={manager}>
          <Local value="inside">
            <Target portal step={a} />
            <Target portal={false} step={b} />
          </Local>
          <GuideFrame>
            {(frame) => (
              <section
                {...frame.floatingProps}
                data-rect={rectAttr(FLOATING)}
                data-testid="frame"
              >
                <frame.Content />
              </section>
            )}
          </GuideFrame>
        </GuideRoot>
      </StrictMode>
    );
    act(() => {
      manager.start("tour");
    });
    await settle();
    const frame = screen.getByTestId("frame");
    expect(frame.textContent).toBe("inside a");
    expect(frame.style.visibility).toBe("");
    expect(document.activeElement).toBe(frame);
    act(() => {
      manager.next("tour");
    });
    await settle();
    expect(runOf(manager, "tour")?.step?.id).toBe("b");
    expect(screen.getByTestId("frame").textContent).toBe("outside b");
    expect(document.activeElement).toBe(screen.getByTestId("frame"));
    expect(warned("")).toBe(false);
  });
});
