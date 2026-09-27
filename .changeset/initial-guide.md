---
"@ui-registry/guide": minor
---

Initial release: `createGuideStep`, `defineGuide`, `onPage` and `createGuideManager` (multi-run state, modal and passive modes, `manual` and `visible` triggers, cross-page transitions with two-level lifecycle hooks, missing targets, errors, dismissible, records with `localStorageAdapter` / `memoryAdapter`, events, keyboard), DOM resolution and tracking, `defaultPlacement` and `spotlightPath`, and the headless React bindings in `@ui-registry/guide/react` (`GuideRoot`, `useGuide`, `useGuideRun`, `useGuideAnchor`, `GuideFrame`, `useGuideSpotlight`). `end(id, "dismissed")` without a run records the guide as dismissed.
