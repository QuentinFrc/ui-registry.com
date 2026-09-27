# @ui-registry/guide

Guide users through your UI: steps anchored on elements, ordered into guides that can cross pages, with lifecycle hooks, modal and passive modes, triggers and persistence.

> Status: pre-release. The vanilla entry is complete (core, DOM, placement, spotlight); the React bindings (`@ui-registry/guide/react`) are coming. API may change.

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

See [ui-registry.com/packages/guide](https://ui-registry.com/packages/guide) for the case study.
