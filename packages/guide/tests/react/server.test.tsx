import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defineGuide } from "../../src/guide.js";
import { createGuideManager } from "../../src/manager.js";
import {
  GuideFrame,
  GuideRoot,
  useGuide,
  useGuideAnchor,
  useGuideSpotlight,
  type WithGuideContext,
} from "../../src/react/index.js";
import { createGuideStep } from "../../src/step.js";
import { memoryAdapter } from "../../src/storage.js";

const a = createGuideStep({ id: "a" });

const Hint = ({ ctx }: WithGuideContext) => <p>{ctx.step.id}</p>;

const Page = () => {
  const { state } = useGuide();
  const { ref, portal } = useGuideAnchor(a, { content: Hint, portal: true });
  const { active } = useGuideSpotlight();
  return (
    <main data-active={active} data-runs={state.runs.length}>
      <button ref={ref} type="button">
        a
      </button>
      {portal}
    </main>
  );
};

describe("server rendering", () => {
  it("renders no run, no Frame and no veil", () => {
    const manager = createGuideManager({
      guides: [defineGuide({ id: "tour", steps: [a] })],
      storage: memoryAdapter(),
    });
    const html = renderToString(
      <GuideRoot manager={manager}>
        <Page />
        <GuideFrame>
          {(frame) => (
            <section {...frame.floatingProps}>
              <frame.Content />
            </section>
          )}
        </GuideFrame>
      </GuideRoot>
    );
    expect(html).toBe(
      '<main data-active="false" data-runs="0"><button type="button">a</button></main>'
    );
    manager.destroy();
  });
});
