# @ui-registry/guide

Guide users through your UI: steps anchored on elements, ordered into guides that can cross pages, with lifecycle hooks, modal and passive modes, triggers and persistence.

> Status: pre-release. The vanilla core is available; the DOM driver, placement, spotlight and React bindings (`@ui-registry/guide/react`) are coming. API may change.

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

The manager exposes a slow state (`getState` / `subscribe`: runs and records) and a fast layout channel (`getLayout` / `subscribeLayout`). In e2e tests or the console, exposing it is enough: `window.__guides = guides`.

See [ui-registry.com/packages/guide](https://ui-registry.com/packages/guide) for the case study.
