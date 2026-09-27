# @ui-registry/guide

Guide users through your UI: steps anchored on elements, ordered into guides that can cross pages, with lifecycle hooks, modal and passive modes, triggers and persistence.

> Status: pre-release. The vanilla entry (core, DOM, placement, spotlight) and the React bindings (`@ui-registry/guide/react`) are complete; the registry items (tour frame, spotlight, hint) are coming. API may change.

## Install

```sh
pnpm add @ui-registry/guide
```

## Usage

```ts
import {
  createGuideManager,
  createGuideStep,
  defineGuide,
  localStorageAdapter,
  onPage,
} from "@ui-registry/guide";

const createGroup = createGuideStep({ id: "groups.create", target: ".group-row" });
const dealer = createGuideStep({ id: "deals.dealer", side: "right" });

const onboarding = defineGuide({
  id: "onboarding",
  version: 1,
  steps: [
    ...onPage("/groups", [createGroup]),
    ...onPage("/deals/new", [
      { step: dealer, beforeEnter: () => editor.openTab("auction") },
    ]),
  ],
});

export const guides = createGuideManager({
  guides: [onboarding],
  storage: localStorageAdapter(), // default; memoryAdapter() for tests
  onEvent: (event) => analytics.track(event.type, event),
});

guides.setRouter({ pathname: location.pathname, navigate: (path) => router.push(path) });
guides.start("onboarding"); // resumes an in-progress record by default
guides.next("onboarding");
guides.end("onboarding", "completed");
```

In a browser, the manager resolves targets in the DOM (registered anchors first, then the step's `target`), waits for them (`MutationObserver`), scrolls modal steps into view (`scroll: { behavior, block, lock }`, `"auto"` respects `prefers-reduced-motion`), tracks them while active (`ResizeObserver`, scroll, resize, `visualViewport`) and starts `visible` guides with an `IntersectionObserver`. Without `window`, nothing resolves and no run becomes active.

The manager exposes a slow state (`getState` / `subscribe`: runs and records) and a fast layout channel (`getLayout` / `subscribeLayout`). In e2e tests or the console, exposing it is enough: `window.__guides = guides`.

## Geometry

The layout channel gives the targets' rects, the placement view (`collisionContainer` or viewport) and the viewport size. Two pure helpers turn it into pixels:

```ts
import { defaultPlacement, spotlightPath } from "@ui-registry/guide";

const layout = guides.getLayout("onboarding");
if (layout) {
  // Veil with one hole per target (padded, merged when overlapping).
  veil.style.clipPath = spotlightPath(layout.rects, 8, layout.viewport);

  // Requested side, then opposite, then perpendiculars; `side` is the effective one.
  const { x, y, side } = defaultPlacement({
    targets: layout.rects,
    floating: { width: card.offsetWidth, height: card.offsetHeight },
    side: "bottom",
    align: "center",
    sideOffset: 16,
    margin: 20,
    view: layout.view,
    // Modal: avoid covering the (padded) spotlights.
    obstacles: layout.rects.map((r) => ({
      x: r.x - 8,
      y: r.y - 8,
      width: r.width + 16,
      height: r.height + 16,
    })),
  });
}
```

## React

`@ui-registry/guide/react` (React 19, optional peer dependency) binds the manager to your tree. Everything is headless: the Frame and the veil are yours.

```tsx
"use client";
import {
  GuideFrame,
  GuideRoot,
  useGuideAnchor,
  useGuideSpotlight,
  type WithGuideContext,
} from "@ui-registry/guide/react";

// Root: provides the manager, pushes the router and its pathname into it.
<GuideRoot manager={guides} router={{ pathname, navigate: (path) => router.push(path) }}>
  {children}
  <Veil />
  <TourFrame />
</GuideRoot>;

// Anchor: the component that owns the target also owns the step's content.
const CreateGroupContent = ({ ctx }: WithGuideContext) => (
  <p id={ctx.ids.title}>Create your first group</p>
);

function CreateGroupButton() {
  const { ref } = useGuideAnchor(createGroup, { content: CreateGroupContent });
  // Or, to see props/closure: { render: (ctx) => <CreateGroupContent ctx={ctx} /> }
  // Or, to inherit local providers: { portal: true, content } and render `{portal}`.
  return <Button ref={ref}>New group</Button>;
}

// Frame: one per active run; position, aria and data attributes in floatingProps.
function TourFrame() {
  return (
    <GuideFrame select={(run) => run.guide.mode === "modal"}>
      {(frame) => (
        <Card {...frame.floatingProps}>
          <frame.Content />
          <footer>
            {frame.index + 1}/{frame.total}
            <button onClick={frame.next}>{frame.isLast ? "Done" : "Next"}</button>
          </footer>
        </Card>
      )}
    </GuideFrame>
  );
}

// Veil: full while the modal run transitions, one hole per target once active.
function Veil() {
  const { active, clipPath } = useGuideSpotlight();
  return active ? <div className="fixed inset-0 bg-black/50" style={{ clipPath }} /> : null;
}
```

`useGuide(selector?)` returns the state (or the selected slice) with `start`, `next`, `prev`, `goTo`, `end` and `resetRecord`; `useGuideRun(guideId)` returns a run or `null`. `useGuideAnchor` also takes `lifecycle` (local hooks) and `enabled`.

`GuideRoot` pushes the router and its pathname in a layout effect, which runs after the layout effects of its children: start guides from events or `useEffect`, not from a child's `useLayoutEffect` on its first commit (a route would find no router yet).

See [ui-registry.com/packages/guide](https://ui-registry.com/packages/guide) for the case study.
