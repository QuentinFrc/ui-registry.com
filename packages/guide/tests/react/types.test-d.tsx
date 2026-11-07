import type { ReactNode } from "react";
import { describe, expectTypeOf, it } from "vitest";
import {
  type FrameContext,
  type GuideContext,
  type UseGuideAnchorOptions,
  useGuide,
  useGuideAnchor,
  type WithGuideContext,
} from "../../src/react/index.js";
import { createGuideStep } from "../../src/step.js";
import type { GuideRun, GuideState } from "../../src/types.js";

const step = createGuideStep({ id: "a" });
const Content = ({ ctx }: WithGuideContext) => <p>{ctx.step.id}</p>;
const WithCount = ({ ctx, count }: WithGuideContext<{ count: number }>) => (
  <p>{`${ctx.index} ${count}`}</p>
);
const render = (ctx: GuideContext): ReactNode => ctx.step.id;

describe("WithGuideContext", () => {
  it("adds ctx to the props", () => {
    expectTypeOf<WithGuideContext>().toEqualTypeOf<
      object & { ctx: GuideContext }
    >();
    expectTypeOf<WithGuideContext<{ count: number }>>().toEqualTypeOf<
      { count: number } & { ctx: GuideContext }
    >();
    expectTypeOf<
      WithGuideContext<{ count: number }>["count"]
    >().toEqualTypeOf<number>();
  });
});

describe("useGuideAnchor options", () => {
  it("accepts content, render, or neither", () => {
    useGuideAnchor(step, { content: Content });
    useGuideAnchor(step, { render });
    useGuideAnchor(step, {
      render: (ctx) => <WithCount count={1} ctx={ctx} />,
    });
    useGuideAnchor(step, { portal: true, content: Content, enabled: false });
    useGuideAnchor(step, { lifecycle: { beforeEnter: () => undefined } });
    useGuideAnchor(step);
  });

  it("makes content and render mutually exclusive", () => {
    // @ts-expect-error content and render are exclusive
    useGuideAnchor(step, { content: Content, render });
    const both = { content: Content, render };
    // @ts-expect-error content and render are exclusive
    const options: UseGuideAnchorOptions = both;
    expectTypeOf(options).not.toBeAny();
  });

  it("requires a content component taking only ctx", () => {
    // @ts-expect-error `count` is not provided by the lib: use render
    useGuideAnchor(step, { content: WithCount });
    // @ts-expect-error render returns a node
    useGuideAnchor(step, { render: (ctx: GuideContext) => ({ ctx }) });
  });

  it("returns a callback ref and a portal node", () => {
    const anchor = useGuideAnchor(step, { content: Content });
    expectTypeOf(anchor.portal).toEqualTypeOf<ReactNode>();
    expectTypeOf(anchor.ref).parameter(0).toEqualTypeOf<Element | null>();
  });
});

describe("useGuide", () => {
  it("types the state from the selector", () => {
    expectTypeOf(useGuide().state).toEqualTypeOf<GuideState>();
    expectTypeOf(
      useGuide((state) => state.runs.length).state
    ).toEqualTypeOf<number>();
    expectTypeOf(useGuide().start).returns.toEqualTypeOf<boolean>();
  });
});

describe("FrameContext", () => {
  it("extends the guide context", () => {
    expectTypeOf<FrameContext>().toExtend<GuideContext>();
    expectTypeOf<FrameContext["run"]>().toEqualTypeOf<GuideRun>();
    expectTypeOf<
      FrameContext["floatingProps"]["role"]
    >().toEqualTypeOf<"dialog">();
    expectTypeOf<
      FrameContext["floatingProps"]["tabIndex"]
    >().toEqualTypeOf<-1>();
  });
});
